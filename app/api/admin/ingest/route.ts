
import { NextResponse } from 'next/server'
import { indexDocument } from '@/lib/rag'

export const maxDuration = 120

export async function POST(request: Request) {
    // Security: use admin key from env
    const adminKey = process.env.ADMIN_SECRET_KEY || process.env.HUGGINGFACE_API_KEY
    const authHeader = request.headers.get('x-admin-key')
    if (!adminKey || authHeader !== adminKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { documents } = await request.json()
        if (!Array.isArray(documents)) {
            return NextResponse.json({ error: 'Invalid payload: documents must be array' }, { status: 400 })
        }

        let processed = 0
        const errors: Array<{ id: string; error: string }> = []

        console.log(`[RAG Ingest] Received ${documents.length} documents. Provider: ${process.env.EMBEDDING_PROVIDER || 'huggingface'}`)

        for (const doc of documents) {
            try {
                const { id, title, content, type, metadata } = doc
                // Uses the provider-aware generateEmbedding (vertex or huggingface)
                const n = await indexDocument(id, title, content, type, metadata || {})
                processed += n
            } catch (err) {
                console.error(`Error processing doc ${doc.id}:`, err)
                errors.push({ id: doc.id, error: String(err) })
            }
        }

        return NextResponse.json({
            success: true,
            processed,
            errors,
            message: `Successfully ingested ${processed} chunks via ${process.env.EMBEDDING_PROVIDER || 'huggingface'}.`
        })

    } catch (error) {
        console.error('Ingest Error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
