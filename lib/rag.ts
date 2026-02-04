
import { HfInference } from '@huggingface/inference'
import { prisma } from '@/lib/prisma'

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY
// Modèle d'embedding léger et performant, souvent dispo sur l'API Inference gratuite
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

if (!HUGGINGFACE_API_KEY) {
  console.warn('HUGGINGFACE_API_KEY not set, RAG will not function properly.')
}

const hf = new HfInference(HUGGINGFACE_API_KEY)

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const output = await hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: text,
    })

    // L'API peut renvoyer (number[]) ou (number[][]) ou (number[][][]) selon l'input
    // Pour une seule string, on attend number[] (embedding dimension ~384 ou 768)
    // all-MiniLM-L6-v2 sort du 384 dimensions.
    // ATTENTION: Le setup SQL a défini vector(768).
    // Si MiniLM sort 384, ça va planter.
    // On doit vérifier la dimension.
    // Llama-3 ou Mistral utilisent souvent 4096 ou 768.
    // 'sentence-transformers/all-mpnet-base-v2' sort 768. 
    // Utilisons 'sentence-transformers/all-mpnet-base-v2' pour matcher vector(768).

    // Correction modèle pour matcher SQL vector(768)
    return output as number[]
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

export const RAG_EMBEDDING_MODEL = 'sentence-transformers/all-mpnet-base-v2' // Dimension 768

export async function searchContext(query: string, limit: number = 3): Promise<string> {
  try {
    const embedding = await hf.featureExtraction({
      model: RAG_EMBEDDING_MODEL,
      inputs: query
    }) as number[]

    // Note: Prisma ne supporte pas encore nativement pgvector de manière typée parfaite,
    // on passe par $queryRaw.
    // La syntaxe pour pgvector distance cosine est <=> 
    // On veut les plus proches (distance min).

    // Cast explicite du vecteur pour SQL
    const vectorQuery = `[${embedding.join(',')}]`

    const results = await prisma.$queryRaw`
      SELECT id, contenu, titre, 1 - (embedding <=> ${vectorQuery}::vector) as similarity
      FROM rag_documents
      ORDER BY embedding <=> ${vectorQuery}::vector
      LIMIT ${limit};
    ` as Array<{ id: string, contenu: string, titre: string, similarity: number }>

    return results.map(r => `[Source: ${r.titre}]\n${r.contenu}`).join('\n\n')

  } catch (error) {
    console.error('Error searching RAG context:', error)
    return '' // Fail safe: retourne vide si erreur (ex: DB pas prête)
  }
}
