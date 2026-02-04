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

        // Utilisation de gemini-2.0-flash (Dernière version stable disponible)
        const modelName = options.model || 'gemini-2.0-flash'
        const model = genAI.getGenerativeModel({ model: modelName })

        // Conversion des messages pour l'API Gemini
        // Gemini s'attend à un historique de chat
        let prompt = ''
        let systemInstruction = ''

        // Simple concaténation pour l'instant ou gestion plus fine
        // On extrait le system prompt s'il existe
        const systemMsg = messages.find(m => m.role === 'system')
        if (systemMsg) {
            systemInstruction = systemMsg.content
            // Note: l'API a une conf systemInstruction, mais on peut aussi l'ajouter au début
        }

        // On construit l'historique
        // Pour une requête simple, on peut tout mettre dans le prompt si on n'utilise pas startChat
        // Mais startChat est mieux pour le multitour. Ici on fait du stateless souvent.

        // Approche simplifiée : on concatène tout pour le generateContent si c'est du one-shot
        // ou on utilise startChat si on veut respecter les rôles.

        // Pour le cas d'usage "Génération de séance", c'est souvent un gros prompt user.

        const chat = model.startChat({
            history: messages
                .filter(m => m.role !== 'system') // Le système est géré à part ou ignoré si modèle ne supporte pas
                .slice(0, -1) // Tout sauf le dernier message
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

    } catch (error: any) {
        console.error('Gemini API Error:', error)
        throw new Error(`Gemini API Error: ${error.message || error}`)
    }
}
