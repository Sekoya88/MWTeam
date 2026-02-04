import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns'

// Helper to parse date strings flexibly
const flexibleDate = z.string().transform((val) => {
  const date = new Date(val)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${val}`)
  }
  return date.toISOString()
})

const createPlanSchema = z.object({
  athleteId: z.string().min(1, "athleteId est requis"),
  weekStart: flexibleDate,
  objective: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  days: z.array(z.object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    date: flexibleDate,
    sessionDescription: z.string().optional().nullable(),
    sessionType: z.enum(['FRACTIONNE', 'ENDURANCE', 'RECUPERATION', 'COMPETITION', 'SEUIL', 'VMA', 'AUTRE']).optional().nullable(),
    zone1Endurance: z.coerce.number().nonnegative().optional().nullable().catch(null),
    zone2Seuil: z.coerce.number().nonnegative().optional().nullable().catch(null),
    zone3SupraMax: z.coerce.number().nonnegative().optional().nullable().catch(null),
    zoneVitesse: z.coerce.number().nonnegative().optional().nullable().catch(null),
    totalVolume: z.coerce.number().nonnegative().optional().nullable().catch(null),
    targetTimes: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).min(1, "Au moins un jour est requis"),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const weekStart = searchParams.get('weekStart')

    // Coach peut voir tous ses plannings ou ceux d'un athlète spécifique
    // Athlète peut voir ses propres plannings
    const where: any = {}

    if (session.user.role === 'COACH' || session.user.role === 'ADMIN') {
      where.coachId = session.user.id
      if (athleteId) {
        where.athleteId = athleteId
      }
    } else {
      where.athleteId = session.user.id
    }

    if (weekStart) {
      where.weekStart = new Date(weekStart)
    }

    const plans = await prisma.weeklyPlan.findMany({
      where,
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
      orderBy: { weekStart: 'desc' },
    })

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des plannings' },
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

    // Seuls les coachs peuvent créer des plannings
    if (session.user.role !== 'COACH' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const validated = createPlanSchema.parse(body)

    const weekStartDate = new Date(validated.weekStart)
    const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 })

    // Vérifier si un planning existe déjà pour cette semaine
    const existing = await prisma.weeklyPlan.findUnique({
      where: {
        athleteId_weekStart: {
          athleteId: validated.athleteId,
          weekStart: weekStartDate,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Un planning existe déjà pour cette semaine' },
        { status: 400 }
      )
    }

    // Valider et nettoyer les données
    const cleanedDays = validated.days.map(day => ({
      dayOfWeek: day.dayOfWeek,
      date: new Date(day.date),
      sessionDescription: day.sessionDescription || null,
      sessionType: (day.sessionType as any) || null,
      zone1Endurance: day.zone1Endurance != null ? Number(day.zone1Endurance) : null,
      zone2Seuil: day.zone2Seuil != null ? Number(day.zone2Seuil) : null,
      zone3SupraMax: day.zone3SupraMax != null ? Number(day.zone3SupraMax) : null,
      zoneVitesse: day.zoneVitesse != null ? Number(day.zoneVitesse) : null,
      totalVolume: day.totalVolume != null ? Number(day.totalVolume) : null,
      targetTimes: day.targetTimes || null,
      notes: day.notes || null,
    }))

    const plan = await prisma.weeklyPlan.create({
      data: {
        coachId: session.user.id,
        athleteId: validated.athleteId,
        weekStart: weekStartDate,
        weekEnd: weekEndDate,
        objective: validated.objective || null,
        notes: validated.notes || null,
        status: validated.status || 'DRAFT',
        days: {
          create: cleanedDays,
        },
      },
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

    // Si le planning est publié directement, créer une notification
    if (plan.status === 'PUBLISHED') {
      await prisma.notification.create({
        data: {
          userId: plan.athleteId,
          type: 'NEW_PLAN',
          title: 'Nouveau planning assigné',
          message: `Votre coach a créé un nouveau planning pour la semaine du ${plan.weekStart.toLocaleDateString('fr-FR')}`,
          link: '/dashboard/planning',
        },
      })
    }

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating plan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création du planning' },
      { status: 500 }
    )
  }
}

