import { TrainingSession } from '@prisma/client'

// Calcul de la charge d'entraînement (TRIMP = RPE × durée)
export function calculateTRIMP(rpe: number, duration: number): number {
  return rpe * duration
}

// Calcul CTL (Chronic Training Load) - moyenne pondérée exponentielle sur 42 jours
export function calculateCTL(
  sessions: TrainingSession[],
  previousCTL: number = 0,
  days: number = 42
): number {
  if (sessions.length === 0) {
    return previousCTL * Math.exp(-1 / days)
  }

  const now = new Date()
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  
  const recentSessions = sessions.filter(
    s => new Date(s.date) >= cutoffDate
  )

  if (recentSessions.length === 0) {
    return previousCTL * Math.exp(-1 / days)
  }

  let totalTRIMP = 0
  let totalWeight = 0

  recentSessions.forEach(session => {
    const trimp = calculateTRIMP(session.rpe, session.duration)
    const daysAgo = (now.getTime() - new Date(session.date).getTime()) / (24 * 60 * 60 * 1000)
    const weight = Math.exp(-daysAgo / days)
    
    totalTRIMP += trimp * weight
    totalWeight += weight
  })

  const newCTL = totalWeight > 0 ? totalTRIMP / totalWeight : 0
  return newCTL * 0.95 + previousCTL * 0.05 // Lissage
}

// Calcul ATL (Acute Training Load) - moyenne pondérée exponentielle sur 7 jours
export function calculateATL(
  sessions: TrainingSession[],
  previousATL: number = 0,
  days: number = 7
): number {
  if (sessions.length === 0) {
    return previousATL * Math.exp(-1 / days)
  }

  const now = new Date()
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  
  const recentSessions = sessions.filter(
    s => new Date(s.date) >= cutoffDate
  )

  if (recentSessions.length === 0) {
    return previousATL * Math.exp(-1 / days)
  }

  let totalTRIMP = 0
  let totalWeight = 0

  recentSessions.forEach(session => {
    const trimp = calculateTRIMP(session.rpe, session.duration)
    const daysAgo = (now.getTime() - new Date(session.date).getTime()) / (24 * 60 * 60 * 1000)
    const weight = Math.exp(-daysAgo / days)
    
    totalTRIMP += trimp * weight
    totalWeight += weight
  })

  const newATL = totalWeight > 0 ? totalTRIMP / totalWeight : 0
  return newATL * 0.9 + previousATL * 0.1 // Lissage plus rapide pour ATL
}

// Calcul ACWR (Acute:Chronic Workload Ratio)
export function calculateACWR(atl: number, ctl: number): number {
  if (ctl === 0) return 0
  return atl / ctl
}

// Détection de surentraînement (ACWR > 1.5)
export function isOvertraining(acwr: number): boolean {
  return acwr > 1.5
}

// Calcul du volume hebdomadaire
export function calculateWeeklyVolume(
  sessions: TrainingSession[],
  weekStart: Date
): { distance: number; duration: number; trimp: number } {
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  const weekSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date)
    return sessionDate >= weekStart && sessionDate < weekEnd
  })

  const distance = weekSessions.reduce((sum, s) => sum + (s.distance || 0), 0)
  const duration = weekSessions.reduce((sum, s) => sum + s.duration, 0)
  const trimp = weekSessions.reduce(
    (sum, s) => sum + calculateTRIMP(s.rpe, s.duration),
    0
  )

  return { distance, duration, trimp }
}

// Répartition par zones de travail
export function getZoneDistribution(sessions: TrainingSession[]): Record<string, number> {
  const distribution: Record<string, number> = {}
  
  sessions.forEach(session => {
    session.zones.forEach(zone => {
      distribution[zone] = (distribution[zone] || 0) + session.duration
    })
  })

  return distribution
}

// Progression des allures moyennes
export function calculateAveragePace(sessions: TrainingSession[]): number | null {
  const validSessions = sessions.filter(
    s => s.distance && s.distance > 0 && s.duration > 0
  )

  if (validSessions.length === 0) return null

  let totalPace = 0
  validSessions.forEach(session => {
    const pace = (session.duration / 60) / (session.distance || 1) // min/km
    totalPace += pace
  })

  return totalPace / validSessions.length
}

