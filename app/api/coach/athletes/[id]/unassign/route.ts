import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'COACH' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const athlete = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlète non trouvé' }, { status: 404 })
    }

    if (athlete.coachId !== session.user.id) {
      return NextResponse.json({ error: 'Cet athlète n\'est pas assigné à votre équipe' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: params.id },
      data: {
        coachId: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unassigning athlete:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la désassignation' },
      { status: 500 }
    )
  }
}

