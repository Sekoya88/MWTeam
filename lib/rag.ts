import { HfInference } from '@huggingface/inference'
import { prisma } from '@/lib/prisma'
import { generateCompletion } from './llm-provider'

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY
const RAG_EMBEDDING_MODEL = 'sentence-transformers/all-mpnet-base-v2' // Dimension 768

if (!HUGGINGFACE_API_KEY) {
  console.warn('HUGGINGFACE_API_KEY not set, RAG will not function properly.')
}

const hf = new HfInference(HUGGINGFACE_API_KEY)

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

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const output = await hf.featureExtraction({
      model: RAG_EMBEDDING_MODEL,
      inputs: text,
    })
    return output as number[]
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

export async function searchContext(query: string, limit: number = 3): Promise<string> {
  try {
    const embedding = await generateEmbedding(query)
    const vectorQuery = '[' + embedding.join(',') + ']'

    const results = await prisma.$queryRawUnsafe(
      'SELECT id, contenu, titre, 1 - (embedding <=> $1::vector) as similarity FROM rag_documents ORDER BY embedding <=> $1::vector LIMIT $2',
      vectorQuery,
      limit
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
