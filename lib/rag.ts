import { HfInference } from '@huggingface/inference'
import { prisma } from '@/lib/prisma'
import { generateCompletion } from './llm-provider'
import { vertexEmbedding } from './vertex-embeddings'

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY
const RAG_EMBEDDING_MODEL = 'sentence-transformers/all-mpnet-base-v2' // Dimension 768
const EMBEDDING_PROVIDER = (process.env.EMBEDDING_PROVIDER || 'huggingface').toLowerCase()

if (EMBEDDING_PROVIDER === 'huggingface' && !HUGGINGFACE_API_KEY) {
  console.warn('HUGGINGFACE_API_KEY not set and EMBEDDING_PROVIDER=huggingface. RAG may not work.')
}

const hf = HUGGINGFACE_API_KEY ? new HfInference(HUGGINGFACE_API_KEY) : null

export interface RagSource {
  id: string
  titre: string
  source_type: string
  similarity?: number
}

export interface RagQueryResult {
  answer: string
  sources: RagSource[]
}

export interface RagSearchOptions {
  limit?: number
  discipline?: string
  theme?: string
  niveau?: string
  cycle?: string
}

/**
 * Génère un embedding via le provider configuré (vertex ou huggingface).
 * Les deux produisent des vecteurs 768 dimensions → compatibles pgvector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (EMBEDDING_PROVIDER === 'vertex') {
    return vertexEmbedding(text)
  }

  // Fallback HuggingFace
  if (!hf) {
    throw new Error('HuggingFace client not initialized (missing API key)')
  }
  try {
    const output = await hf.featureExtraction({
      model: RAG_EMBEDDING_MODEL,
      inputs: text,
    })
    return output as number[]
  } catch (error) {
    console.error('Error generating embedding (HF):', error)
    throw error
  }
}

/**
 * Recherche de contexte RAG avec filtrage optionnel par métadonnées DMFD.
 */
export async function searchContext(
  query: string,
  limitOrOptions: number | RagSearchOptions = 3
): Promise<string> {
  try {
    const options: RagSearchOptions = typeof limitOrOptions === 'number'
      ? { limit: limitOrOptions }
      : limitOrOptions
    const limit = options.limit || 3

    const embedding = await generateEmbedding(query)
    const vectorQuery = '[' + embedding.join(',') + ']'

    // Build WHERE clause with metadata filters
    const conditions: string[] = []
    const params: unknown[] = [vectorQuery]
    let paramIndex = 2

    if (options.discipline) {
      conditions.push(`metadata->>'discipline' = $${paramIndex}`)
      params.push(options.discipline)
      paramIndex++
    }
    if (options.theme) {
      conditions.push(`metadata->>'theme' = $${paramIndex}`)
      params.push(options.theme)
      paramIndex++
    }
    if (options.niveau) {
      conditions.push(`metadata->>'niveau' = $${paramIndex}`)
      params.push(options.niveau)
      paramIndex++
    }
    if (options.cycle) {
      conditions.push(`metadata->>'cycle' = $${paramIndex}`)
      params.push(options.cycle)
      paramIndex++
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : ''

    params.push(limit)

    const sql = `SELECT id, contenu, titre, 1 - (embedding <=> $1::vector) as similarity FROM rag_documents ${whereClause} ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`

    const results = await prisma.$queryRawUnsafe(
      sql,
      ...params
    ) as Array<{ id: string; contenu: string; titre: string; similarity: number }>

    return results.map(r => '[Source: ' + r.titre + ']\n' + r.contenu).join('\n\n')
  } catch (error) {
    console.error('Error searching RAG context:', error)
    return ''
  }
}

export async function deleteDocumentByIdPrefix(idPrefix: string): Promise<number> {
  const result = await prisma.$executeRawUnsafe(
    'DELETE FROM rag_documents WHERE id LIKE $1',
    idPrefix + '%'
  )
  return Number(result)
}

export async function indexDocument(
  idPrefix: string,
  titre: string,
  contenu: string,
  sourceType: string,
  metadata?: Record<string, unknown>
): Promise<number> {
  const CHUNK_SIZE = 500
  const chunks = []
  for (let i = 0; i < contenu.length; i += CHUNK_SIZE) {
    chunks.push(contenu.substring(i, Math.min(i + CHUNK_SIZE, contenu.length)))
  }

  let inserted = 0
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = idPrefix + '_chunk_' + i
    const embedding = await generateEmbedding(chunks[i])
    const vectorStr = '[' + embedding.join(',') + ']'

    await prisma.$executeRawUnsafe(
      "INSERT INTO rag_documents (id, titre, contenu, embedding, source_type, metadata) VALUES ($1, $2, $3, $4::vector, $5, $6::jsonb) ON CONFLICT (id) DO UPDATE SET contenu = EXCLUDED.contenu, embedding = EXCLUDED.embedding, metadata = EXCLUDED.metadata",
      chunkId,
      titre,
      chunks[i],
      vectorStr,
      sourceType,
      JSON.stringify(metadata || {})
    )
    inserted++
  }
  return inserted
}

export async function queryWithRag(question: string): Promise<RagQueryResult> {
  const context = await searchContext(question, 5)
  if (!context) {
    return {
      answer: "Je n'ai pas trouvé d'informations spécifiques dans ma base de connaissances pour répondre à cette question.",
      sources: []
    }
  }

  const prompt = 'Utilise les informations suivantes pour répondre à la question. Si les informations ne permettent pas de répondre, dis-le.\n\nINFORMATIONS DE CONTEXTE:\n' + context + '\n\nQUESTION:\n' + question + '\n\nRÉPONSE:'

  const answer = await generateCompletion([
    { role: 'system', content: "Tu es un assistant expert en coaching d'athlétisme." },
    { role: 'user', content: prompt }
  ])

  return {
    answer,
    sources: []
  }
}
