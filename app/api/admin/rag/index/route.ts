import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { indexDocument, deleteDocumentByIdPrefix } from '@/lib/rag'
import { format } from 'date-fns'

export const maxDuration = 120

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (session.user.role !== 'COACH' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    let totalChunks = 0

    // 1. Plans hebdomadaires publiés (avec jours)
    const plans = await prisma.weeklyPlan.findMany({
      where: { status: 'PUBLISHED' },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    })
    for (const plan of plans) {
      await deleteDocumentByIdPrefix(`plan_${plan.id}`)
      const lines = plan.days.map(
        d =>
          `Jour ${d.dayOfWeek + 1}: ${d.sessionDescription || '-'} | Z1:${d.zone1Endurance ?? 0} Z2:${d.zone2Seuil ?? 0} Z3:${d.zone3SupraMax ?? 0} V:${d.zoneVitesse ?? 0} | Vol: ${d.totalVolume ?? 0} km | ${d.notes || ''}`
      )
      const contenu = `Plan semaine ${format(plan.weekStart, 'dd/MM/yyyy')}. Objectif: ${plan.objective || '-'}. Notes: ${plan.notes || '-'}\n${lines.join('\n')}`
      const n = await indexDocument(
        `plan_${plan.id}`,
        `Plan ${format(plan.weekStart, 'dd/MM/yyyy')}`,
        contenu,
        'PLAN',
        { athleteId: plan.athleteId, weekStart: plan.weekStart.toISOString() }
      )
      totalChunks += n
    }

    // 2. Séances récentes (8 dernières semaines)
    const eightWeeksAgo = new Date()
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)
    const sessions = await prisma.trainingSession.findMany({
      where: { date: { gte: eightWeeksAgo } },
      orderBy: { date: 'desc' },
    })
    for (const s of sessions) {
      await deleteDocumentByIdPrefix(`session_${s.id}`)
      const contenu = `Séance ${format(s.date, 'dd/MM/yyyy')} | ${s.type} | ${s.duration}min | ${s.distance ?? '-'} km | RPE ${s.rpe} | ${s.notes || ''}`
      const n = await indexDocument(
        `session_${s.id}`,
        `Séance ${format(s.date, 'dd/MM/yyyy')} (${s.type})`,
        contenu,
        'SESSION',
        { userId: s.userId, date: s.date.toISOString() }
      )
      totalChunks += n
    }

    // 3. Notes coach
    const notes = await prisma.coachNote.findMany({ orderBy: { createdAt: 'desc' } })
    for (const n of notes) {
      await deleteDocumentByIdPrefix(`note_${n.id}`)
      const contenu = n.content
      const count = await indexDocument(
        `note_${n.id}`,
        `Note coach ${format(n.createdAt, 'dd/MM/yyyy')}`,
        contenu,
        'NOTE',
        { athleteId: n.athleteId }
      )
      totalChunks += count
    }

    return NextResponse.json({
      ok: true,
      totalChunks,
      plans: plans.length,
      sessions: sessions.length,
      notes: notes.length,
    })
  } catch (e) {
    console.error('[RAG index]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur lors de l’indexation RAG' },
      { status: 500 }
    )
  }
}
