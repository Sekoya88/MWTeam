import { GoogleGenerativeAI } from '@google/generative-ai'
import { LLMMessage, LLMOptions } from './llm-provider'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function geminiCompletion(
    messages: LLMMessage[],
    options: LLMOptions = {}
): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini: GEMINI_API_KEY is not set')
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

        // Tenter avec le modèle demandé (2.0 par défaut)
        let modelName = options.model || 'gemini-2.0-flash'

        try {
            return await generateWithModel(genAI, modelName, messages)
        } catch (error: any) {
            console.warn(`Gemini: Failed with model ${modelName}, trying fallback to gemini-1.5-flash. Error: ${error.message}`)

            // Fallback sur 1.5 flash si le 2.0 plante (404, instabilité...)
            if (modelName !== 'gemini-1.5-flash') {
                return await generateWithModel(genAI, 'gemini-1.5-flash', messages)
            }
            throw error
        }
    } catch (error: any) {
        console.error('Gemini API Error:', error)
        throw new Error(`Gemini API Error: ${error.message || error}`)
    }
}

async function generateWithModel(genAI: GoogleGenerativeAI, modelName: string, messages: LLMMessage[]): Promise<string> {
    const model = genAI.getGenerativeModel({ model: modelName })

    const systemMsg = messages.find(m => m.role === 'system')
    const systemInstruction = systemMsg ? systemMsg.content : undefined

    const chat = model.startChat({
        history: messages
            .filter(m => m.role !== 'system')
            .slice(0, -1)
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            })),
        systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
    })

    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    const response = await result.response
    const text = response.text()

    if (!text) throw new Error('Gemini: empty response')
    return text
}
