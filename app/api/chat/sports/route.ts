
import { NextResponse } from 'next/server'
import { SportsRagAgent } from '@/lib/agents/sports-rag-agent'
import { searchContext } from '@/lib/rag'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { query, discipline, performRag = true } = body

        if (!query) {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            )
        }

        // 1. Retrieve RAG Context (optional but recommended)
        let context = ''
        if (performRag) {
            try {
                // Limit context to ~3 chunks to fit in context window
                context = await searchContext(query, 3)
            } catch (e) {
                console.warn('RAG Context retrieval failed, proceeding without context:', e)
            }
        }

        // 2. Initialize Agent
        // Uses LLM_PROVIDER from env (Ollama, Vertex, HF) automatically via base-agent -> llm-provider
        const agent = new SportsRagAgent({
            name: 'SportsRagAgent_API',
            temperature: 0.1, // Strict JSON
        })

        // 3. Execute Agent
        const result = await agent.execute({
            query,
            context,
            discipline
        })

        if (!result.success) {
            console.error('Agent execution failed:', result.error)
            return NextResponse.json(
                {
                    error: 'Agent processing failed',
                    details: result.error,
                    raw: result.rawResponse
                },
                { status: 500 }
            )
        }

        // 4. Return structured JSON
        return NextResponse.json(result.data)

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', message: error.message },
            { status: 500 }
        )
    }
}
