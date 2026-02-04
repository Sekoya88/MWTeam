import { LLMMessage, LLMOptions } from './llm-provider'

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY
// Utilisation de Mistral-Nemo (12B) qui est excellent et très rapide, ou Llama-3-8B-Instruct
const DEFAULT_MODEL = 'mistralai/Mistral-Nemo-Instruct-2407'
const API_URL = 'https://api-inference.huggingface.co/models/'

export async function huggingfaceCompletion(
    messages: LLMMessage[],
    options: LLMOptions = {}
): Promise<string> {
    if (!HUGGINGFACE_API_KEY) {
        throw new Error('HuggingFace: HUGGINGFACE_API_KEY is not set')
    }

    const model = options.model || DEFAULT_MODEL
    const url = `${API_URL}${model}`

    // Conversion des messages en prompt formaté pour Mistral/Llama
    // HF Inference API sur ces modèles attend souvent un format de template ou gère le format chat si le modèle le supporte via l'endpoint v1/chat/completions qui est plus standard
    // Mais l'endpoint standard HF inference est souvent du raw text generation.
    // HEUREUSEMENT, beaucoup de modèles récents supportent l'API chat/completions aussi sur HF.
    // Testons l'approche compatibilité OpenAI de HF (v1/chat/completions)
    // URL: https://api-inference.huggingface.co/models/mistralai/Mistral-Nemo-Instruct-2407/v1/chat/completions

    // Si on utilise l'endpoint standard de génération, on doit formater le prompt.
    // Pour Mistral Instruct : <s>[INST] Instruction [/INST] Model answer</s>

    // Essayons l'API Chat Completion de HF (plus robuste)
    const chatUrl = `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`

    try {
        const body = {
            model: model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4000,
            stream: false
        }

        const res = await fetch(chatUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            },
            body: JSON.stringify(body),
        })

        if (!res.ok) {
            const errText = await res.text()
            try {
                const errJson = JSON.parse(errText)
                throw new Error(`HuggingFace API ${res.status}: ${errJson.error || errText}`)
            } catch (e) {
                throw new Error(`HuggingFace API ${res.status}: ${errText}`)
            }
        }

        const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
        const text = data.choices?.[0]?.message?.content

        if (!text) throw new Error('HuggingFace: empty response')
        return text

    } catch (error: any) {
        console.error('HuggingFace API Error:', error)
        // Fallback: si l'API chat échoue et qu'on reçoit une 404 (endpoint pas supporté), 
        // on pourrait tenter l'endpoint raw text generation, mais c'est complexe de formatter le prompt.
        // On va assumer que le modèle choisi supporte l'API chat (Mistral-Nemo et Llama-3 le font).
        throw new Error(`HuggingFace API Error: ${error.message || error}`)
    }
}
