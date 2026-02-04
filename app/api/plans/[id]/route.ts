import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { endOfWeek } from 'date-fns'

const updatePlanSchema = z.object({
  objective: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  days: z.array(z.object({
    id: z.string().optional(),
    dayOfWeek: z.number().int().min(0).max(6),
    date: z.string().datetime(),
    sessionDescription: z.string().optional(),
    sessionType: z.enum(['FRACTIONNE', 'ENDURANCE', 'RECUPERATION', 'COMPETITION', 'SEUIL', 'VMA', 'AUTRE']).optional(),
    zone1Endurance: z.number().nonnegative().optional(),
    zone2Seuil: z.number().nonnegative().optional(),
    zone3SupraMax: z.number().nonnegative().optional(),
    zoneVitesse: z.number().nonnegative().optional(),
    totalVolume: z.number().nonnegative().optional(),
    targetTimes: z.string().optional(),
    notes: z.string().optional(),
  })).optional(),
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

    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        id: params.id,
        OR: [
          { coachId: session.user.id },
          { athleteId: session.user.id },
        ],
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

    if (!plan) {
      return NextResponse.json({ error: 'Planning non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error fetching plan:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du planning' },
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

    // Seuls les coachs peuvent modifier
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

    const body = await request.json()
    const validated = updatePlanSchema.parse(body)

    // Mettre à jour le planning
    const updateData: any = {
      objective: validated.objective,
      notes: validated.notes,
      status: validated.status,
    }

    if (validated.days) {
      // Supprimer les jours existants et recréer
      await prisma.planDay.deleteMany({
        where: { planId: params.id },
      })

      updateData.days = {
        create: validated.days.map(day => ({
          dayOfWeek: day.dayOfWeek,
          date: new Date(day.date),
          sessionDescription: day.sessionDescription,
          sessionType: day.sessionType,
          zone1Endurance: day.zone1Endurance,
          zone2Seuil: day.zone2Seuil,
          zone3SupraMax: day.zone3SupraMax,
          zoneVitesse: day.zoneVitesse,
          totalVolume: day.totalVolume,
          targetTimes: day.targetTimes,
          notes: day.notes,
        })),
      }
    }

    const updated = await prisma.weeklyPlan.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ plan: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating plan:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du planning' },
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

    await prisma.weeklyPlan.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du planning' },
      { status: 500 }
    )
  }
}

