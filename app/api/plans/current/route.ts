import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek } from 'date-fns'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Athlète voit son planning de la semaine en cours
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        athleteId: session.user.id,
        weekStart: {
          lte: weekEnd,
        },
        weekEnd: {
          gte: weekStart,
        },
        status: 'PUBLISHED',
      },
      include: {
        days: {
          orderBy: { dayOfWeek: 'asc' },
        },
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!plan) {
      return NextResponse.json({ plan: null })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error fetching current plan:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du planning' },
      { status: 500 }
    )
  }
}

