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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const plans = await prisma.weeklyPlan.findMany({
      where: {
        athleteId: session.user.id,
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
      orderBy: { weekStart: 'desc' },
      take: limit,
    })

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Error fetching plan history:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    )
  }
}

