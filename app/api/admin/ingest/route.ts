
import { NextResponse } from 'next/server'
import { HfInference } from '@huggingface/inference'
import { prisma } from '@/lib/prisma'

const HF_KEY = process.env.HUGGINGFACE_API_KEY

export async function POST(request: Request) {
    // 1. Security Check
    const authHeader = request.headers.get('x-admin-key')
    if (!HF_KEY || authHeader !== HF_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { documents } = await request.json()
        if (!Array.isArray(documents)) {
            return NextResponse.json({ error: 'Invalid payload: documents must be array' }, { status: 400 })
        }

        const hf = new HfInference(HF_KEY)
        const RAG_EMBEDDING_MODEL = 'sentence-transformers/all-mpnet-base-v2'

        let processed = 0
        const errors = []

        console.log(`[RAG Ingest] Received ${documents.length} documents.`)

        for (const doc of documents) {
            try {
                const { id, title, content, type } = doc

                // Generate Embedding
                const embedding = await hf.featureExtraction({
                    model: RAG_EMBEDDING_MODEL,
                    inputs: content
                }) as number[]

                const vectorString = `[${embedding.join(',')}]`

                // Insert
                await prisma.$executeRawUnsafe(
                    `INSERT INTO rag_documents (id, titre, contenu, source_type, embedding)
                 VALUES ($1, $2, $3, $4, $5::vector)
                 ON CONFLICT (id) DO UPDATE SET 
                    contenu = EXCLUDED.contenu, 
                    embedding = EXCLUDED.embedding`,
                    id, title, content, type, vectorString
                )
                processed++
            } catch (err) {
                console.error(`Error processing doc ${doc.id}:`, err)
                errors.push({ id: doc.id, error: String(err) })
            }
        }

        return NextResponse.json({
            success: true,
            processed,
            errors,
            message: `Successfully ingested ${processed} documents.`
        })

    } catch (error) {
        console.error('Ingest Error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
