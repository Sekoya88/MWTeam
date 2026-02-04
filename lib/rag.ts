/**
 * RAG : retrieval (k-NN) + indexation + query avec LLM et citations.
 * Table rag_documents (pgvector). Embeddings via Vertex AI text-multilingual-embedding-002.
 */

import { prisma } from './prisma'
import { getEmbedding, RAG_EMBEDDING_DIM } from './embeddings'
import { generateCompletion } from './llm-provider'

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 80
const DEFAULT_TOP_K = 5

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

/**
 * Découpe un texte en chunks avec recouvrement.
 */
function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + size, text.length)
    chunks.push(text.slice(start, end).trim())
    if (end >= text.length) break
    start = end - overlap
  }
  return chunks.filter(c => c.length > 0)
}

/**
 * Formate un vecteur pour PostgreSQL (pgvector).
 */
function vectorToPg(v: number[]): string {
  return '[' + v.join(',') + ']'
}

/**
 * Récupère les k chunks les plus pertinents pour une question.
 */
export async function retrieve(
  query: string,
  k: number = DEFAULT_TOP_K
): Promise<Array<{ id: string; titre: string; contenu: string; source_type: string; metadata: unknown; similarity: number }>> {
  const embedding = await getEmbedding(query)
  const vectorStr = vectorToPg(embedding)

  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; titre: string; contenu: string; source_type: string; metadata: unknown; similarity: number }>
  >(
    `SELECT id, titre, contenu, source_type, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM rag_documents
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    vectorStr,
    k
  )
  return rows ?? []
}

/**
 * Indexe un document : découpe en chunks, calcule les embeddings, insère dans rag_documents.
 */
export async function indexDocument(
  idPrefix: string,
  titre: string,
  contenu: string,
  sourceType: string,
  metadata?: Record<string, unknown>
): Promise<number> {
  const chunks = chunkText(contenu)
  const metadataJson = metadata ? JSON.stringify(metadata) : null
  let inserted = 0
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = `${idPrefix}_chunk_${i}`
    const embedding = await getEmbedding(chunks[i])
    const vectorStr = vectorToPg(embedding)
    await prisma.$executeRawUnsafe(
      `INSERT INTO rag_documents (id, titre, contenu, embedding, source_type, metadata)
       VALUES ($1, $2, $3, $4::vector, $5, $6::jsonb)
       ON CONFLICT (id) DO UPDATE SET contenu = EXCLUDED.contenu, embedding = EXCLUDED.embedding, metadata = EXCLUDED.metadata`,
      chunkId,
      titre,
      chunks[i],
      vectorStr,
      sourceType,
      metadataJson
    )
    inserted++
  }
  return inserted
}

/**
 * Supprime tous les chunks d’un document (même préfixe id).
 */
export async function deleteDocumentByIdPrefix(idPrefix: string): Promise<number> {
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM rag_documents WHERE id LIKE $1`,
    idPrefix + '%'
  )
  return Number(result)
}

/**
 * Requête RAG : retrieval + contexte injecté dans le prompt LLM + réponse avec sources.
 */
export async function queryWithRag(question: string): Promise<RagQueryResult> {
  const chunks = await retrieve(question, DEFAULT_TOP_K)
  const context =
    chunks.length > 0
      ? chunks
          .map(
            (c, i) =>
              `[Source ${i + 1}: ${c.titre} (${c.source_type})]\n${c.contenu}`
          )
          .join('\n\n---\n\n')
      : 'Aucun document pertinent trouvé dans la base.'

  const systemPrompt = `Tu es un assistant expert en coaching d'athlétisme (demi-fond, middle distance).
Base-toi UNIQUEMENT sur le CONTEXTE fourni ci-dessous pour répondre.
Pour chaque information ou recommandation, cite la source entre crochets, ex: [Source 1: ...] ou [Source 2: ...].
Si l'information n'est pas dans le contexte, dis clairement que tu ne la trouves pas dans les documents disponibles et ne invente pas.
Réponds en français, de façon claire et concise.`

  const userPrompt = `CONTEXTE (documents indexés):\n\n${context}\n\n---\n\nQuestion: ${question}`

  const answer = await generateCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 1500 }
  )

  const sources: RagSource[] = chunks.map(c => ({
    id: c.id,
    titre: c.titre,
    source_type: c.source_type,
    similarity: c.similarity,
  }))

  return { answer, sources }
}

export { RAG_EMBEDDING_DIM }
