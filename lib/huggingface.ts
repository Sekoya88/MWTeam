import { LLMMessage, LLMOptions } from './llm-provider'

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY
// Utilisation de Qwen 2.5 7B Instruct (Alibaba) : Meilleur petit modèle actuel, Open Source, Non-restreint (pas de validation licence)
const DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct'

import { HfInference } from '@huggingface/inference'

export async function huggingfaceCompletion(
    messages: LLMMessage[],
    options: LLMOptions = {}
): Promise<string> {
    if (!HUGGINGFACE_API_KEY) {
        throw new Error('HuggingFace: HUGGINGFACE_API_KEY is not set')
    }

    const model = options.model || DEFAULT_MODEL
    const hf = new HfInference(HUGGINGFACE_API_KEY)

    try {
        // Utilisation de la méthode chatCompletion du SDK qui gère le router automatiquement
        const response = await hf.chatCompletion({
            model: model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4000,
        })

        const text = response.choices[0]?.message?.content

        if (!text) throw new Error('HuggingFace: empty response')
        return text.trim()

    } catch (error: any) {
        console.error('HuggingFace API Error:', error)
        // Si l'erreur est liée au modèle non supporté en Chat, on pourrait fallback sur textGeneration
        // Mais Qwen 2.5 7B Instruct supporte le ChatML généralement.
        // Ajoutons plus de détails à l'erreur pour le debug
        throw new Error(`HuggingFace API Error: ${error.message || error}`)
    }
}
