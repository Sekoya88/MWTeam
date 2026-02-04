import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateWeeklyPlan } from '@/lib/planner'
import { calculateTargetVolume } from '@/lib/volume-calculator'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { z } from 'zod'
import { calculateCTL, calculateATL, calculateACWR, calculateWeeklyVolume } from '@/lib/statistics'

const generateSchema = z.object({
  athleteId: z.string(),
  weekStart: z.string().datetime(),
  objective: z.string(),
  period: z.string(),
  constraints: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'COACH' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const validated = generateSchema.parse(body)

    // Récupérer les stats de l'athlète
    const athlete = await prisma.user.findUnique({
      where: { id: validated.athleteId },
      include: {
        sessions: {
          where: {
            date: {
              gte: subWeeks(new Date(), 8),
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlète non trouvé' }, { status: 404 })
    }

    // Calculer les stats réelles
    const recentSessions = athlete.sessions.filter(s => s.status === 'REALISEE')
    const ctl = calculateCTL(recentSessions)
    const atl = calculateATL(recentSessions)
    const acwr = calculateACWR(atl, ctl)

    // Volume hebdomadaire moyen sur les 8 dernières semaines
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const weekStart = subWeeks(new Date(), i + 1)
      return calculateWeeklyVolume(recentSessions, weekStart)
    })
    const weeklyVolume = weeks.reduce((sum, w) => sum + w.distance, 0) / 8

    // Calculer le volume cible pour validation
    const volumeTarget = calculateTargetVolume(
      { weeklyVolume, ctl, atl, acwr },
      validated.objective,
      validated.period
    )

    // Récupérer l'historique des plannings
    const historicalPlans = await prisma.weeklyPlan.findMany({
      where: {
        athleteId: validated.athleteId,
        status: 'PUBLISHED',
      },
      include: {
        days: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { weekStart: 'desc' },
      take: 4,
    })

    // Générer avec workflow agentic (ou Mistral en fallback)
    const useAgents = process.env.USE_AGENTIC_PLANNING === 'true'
    const generated = await generateWeeklyPlan({
      athleteStats: {
        ctl,
        atl,
        acwr,
        weeklyVolume,
      },
      historicalPlans: historicalPlans.map(plan => ({
        weekStart: plan.weekStart,
        days: plan.days.map(day => ({
          dayOfWeek: day.dayOfWeek,
          sessionDescription: day.sessionDescription || '',
          zone1Endurance: day.zone1Endurance ?? undefined,
          zone2Seuil: day.zone2Seuil ?? undefined,
          zone3SupraMax: day.zone3SupraMax ?? undefined,
          zoneVitesse: day.zoneVitesse ?? undefined,
          totalVolume: day.totalVolume ?? undefined,
        })),
      })),
      objective: validated.objective,
      period: validated.period,
      constraints: validated.constraints,
    }, useAgents)

    // Convertir en format pour la réponse
    const weekStartDate = new Date(validated.weekStart)
    const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 })

    const days = generated.days.map((day, index) => {
      const date = new Date(weekStartDate)
      date.setDate(date.getDate() + day.day)

      // S'assurer que dayOfWeek est entre 0-6
      const dayOfWeek = Math.max(0, Math.min(6, day.day))

      // Convertir targetTimes en string si c'est un objet
      let targetTimesStr = null
      if (day.targetTimes) {
        if (typeof day.targetTimes === 'string') {
          targetTimesStr = day.targetTimes
        } else if (typeof day.targetTimes === 'object') {
          targetTimesStr = JSON.stringify(day.targetTimes)
        }
      }

      return {
        dayOfWeek: dayOfWeek,
        date: date.toISOString(),
        sessionDescription: day.sessionDescription || null,
        sessionType: day.sessionType || null,
        zone1Endurance: day.zone1Endurance != null ? Number(day.zone1Endurance) : null,
        zone2Seuil: day.zone2Seuil != null ? Number(day.zone2Seuil) : null,
        zone3SupraMax: day.zone3SupraMax != null ? Number(day.zone3SupraMax) : null,
        zoneVitesse: day.zoneVitesse != null ? Number(day.zoneVitesse) : null,
        totalVolume: day.totalVolume != null ? Number(day.totalVolume) : null,
        targetTimes: targetTimesStr,
        notes: day.notes || null,
      }
    })

    // Calculer volume total généré pour validation
    const totalVolume = days.reduce((sum, d) => sum + (d.totalVolume || 0), 0)

    return NextResponse.json({
      plan: {
        objective: generated.objective,
        weekStart: weekStartDate.toISOString(),
        weekEnd: weekEndDate.toISOString(),
        days,
        volumeTarget: {
          min: volumeTarget.min,
          max: volumeTarget.max,
          target: volumeTarget.target,
          actual: totalVolume,
        },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error in generate:', error.errors)
      return NextResponse.json(
        {
          error: 'Données de génération invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    console.error('Error generating plan:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la génération'
    return NextResponse.json(
      {
        error: errorMessage,
        hint: errorMessage.includes('LLM') || errorMessage.includes('API')
          ? 'Vérifiez la configuration du fournisseur LLM (LLM_PROVIDER, GOOGLE_CLOUD_PROJECT)'
          : undefined
      },
      { status: 500 }
    )
  }
}

