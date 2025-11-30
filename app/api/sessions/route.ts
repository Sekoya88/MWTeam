import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const sessionSchema = z.object({
  type: z.enum(['FRACTIONNE', 'ENDURANCE', 'RECUPERATION', 'COMPETITION', 'SEUIL', 'VMA', 'AUTRE']),
  status: z.enum(['PREVUE', 'REALISEE', 'ANNULEE']).optional(),
  date: z.string().datetime(),
  duration: z.number().int().positive(),
  distance: z.number().positive().optional(),
  rpe: z.number().int().min(1).max(10),
  zones: z.array(z.enum(['RECUPERATION', 'ENDURANCE_FONDAMENTALE', 'SEUIL', 'VMA', 'VITESSE'])).optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  weather: z.enum(['SOLEIL', 'NUAGEUX', 'PLUIE', 'VENT', 'NEIGE', 'AUTRE']).optional(),
  cadence: z.number().int().positive().optional(),
  heartRateAvg: z.number().int().positive().optional(),
  heartRateMax: z.number().int().positive().optional(),
  isKeySession: z.boolean().optional(),
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

    const sessions = await prisma.trainingSession.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des séances' },
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
    const validated = sessionSchema.parse(body)

    const trainingSession = await prisma.trainingSession.create({
      data: {
        ...validated,
        date: new Date(validated.date),
        userId: session.user.id,
        status: validated.status || 'PREVUE',
        zones: validated.zones || [],
        isKeySession: validated.isKeySession || false,
      }
    })

    return NextResponse.json({ session: trainingSession }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la séance' },
      { status: 500 }
    )
  }
}

