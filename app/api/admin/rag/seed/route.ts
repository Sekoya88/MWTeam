/**
 * API Endpoint: POST /api/admin/rag/seed
 * 
 * Seeds the RAG database with all 21 DMFD structured chunks.
 * This runs server-side on Cloud Run with direct DB access.
 */

import { NextResponse } from 'next/server'
import { indexDocument, deleteDocumentByIdPrefix } from '@/lib/rag'
import { DMFD_CHUNKS } from '@/lib/dmfd-chunks'

export const maxDuration = 300

export async function POST(request: Request) {
    const adminKey = process.env.ADMIN_SECRET_KEY || process.env.HUGGINGFACE_API_KEY
    const authHeader = request.headers.get('x-admin-key')
    if (!adminKey || authHeader !== adminKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const provider = process.env.EMBEDDING_PROVIDER || 'huggingface'
        console.log(`[RAG Seed] Starting DMFD seed with ${DMFD_CHUNKS.length} chunks. Embedding provider: ${provider}`)

        // 1. Clean existing DMFD + EXPERT chunks
        let deleted = 0
        deleted += await deleteDocumentByIdPrefix('DMFD_')
        deleted += await deleteDocumentByIdPrefix('EXPERT_')
        console.log(`[RAG Seed] Deleted ${deleted} old chunks`)

        // 2. Index each chunk
        let totalInserted = 0
        const errors: Array<{ id: string; error: string }> = []

        for (const chunk of DMFD_CHUNKS) {
            try {
                const n = await indexDocument(
                    chunk.id,
                    chunk.titre,
                    chunk.contenu,
                    'dmfd_knowledge_base',
                    chunk.metadata
                )
                totalInserted += n
                console.log(`[RAG Seed] ✅ ${chunk.id}: ${chunk.titre} (${n} sub-chunks)`)

                // Rate limiting for Vertex AI
                if (provider === 'vertex') {
                    await new Promise(r => setTimeout(r, 300))
                }
            } catch (err) {
                console.error(`[RAG Seed] ❌ ${chunk.id}:`, err)
                errors.push({ id: chunk.id, error: String(err) })
            }
        }

        return NextResponse.json({
            success: true,
            totalChunks: totalInserted,
            totalDocuments: DMFD_CHUNKS.length,
            errors,
            provider,
            message: `Seeded ${totalInserted} chunks from ${DMFD_CHUNKS.length} DMFD documents via ${provider}.`
        })
    } catch (error) {
        console.error('[RAG Seed] Error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
