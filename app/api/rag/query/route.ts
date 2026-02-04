import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryWithRag } from '@/lib/rag'
import { z } from 'zod'

const bodySchema = z.object({ query: z.string().min(1).max(2000) })

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (session.user.role !== 'COACH' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { query } = bodySchema.parse(body)

    const result = await queryWithRag(query)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Requête invalide', details: e.flatten() }, { status: 400 })
    }
    console.error('[RAG query]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur lors de la requête RAG' },
      { status: 500 }
    )
  }
}
