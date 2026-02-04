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

    if (athlete.role !== 'ATHLETE') {
      return NextResponse.json({ error: 'Cet utilisateur n\'est pas un athlète' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: params.id },
      data: {
        coachId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error assigning athlete:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'assignation' },
      { status: 500 }
    )
  }
}

