import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  calculateCTL,
  calculateATL,
  calculateACWR,
  isOvertraining,
  calculateWeeklyVolume,
  getZoneDistribution,
  calculateAveragePace,
} from '@/lib/statistics'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    // Vérifier les permissions (coach peut voir les stats de ses athlètes)
    if (userId !== session.user.id) {
      if (session.user.role !== 'COACH' && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
      }
    }

    // Récupérer toutes les séances de l'utilisateur
    const sessions = await prisma.trainingSession.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    })

    // Calculer les statistiques
    const ctl = calculateCTL(sessions)
    const atl = calculateATL(sessions)
    const acwr = calculateACWR(atl, ctl)
    const overtraining = isOvertraining(acwr)

    // Volume hebdomadaire (semaine en cours)
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    weekStart.setHours(0, 0, 0, 0)
    const weeklyVolume = calculateWeeklyVolume(sessions, weekStart)

    // Répartition par zones
    const zoneDistribution = getZoneDistribution(sessions)

    // Allure moyenne
    const averagePace = calculateAveragePace(sessions)

    // Volume mensuel
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyVolume = calculateWeeklyVolume(sessions, monthStart)
    // Pour le mois, on calcule sur ~30 jours
    const monthSessions = sessions.filter(
      s => new Date(s.date) >= monthStart
    )
    const monthlyDistance = monthSessions.reduce((sum, s) => sum + (s.distance || 0), 0)
    const monthlyDuration = monthSessions.reduce((sum, s) => sum + s.duration, 0)

    return NextResponse.json({
      ctl,
      atl,
      acwr,
      overtraining,
      weeklyVolume,
      monthlyVolume: {
        distance: monthlyDistance,
        duration: monthlyDuration,
        trimp: monthlyVolume.trimp,
      },
      zoneDistribution,
      averagePace,
      totalSessions: sessions.length,
    })
  } catch (error) {
    console.error('Error calculating statistics:', error)
    return NextResponse.json(
      { error: 'Erreur lors du calcul des statistiques' },
      { status: 500 }
    )
  }
}

