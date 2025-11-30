import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const performanceSchema = z.object({
  type: z.string(),
  distance: z.number().positive().optional(),
  time: z.number().int().positive().optional(),
  date: z.string().datetime(),
  notes: z.string().optional(),
  isPersonalRecord: z.boolean().optional(),
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

    const performances = await prisma.performance.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ performances })
  } catch (error) {
    console.error('Error fetching performances:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des performances' },
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
    const validated = performanceSchema.parse(body)

    const performance = await prisma.performance.create({
      data: {
        ...validated,
        date: new Date(validated.date),
        userId: session.user.id,
        isPersonalRecord: validated.isPersonalRecord || false,
      }
    })

    return NextResponse.json({ performance }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating performance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la performance' },
      { status: 500 }
    )
  }
}

