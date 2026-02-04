import { LLMMessage, LLMOptions } from './llm-provider'

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY
// Utilisation de Qwen 2.5 7B Instruct (Alibaba) : Meilleur petit modèle actuel, Open Source, Non-restreint (pas de validation licence)
const DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct'
// Nouvelle URL requise par Hugging Face (l'ancienne api-inference est dépréciée)
const API_URL = 'https://router.huggingface.co/models/'

export async function huggingfaceCompletion(
    messages: LLMMessage[],
    options: LLMOptions = {}
): Promise<string> {
    if (!HUGGINGFACE_API_KEY) {
        throw new Error('HuggingFace: HUGGINGFACE_API_KEY is not set')
    }

    const model = options.model || DEFAULT_MODEL

    // Utilisation de l'API standard d'inférence (plus universelle que chat/completions sur le router)
    const url = `${API_URL}${model}`

    // Formatage du prompt pour Qwen / ChatML
    // <|im_start|>system ... <|im_end|>
    // <|im_start|>user ... <|im_end|>
    // <|im_start|>assistant

    let fullPrompt = ''

    for (const msg of messages) {
        if (msg.role === 'system') {
            fullPrompt += `<|im_start|>system\n${msg.content}<|im_end|>\n`
        } else if (msg.role === 'user') {
            fullPrompt += `<|im_start|>user\n${msg.content}<|im_end|>\n`
        } else if (msg.role === 'assistant') {
            fullPrompt += `<|im_start|>assistant\n${msg.content}<|im_end|>\n`
        }
    }

    // Amorce de la réponse
    fullPrompt += `<|im_start|>assistant\n`

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            },
            body: JSON.stringify({
                inputs: fullPrompt,
                parameters: {
                    temperature: options.temperature ?? 0.7,
                    max_new_tokens: options.maxTokens ?? 4000,
                    return_full_text: false // On veut juste la génération
                }
            }),
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

        const data = await res.json() as Array<{ generated_text: string }> | { generated_text: string }

        // L'API standard renvoie parfois un array, parfois un objet
        let text = ''
        if (Array.isArray(data)) {
            text = data[0]?.generated_text
        } else if (data && typeof data === 'object' && 'generated_text' in data) {
            text = (data as { generated_text: string }).generated_text
        }

        if (!text) throw new Error('HuggingFace: empty response')
        return text.trim()

    } catch (error: any) {
        console.error('HuggingFace API Error:', error)
        throw new Error(`HuggingFace API Error: ${error.message || error}`)
    }
}
