/**
 * Abstraction fournisseur LLM : Vertex AI (GCP) ou Mistral.
 * En prod POC : LLM_PROVIDER=vertex + crédits GCP.
 * En dev / fallback : LLM_PROVIDER=mistral (ou non défini) + MISTRAL_API_KEY.
 */

import { vertexCompletion } from './vertex'

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

async function mistralCompletion(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
  if (!MISTRAL_API_KEY) {
    throw new Error('Mistral: MISTRAL_API_KEY is not set')
  }
  const body = {
    model: options.model || 'mistral-medium-latest',
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4000,
  }
  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Mistral API ${res.status}: ${(err as { message?: string }).message || res.statusText}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Mistral: empty response')
  return text
}

/**
 * Génère une réponse via le fournisseur configuré (Vertex ou Mistral).
 */
export async function generateCompletion(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const provider = (process.env.LLM_PROVIDER || 'mistral').toLowerCase()
  if (provider === 'vertex') {
    return vertexCompletion(messages, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })
  }
  return mistralCompletion(messages, options)
}
