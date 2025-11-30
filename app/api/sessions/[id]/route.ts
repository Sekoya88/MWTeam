import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSessionSchema = z.object({
  type: z.enum(['FRACTIONNE', 'ENDURANCE', 'RECUPERATION', 'COMPETITION', 'SEUIL', 'VMA', 'AUTRE']).optional(),
  status: z.enum(['PREVUE', 'REALISEE', 'ANNULEE']).optional(),
  date: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  distance: z.number().positive().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  zones: z.array(z.enum(['RECUPERATION', 'ENDURANCE_FONDAMENTALE', 'SEUIL', 'VMA', 'VITESSE'])).optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  weather: z.enum(['SOLEIL', 'NUAGEUX', 'PLUIE', 'VENT', 'NEIGE', 'AUTRE']).optional(),
  cadence: z.number().int().positive().optional(),
  heartRateAvg: z.number().int().positive().optional(),
  heartRateMax: z.number().int().positive().optional(),
  isKeySession: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const trainingSession = await prisma.trainingSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!trainingSession) {
      return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ session: trainingSession })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la séance' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateSessionSchema.parse(body)

    const existingSession = await prisma.trainingSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 })
    }

    const updateData: any = { ...validated }
    if (validated.date) {
      updateData.date = new Date(validated.date)
    }

    const trainingSession = await prisma.trainingSession.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ session: trainingSession })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la séance' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const existingSession = await prisma.trainingSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 })
    }

    await prisma.trainingSession.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la séance' },
      { status: 500 }
    )
  }
}

