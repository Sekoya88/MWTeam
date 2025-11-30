import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  calculateCTL,
  calculateATL,
  calculateACWR,
  isOvertraining,
} from '@/lib/statistics'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'COACH' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Récupérer tous les athlètes (pour l'instant, plus tard filtrer par coachId)
    const athletes = await prisma.user.findMany({
      where: {
        role: 'ATHLETE',
        // coachId: session.user.id, // À activer quand on aura la relation coach-athlète
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    // Pour chaque athlète, calculer les statistiques
    const athletesWithStats = await Promise.all(
      athletes.map(async (athlete) => {
        const sessions = await prisma.trainingSession.findMany({
          where: { userId: athlete.id },
        })

        const ctl = calculateCTL(sessions)
        const atl = calculateATL(sessions)
        const acwr = calculateACWR(atl, ctl)
        const overtraining = isOvertraining(acwr)

        return {
          ...athlete,
          statistics: {
            ctl,
            atl,
            acwr,
            overtraining,
            totalSessions: sessions.length,
          },
        }
      })
    )

    return NextResponse.json({ athletes: athletesWithStats })
  } catch (error) {
    console.error('Error fetching athletes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des athlètes' },
      { status: 500 }
    )
  }
}

