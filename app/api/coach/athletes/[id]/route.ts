import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
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
      include: {
        zones: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        indicators: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        performances: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        sessions: {
          orderBy: { date: 'desc' },
          take: 20,
        },
        plansAsAthlete: {
          orderBy: { weekStart: 'desc' },
          take: 10,
          include: {
            days: {
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        },
      },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlète non trouvé' }, { status: 404 })
    }

    // Vérifier que le coach a accès à cet athlète
    if (session.user.role === 'COACH' && athlete.coachId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    return NextResponse.json({ athlete })
  } catch (error) {
    console.error('Error fetching athlete:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'athlète' },
      { status: 500 }
    )
  }
}

