/**
 * Abstraction fournisseur LLM : Vertex AI (GCP) ou Mistral.
 * En prod POC : LLM_PROVIDER=vertex + crédits GCP.
 * En dev / fallback : LLM_PROVIDER=mistral (ou non défini) + MISTRAL_API_KEY.
 */

import { vertexCompletion } from './vertex'
import { geminiCompletion } from './gemini'
import { huggingfaceCompletion } from './huggingface'
import { ollamaCompletion } from './ollama'

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

/**
 * Génère une réponse via le fournisseur configuré (HuggingFace, Gemini, Vertex).
 */
export async function generateCompletion(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  // Par défaut, on utilise Hugging Face car plus fiable/gratuit sans config cloud complexe
  const provider = (process.env.LLM_PROVIDER || 'huggingface').toLowerCase()

  if (provider === 'vertex') {
    return vertexCompletion(messages, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })
  }

  if (provider === 'gemini') {
    return geminiCompletion(messages, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })
  }

  if (provider === 'ollama') {
    return ollamaCompletion(messages, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })
  }

  if (provider === 'huggingface') {
    return huggingfaceCompletion(messages, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })
  }

  // Fallback si provider inconnu ou ancien 'mistral'
  return huggingfaceCompletion(messages, options)
}
