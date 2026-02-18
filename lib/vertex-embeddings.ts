/**
 * Vertex AI Embeddings — text-multilingual-embedding-002 (FREE TIER)
 * 768 dimensions, 250 req/min, multilingue (français OK).
 * Authentification via ADC (Application Default Credentials) sur Cloud Run.
 * 
 * Usage local : `gcloud auth application-default login` avant de lancer.
 */

const EMBEDDING_MODEL = 'text-multilingual-embedding-002'
const EMBEDDING_DIMENSION = 768

interface EmbeddingResponse {
    predictions: {
        embeddings: {
            values: number[]
        }
    }[]
}

/**
 * Récupère un access token via Application Default Credentials (ADC).
 * Sur Cloud Run, le metadata server fournit automatiquement le token.
 * En local, utilise `gcloud auth application-default login`.
 */
async function getAccessToken(): Promise<string> {
    // 1. Try Cloud Run metadata server (production)
    try {
        const metadataUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token'
        const res = await fetch(metadataUrl, {
            headers: { 'Metadata-Flavor': 'Google' },
            signal: AbortSignal.timeout(2000),
        })
        if (res.ok) {
            const data = await res.json()
            return data.access_token
        }
    } catch {
        // Not on GCP, try local ADC
    }

    // 2. Try local ADC via gcloud
    const { execSync } = await import('child_process')
    try {
        const token = execSync('gcloud auth application-default print-access-token', {
            encoding: 'utf-8',
            timeout: 5000,
        }).trim()
        return token
    } catch (e) {
        throw new Error(
            'Vertex AI Embeddings: impossible d\'obtenir un token. ' +
            'Sur GCP → ADC automatique. En local → `gcloud auth application-default login`'
        )
    }
}

/**
 * Génère un embedding via Vertex AI text-multilingual-embedding-002.
 * @param text - Texte à vectoriser
 * @returns number[] de dimension 768
 */
export async function vertexEmbedding(text: string): Promise<number[]> {
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT
    const location = process.env.VERTEX_AI_LOCATION || 'europe-west1'

    if (!project) {
        throw new Error('Vertex AI Embeddings: GOOGLE_CLOUD_PROJECT ou GCP_PROJECT requis')
    }

    const token = await getAccessToken()
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${EMBEDDING_MODEL}:predict`

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instances: [{ content: text }],
        }),
    })

    if (!response.ok) {
        const errBody = await response.text()
        throw new Error(`Vertex AI Embeddings error (${response.status}): ${errBody}`)
    }

    const data = (await response.json()) as EmbeddingResponse
    const values = data.predictions?.[0]?.embeddings?.values

    if (!values || values.length !== EMBEDDING_DIMENSION) {
        throw new Error(`Vertex AI Embeddings: dimension inattendue (${values?.length} vs ${EMBEDDING_DIMENSION})`)
    }

    return values
}

/**
 * Génère des embeddings en batch (max 250 instances par requête).
 */
export async function vertexEmbeddingBatch(texts: string[]): Promise<number[][]> {
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT
    const location = process.env.VERTEX_AI_LOCATION || 'europe-west1'

    if (!project) {
        throw new Error('Vertex AI Embeddings: GOOGLE_CLOUD_PROJECT ou GCP_PROJECT requis')
    }

    const token = await getAccessToken()
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${EMBEDDING_MODEL}:predict`

    // Batch par groupes de 50 pour éviter les timeouts
    const BATCH_SIZE = 50
    const allEmbeddings: number[][] = []

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instances: batch.map(text => ({ content: text })),
            }),
        })

        if (!response.ok) {
            const errBody = await response.text()
            throw new Error(`Vertex AI Embeddings batch error (${response.status}): ${errBody}`)
        }

        const data = (await response.json()) as EmbeddingResponse
        const embeddings = data.predictions.map(p => p.embeddings.values)
        allEmbeddings.push(...embeddings)
    }

    return allEmbeddings
}
