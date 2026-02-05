
import { LLMMessage, LLMOptions } from './llm-provider'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

export async function ollamaCompletion(
    messages: LLMMessage[],
    options: LLMOptions = {}
): Promise<string> {
    const model = options.model || 'mistral'

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: false, // Force non-streaming for now to simplify
                options: {
                    temperature: options.temperature,
                    num_predict: options.maxTokens,
                }
            }),
        })

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`)
        }

        const data = await response.json()
        return data.message?.content || ''
    } catch (error) {
        console.error('Error calling Ollama:', error)
        throw error
    }
}
