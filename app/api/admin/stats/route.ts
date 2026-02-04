import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const [totalUsers, athletes, coaches, admins, totalSessions, totalPlans] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ATHLETE' } }),
      prisma.user.count({ where: { role: 'COACH' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.trainingSession.count(),
      prisma.weeklyPlan.count(),
    ])

    return NextResponse.json({
      totalUsers,
      athletes,
      coaches,
      admins,
      totalSessions,
      totalPlans,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}

