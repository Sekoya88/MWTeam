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

    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        id: params.id,
        coachId: session.user.id,
      },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Planning non trouvé' }, { status: 404 })
    }

    // Publier le planning (envoie aux athlètes)
    const updated = await prisma.weeklyPlan.update({
      where: { id: params.id },
      data: {
        status: 'PUBLISHED',
      },
      include: {
        days: {
          orderBy: { dayOfWeek: 'asc' },
        },
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Créer une notification pour l'athlète
    await prisma.notification.create({
      data: {
        userId: updated.athleteId,
        type: 'NEW_PLAN',
        title: 'Nouveau planning assigné',
        message: `Votre coach a créé un nouveau planning pour la semaine du ${updated.weekStart.toLocaleDateString('fr-FR')}`,
        link: '/dashboard/planning',
      },
    })

    return NextResponse.json({ plan: updated })
  } catch (error) {
    console.error('Error publishing plan:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la publication du planning' },
      { status: 500 }
    )
  }
}

