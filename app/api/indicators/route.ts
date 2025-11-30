import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const indicatorSchema = z.object({
  date: z.string().datetime(),
  restingHR: z.number().int().positive().optional(),
  vma: z.number().positive().optional(),
  vo2max: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  sleepHours: z.number().positive().max(24).optional(),
  sleepQuality: z.number().int().min(1).max(10).optional(),
  fatigue: z.number().int().min(1).max(10).optional(),
  injury: z.string().optional(),
  injuryStatus: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { userId: session.user.id }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const indicators = await prisma.physiologicalIndicator.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ indicators })
  } catch (error) {
    console.error('Error fetching indicators:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des indicateurs' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validated = indicatorSchema.parse(body)

    const indicator = await prisma.physiologicalIndicator.create({
      data: {
        ...validated,
        date: new Date(validated.date),
        userId: session.user.id,
      }
    })

    return NextResponse.json({ indicator }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating indicator:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'indicateur' },
      { status: 500 }
    )
  }
}

