/**
 * Vertex AI (GCP) — Gemini par défaut (crédits gratuits GCP), optionnellement GLM/Llama.
 * LLM_PROVIDER=vertex → utilise ce client avec VERTEX_AI_MODEL (défaut: gemini-1.5-flash).
 */

export interface VertexOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

/** Modèle par défaut : Gemini 1.5 Flash, compatible crédits gratuits GCP, pas d'activation. */
const DEFAULT_MODEL = 'gemini-1.5-flash'
const DEFAULT_MAX_TOKENS = 4096

const GLM_PUBLISHER = 'zai-org'
const GLM_MODEL_ID = 'glm-4.7-maas'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

function resolveModelId(shortId: string, project: string, location: string): string {
  if (shortId.startsWith('projects/')) return shortId
  const normalized = shortId.toLowerCase()
  if (normalized === 'glm-4.7' || normalized === 'glm-4.7-maas') {
    return `projects/${project}/locations/${location}/publishers/${GLM_PUBLISHER}/models/${GLM_MODEL_ID}`
  }
  return shortId
}

/**
 * Génère une réponse via Vertex AI (GLM-4.7, Gemini, Llama, etc.).
 * Utilise les Application Default Credentials (ADC) sur GCP (Cloud Run).
 */
export async function vertexCompletion(
  messages: ChatMessage[],
  options: VertexOptions = {}
): Promise<string> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT
  const location = process.env.VERTEX_AI_LOCATION || 'europe-west1'
  if (!project) {
    throw new Error('Vertex AI: GOOGLE_CLOUD_PROJECT or GCP_PROJECT must be set')
  }

  const rawModel =
    options.model ?? process.env.VERTEX_AI_MODEL ?? DEFAULT_MODEL
  const modelId = resolveModelId(rawModel, project, location)

  const { VertexAI } = await import('@google-cloud/vertexai')
  const vertex = new VertexAI({ project, location })
  const model = vertex.getGenerativeModel({
    model: modelId,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    },
  })

  // Vertex attend contents: [{ role: 'user', parts: [{ text }] }, ...]
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const systemInstruction = messages.find(m => m.role === 'system')?.content

  const payload = {
    contents,
    ...(systemInstruction && { systemInstruction }),
  }

  const result = await model.generateContent(payload)
  const text =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text ??
    result.response.candidates?.[0]?.content?.parts?.map(p => ('text' in p ? p.text : '')).join('') ??
    ''

  if (!text) {
    throw new Error('Vertex AI: empty response')
  }
  return text
}
