/**
 * Vertex AI — Text Embeddings (text-multilingual-embedding-002)
 * 768 dimensions, multilingue. Utilisé pour le RAG.
 */

const EMBEDDING_MODEL = 'text-multilingual-embedding-002'
const EMBEDDING_DIM = 768

function getVertexConfig() {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT
  const location = process.env.VERTEX_AI_LOCATION || 'europe-west1'
  if (!project) throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT must be set')
  return { project, location }
}

/**
 * Retourne un vecteur d'embedding (768 dimensions) pour un texte.
 * Utilise Vertex AI text-multilingual-embedding-002.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const { project, location } = getVertexConfig()
  const { GoogleAuth } = await import('google-auth-library')
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  if (!token.token) throw new Error('Failed to get Vertex AI access token')

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${EMBEDDING_MODEL}:predict`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.token}`,
    },
    body: JSON.stringify({
      instances: [{ content: text.slice(0, 8000) }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Vertex AI Embeddings: ${res.status} ${err}`)
  }

  const data = (await res.json()) as { predictions?: Array<{ embeddings?: { values?: number[] } }> }
  const values = data.predictions?.[0]?.embeddings?.values
  if (!values || values.length !== EMBEDDING_DIM) {
    throw new Error(`Vertex AI Embeddings: invalid response (expected ${EMBEDDING_DIM} dims)`)
  }
  return values
}

export const RAG_EMBEDDING_DIM = EMBEDDING_DIM
