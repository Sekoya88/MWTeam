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

/**
 * Recherche RAG avec retour des sources détaillées (id, titre, similarity).
 */
export async function searchContextWithSources(
  query: string,
  limitOrOptions: number | RagSearchOptions = 5
): Promise<{ context: string; sources: RagSource[] }> {
  try {
    const options: RagSearchOptions = typeof limitOrOptions === 'number'
      ? { limit: limitOrOptions }
      : limitOrOptions
    const limit = options.limit || 5

    const embedding = await generateEmbedding(query)
    const vectorQuery = '[' + embedding.join(',') + ']'

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

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
    params.push(limit)

    const sql = `SELECT id, contenu, titre, source_type, 1 - (embedding <=> $1::vector) as similarity FROM rag_documents ${whereClause} ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`

    const results = await prisma.$queryRawUnsafe(
      sql,
      ...params
    ) as Array<{ id: string; contenu: string; titre: string; source_type: string; similarity: number }>

    const context = results.map(r => '[Source: ' + r.titre + ' (' + r.id.split('_chunk_')[0] + ')]\n' + r.contenu).join('\n\n')
    const sources: RagSource[] = results.map(r => ({
      id: r.id.split('_chunk_')[0],
      titre: r.titre,
      source_type: r.source_type,
      similarity: Number(r.similarity),
    }))

    // Deduplicate sources by id
    const seen = new Set<string>()
    const uniqueSources = sources.filter(s => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })

    return { context, sources: uniqueSources }
  } catch (error) {
    console.error('Error searching RAG context with sources:', error)
    return { context: '', sources: [] }
  }
}

/**
 * System prompt expert demi-fond (DMFD_020).
 * Injecté dans chaque requête RAG pour cadrer le comportement du LLM.
 */
const DMFD_SYSTEM_PROMPT = `Tu es un assistant expert en planification de l'entraînement en demi-fond (800m, 1500m, 3000m, steeple).
Tu as accès à une base de connaissances spécialisée. Tu réponds UNIQUEMENT en te basant sur les chunks de contexte fournis. Si le contexte ne contient pas l'information, dis-le clairement.

RÈGLES ABSOLUES :
1. Cite toujours tes sources : [CHUNK DMFD_XXX] après chaque affirmation.
2. Calcule les allures précisément : donne TOUJOURS km/h ET min/km.
3. Adapte la réponse au niveau de l'athlète (si fourni dans le contexte athlète).
4. Signale les contre-indications (blessures, catégorie d'âge) si elles existent.
5. Termine par un score de confiance : [Confiance : XX% — sources : N chunks]
6. En cas de doute ou d'informations insuffisantes, propose 2-3 questions de clarification.

FORMAT DE RÉPONSE :
- Réponse principale (concise, factuelle, avec calculs si applicable)
- Sources utilisées : liste des chunk_ids
- Points d'attention / contre-indications
- Score de confiance global`

export async function queryWithRag(question: string): Promise<RagQueryResult> {
  const { context, sources } = await searchContextWithSources(question, 5)
  if (!context) {
    return {
      answer: "Je n'ai pas trouvé d'informations spécifiques dans ma base de connaissances pour répondre à cette question. Essayez de reformuler votre question ou d'être plus spécifique sur la distance, le niveau ou la phase d'entraînement.",
      sources: []
    }
  }

  const prompt = `CONTEXTE RAG (base de connaissances demi-fond) :\n${context}\n\nQUESTION DE L'ENTRAÎNEUR :\n${question}\n\nRÉPONSE :`

  const answer = await generateCompletion([
    { role: 'system', content: DMFD_SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ])

  return {
    answer,
    sources,
  }
}

