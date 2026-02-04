/**
 * Multi-Agent Orchestrator v4 - ULTRA COMPLETE
 * 
 * 5 Specialized Agents:
 * 1. ContextAnalyzer - Analyse profil athlète, historique, tendances
 * 2. WeekPlanner - Structure intelligente de la semaine
 * 3. SessionDesigner - Compose séances détaillées avec notation coach
 * 4. VolumeOptimizer - Calcule volumes par zone
 * 5. QualityChecker - Vérifie cohérence et équilibre
 * 
 * Parallel execution avec Promise.all où possible
 */

import { GeneratePlanParams, GeneratedPlan, GeneratedDay } from '@/lib/types'

import { generateCompletion } from '@/lib/llm-provider'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AgentContext {
  athleteStats: GeneratePlanParams['athleteStats']
  objective: string
  period: string
  constraints?: string
  historicalPlans?: GeneratePlanParams['historicalPlans']
}

interface ContextAnalysis {
  athleteProfile: {
    level: string
    currentForm: string
    fatigueRisk: string
    strengths: string[]
    areasToImprove: string[]
  }
  weekRecommendation: {
    type: string
    volumeMultiplier: number
    intensityLevel: string
    keyFocus: string
  }
  historicalInsights: string[]
}

interface WeekStructure {
  days: {
    dayOfWeek: number
    dayName: string
    sessionType: string
    focus: string
    intensityLevel: 'rest' | 'low' | 'moderate' | 'high' | 'max'
    estimatedDuration: string
    priority: 'key' | 'secondary' | 'recovery'
  }[]
  weeklyObjective: string
  keySessionDays: number[]
}

interface SessionDesign {
  day: number
  sessionDescription: string  // SHORT format only: "VMA > 12x400 r1'30"
  sessionType: 'ENDURANCE' | 'FRACTIONNE' | 'SEUIL' | 'VMA' | 'RECUPERATION' | 'COMPETITION' | 'AUTRE'
  targetZones: {
    zone1: number
    zone2: number
    zone3: number
    vitesse: number
  }
  targetTimes?: string
  rpeTarget: number
}

interface VolumeAllocation {
  day: number
  zone1Endurance: number
  zone2Seuil: number
  zone3SupraMax: number
  zoneVitesse: number
  totalVolume: number
}

interface QualityCheck {
  isValid: boolean
  score: number
  issues: string[]
  suggestions: string[]
  finalAdjustments: {
    day: number
    adjustment: string
  }[]
}

// ═══════════════════════════════════════════════════════════════════════════
// MISTRAL API CLIENT
// ═══════════════════════════════════════════════════════════════════════════

async function callLLM(
  agentName: string,
  prompt: string,
  temperature = 0.5
): Promise<string> {
  const startTime = Date.now()
  console.log(`[${agentName}] Starting...`)

  const content = await generateCompletion(
    [{ role: 'user', content: prompt }],
    { temperature, maxTokens: 4000 }
  )

  if (!content) throw new Error(`[${agentName}] No content from LLM`)

  const elapsed = Date.now() - startTime
  console.log(`[${agentName}] Completed in ${elapsed}ms`)

  return cleanJson(content)
}

function cleanJson(content: string): string {
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/)
  let json = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content

  return json
    .replace(/,\s*\/\/[^\n]*/g, ',')
    .replace(/\/\/[^\n]*\n/g, '\n')
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 1: CONTEXT ANALYZER
// Analyse le profil de l'athlète et son historique
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeContext(context: AgentContext): Promise<ContextAnalysis> {
  const { athleteStats, objective, period, constraints, historicalPlans } = context

  const historyDesc = historicalPlans?.slice(0, 3).map(p => {
    const total = p.days.reduce((s, d) => s + (d.totalVolume || 0), 0)
    return `Semaine ${new Date(p.weekStart).toLocaleDateString()}: ${total.toFixed(0)}km`
  }).join(', ') || 'Pas d\'historique'

  const prompt = `Tu es un analyste expert en entraînement middle distance (800m-5000m).

DONNÉES ATHLÈTE:
- CTL (Forme chronique): ${athleteStats.ctl.toFixed(1)}
- ATL (Fatigue aiguë): ${athleteStats.atl.toFixed(1)}  
- ACWR (Ratio charge): ${athleteStats.acwr.toFixed(2)}
- Volume moyen: ${athleteStats.weeklyVolume.toFixed(1)} km/semaine
- Historique récent: ${historyDesc}

OBJECTIF DÉCLARÉ: ${objective}
PÉRIODE: ${period}
${constraints ? `CONTRAINTES UTILISATEUR: ${constraints}` : ''}

Analyse en profondeur ce profil et réponds en JSON:
{
  "athleteProfile": {
    "level": "débutant|intermédiaire|confirmé|élite",
    "currentForm": "description de la forme actuelle",
    "fatigueRisk": "faible|modéré|élevé|critique",
    "strengths": ["point fort 1", "point fort 2"],
    "areasToImprove": ["axe 1", "axe 2"]
  },
  "weekRecommendation": {
    "type": "volume|intensité|mixte|récupération|affûtage|compétition",
    "volumeMultiplier": 1.0,
    "intensityLevel": "légère|modérée|haute|très haute",
    "keyFocus": "focus principal de la semaine"
  },
  "historicalInsights": ["insight 1 basé sur l'historique", "insight 2"]
}`

  const result = await callLLM('ContextAnalyzer', prompt, 0.3)
  return JSON.parse(result)
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 2: WEEK PLANNER
// Structure intelligente de la semaine
// ═══════════════════════════════════════════════════════════════════════════

async function planWeekStructure(
  context: AgentContext,
  analysis: ContextAnalysis
): Promise<WeekStructure> {
  const { objective, period, constraints } = context
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

  const prompt = `Tu es un planificateur expert en entraînement middle distance.

ANALYSE DE L'ATHLÈTE:
- Niveau: ${analysis.athleteProfile.level}
- Forme: ${analysis.athleteProfile.currentForm}
- Risque fatigue: ${analysis.athleteProfile.fatigueRisk}
- Focus semaine: ${analysis.weekRecommendation.keyFocus}
- Type semaine: ${analysis.weekRecommendation.type}
- Intensité: ${analysis.weekRecommendation.intensityLevel}

OBJECTIF: ${objective}
PÉRIODE: ${period}
${constraints ? `CONTRAINTES: ${constraints}` : ''}

Planifie la structure de la semaine (${dayNames.join(', ')}).

Réponds en JSON:
{
  "days": [
    {
      "dayOfWeek": 0,
      "dayName": "Lundi",
      "sessionType": "type de séance",
      "focus": "focus spécifique",
      "intensityLevel": "rest|low|moderate|high|max",
      "estimatedDuration": "durée estimée",
      "priority": "key|secondary|recovery"
    }
  ],
  "weeklyObjective": "objectif global de la semaine",
  "keySessionDays": [1, 3]
}`

  const result = await callLLM('WeekPlanner', prompt, 0.4)
  return JSON.parse(result)
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 3: SESSION DESIGNER
// Compose les séances détaillées avec notation coach
// ═══════════════════════════════════════════════════════════════════════════

async function designSessions(
  context: AgentContext,
  analysis: ContextAnalysis,
  structure: WeekStructure
): Promise<SessionDesign[]> {
  const { constraints } = context

  const structureDesc = structure.days.map(d =>
    `${d.dayName}: ${d.sessionType} (${d.intensityLevel}) - ${d.focus}`
  ).join('\n')

  const prompt = `Tu es un coach expert middle distance (800m-5000m). Compose les séances DÉTAILLÉES.

PROFIL ATHLÈTE:
- Niveau: ${analysis.athleteProfile.level}
- Points forts: ${analysis.athleteProfile.strengths.join(', ')}
- À améliorer: ${analysis.athleteProfile.areasToImprove.join(', ')}

OBJECTIF SEMAINE: ${structure.weeklyObjective}
SÉANCES CLÉS: Jours ${structure.keySessionDays.join(' et ')}

STRUCTURE PLANIFIÉE:
${structureDesc}

${constraints ? `CONTRAINTES UTILISATEUR (PRIORITAIRE): ${constraints}` : ''}

NOTATION COURTE OBLIGATOIRE (JAMAIS de longues phrases):
✅ BON: "VMA > 12 x 400 r1'30"
✅ BON: "SV2 > 15 x 400 r45 (~1'12)"
✅ BON: "SV1 > 3 x 3K r3"
✅ BON: "CÔTES > 10 x 150 (80%)"
✅ BON: "MUSCU (Bulgare / Squat) + JOG 40'"
✅ BON: "JOG 1H"
✅ BON: "SL 18K"
✅ BON: "REPOS"
❌ INTERDIT: "JOG 16 km en endurance fondamentale + 6 x 100m foulées bondissantes..."
❌ INTERDIT: "RÉCUPÉRATION ACTIVE: JOG 10 km très léger..."
❌ INTERDIT: étirements, mobilité, gainage, hydratation dans la description

RÈGLE: sessionDescription = MAX 30 CARACTÈRES, style télégraphique

Réponds en JSON:
{
  "sessions": [
    {
      "day": 0,
      "sessionDescription": "MUSCU + JOG 40'",
      "sessionType": "AUTRE",
      "targetZones": {"zone1": 8, "zone2": 0, "zone3": 0, "vitesse": 0},
      "targetTimes": null,
      "rpeTarget": 4
    }
  ]
}`

  const result = await callLLM('SessionDesigner', prompt, 0.5)
  const parsed = JSON.parse(result)
  return parsed.sessions
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 4: VOLUME OPTIMIZER
// Calcule et optimise les volumes par zone
// ═══════════════════════════════════════════════════════════════════════════

async function optimizeVolumes(
  context: AgentContext,
  analysis: ContextAnalysis,
  sessions: SessionDesign[]
): Promise<VolumeAllocation[]> {
  const { athleteStats } = context
  const baseVolume = athleteStats.weeklyVolume * (analysis.weekRecommendation.volumeMultiplier || 1)

  const sessionsDesc = sessions.map(s =>
    `Jour ${s.day}: ${s.sessionDescription} (RPE: ${s.rpeTarget}) - Zones: Z1=${s.targetZones.zone1}, Z2=${s.targetZones.zone2}, Z3=${s.targetZones.zone3}, V=${s.targetZones.vitesse}`
  ).join('\n')

  const prompt = `Tu es un expert en planification de charge d'entraînement.

VOLUME DE RÉFÉRENCE: ${baseVolume.toFixed(1)} km/semaine
MULTIPLICATEUR SEMAINE: x${analysis.weekRecommendation.volumeMultiplier}
TYPE SEMAINE: ${analysis.weekRecommendation.type}

SÉANCES PLANIFIÉES:
${sessionsDesc}

Calcule les volumes PRÉCIS en km pour chaque jour et chaque zone.
Assure-toi que le total correspond au volume cible de ~${baseVolume.toFixed(0)}km.

Réponds en JSON:
{
  "allocations": [
    {
      "day": 0,
      "zone1Endurance": 8.0,
      "zone2Seuil": 0,
      "zone3SupraMax": 0,
      "zoneVitesse": 0,
      "totalVolume": 8.0
    }
  ]
}`

  const result = await callLLM('VolumeOptimizer', prompt, 0.3)
  const parsed = JSON.parse(result)
  return parsed.allocations
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 5: QUALITY CHECKER
// Vérifie la cohérence et l'équilibre du plan
// ═══════════════════════════════════════════════════════════════════════════

async function checkQuality(
  context: AgentContext,
  analysis: ContextAnalysis,
  sessions: SessionDesign[],
  volumes: VolumeAllocation[]
): Promise<QualityCheck> {
  const totalVolume = volumes.reduce((s, v) => s + v.totalVolume, 0)
  const { athleteStats, constraints } = context

  const planDesc = sessions.map((s, i) => {
    const v = volumes.find(vol => vol.day === s.day) || volumes[i]
    return `Jour ${s.day}: ${s.sessionDescription} | ${v?.totalVolume?.toFixed(1) || 0}km`
  }).join('\n')

  const prompt = `Tu es un expert en qualité d'entraînement et prévention des blessures.

PLAN PROPOSÉ:
${planDesc}

VOLUME TOTAL: ${totalVolume.toFixed(1)} km
VOLUME HABITUEL ATHLÈTE: ${athleteStats.weeklyVolume.toFixed(1)} km
ACWR: ${athleteStats.acwr.toFixed(2)}
RISQUE FATIGUE: ${analysis.athleteProfile.fatigueRisk}

${constraints ? `CONTRAINTES UTILISATEUR: ${constraints}` : ''}

Vérifie la qualité du plan et réponds en JSON:
{
  "isValid": true,
  "score": 85,
  "issues": ["problème éventuel"],
  "suggestions": ["suggestion d'amélioration"],
  "finalAdjustments": [
    {"day": 2, "adjustment": "ajustement si nécessaire"}
  ]
}`

  const result = await callLLM('QualityChecker', prompt, 0.2)
  return JSON.parse(result)
}

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR - PARALLEL EXECUTION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

export async function generatePlanWithAgents(
  params: GeneratePlanParams
): Promise<GeneratedPlan> {
  const startTime = Date.now()
  const { athleteStats, objective, period, constraints, historicalPlans } = params

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('[Orchestrator] Starting Ultra-Complete Multi-Agent Workflow')
  console.log(`[Orchestrator] Objective: ${objective} | Period: ${period}`)
  if (constraints) console.log(`[Orchestrator] Constraints: ${constraints}`)
  console.log('═══════════════════════════════════════════════════════════════')

  const context: AgentContext = {
    athleteStats,
    objective,
    period,
    constraints,
    historicalPlans,
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1: Context Analysis (fondation pour tout le reste)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n[Phase 1] Context Analysis...')
  const analysis = await analyzeContext(context)
  console.log(`[Phase 1] Profile: ${analysis.athleteProfile.level}, Risk: ${analysis.athleteProfile.fatigueRisk}`)

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: Week Structure (dépend de l'analyse)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n[Phase 2] Week Structure Planning...')
  const structure = await planWeekStructure(context, analysis)
  console.log(`[Phase 2] Objective: ${structure.weeklyObjective}`)
  console.log(`[Phase 2] Key sessions: Days ${structure.keySessionDays.join(', ')}`)

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3: Session Design + Volume Optimization (PARALLEL)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n[Phase 3] Session Design + Volume Optimization (PARALLEL)...')

  // Design sessions first
  const sessions = await designSessions(context, analysis, structure)

  // Then optimize volumes based on designed sessions
  const volumes = await optimizeVolumes(context, analysis, sessions)

  console.log(`[Phase 3] Designed ${sessions.length} sessions`)

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 4: Quality Check
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n[Phase 4] Quality Check...')
  const quality = await checkQuality(context, analysis, sessions, volumes)
  console.log(`[Phase 4] Score: ${quality.score}/100, Valid: ${quality.isValid}`)
  if (quality.issues.length > 0) {
    console.log(`[Phase 4] Issues: ${quality.issues.join(', ')}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 5: Final Assembly
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n[Phase 5] Final Assembly...')

  const validTypes = ['ENDURANCE', 'FRACTIONNE', 'SEUIL', 'VMA', 'RECUPERATION', 'COMPETITION', 'AUTRE']

  const days: GeneratedDay[] = sessions.map((session, index) => {
    const volume = volumes.find(v => v.day === session.day) || volumes[index] || {
      zone1Endurance: 0, zone2Seuil: 0, zone3SupraMax: 0, zoneVitesse: 0, totalVolume: 0
    }

    // Apply quality adjustments if any
    const adjustment = quality.finalAdjustments.find(a => a.day === session.day)

    return {
      day: session.day,
      sessionDescription: session.sessionDescription,
      sessionType: validTypes.includes(session.sessionType) ? session.sessionType : 'AUTRE',
      zone1Endurance: volume.zone1Endurance || 0,
      zone2Seuil: volume.zone2Seuil || 0,
      zone3SupraMax: volume.zone3SupraMax || 0,
      zoneVitesse: volume.zoneVitesse || 0,
      totalVolume: volume.totalVolume || 0,
      targetTimes: session.targetTimes,
      notes: adjustment ? `Ajusté: ${adjustment.adjustment}` : undefined,
    } as GeneratedDay
  })

  // Ensure 7 days
  const dayMap = new Map(days.map(d => [d.day, d]))
  const finalDays: GeneratedDay[] = []

  for (let i = 0; i < 7; i++) {
    finalDays.push(dayMap.get(i) || {
      day: i,
      sessionDescription: 'REPOS',
      sessionType: 'RECUPERATION',
      zone1Endurance: 0,
      zone2Seuil: 0,
      zone3SupraMax: 0,
      zoneVitesse: 0,
      totalVolume: 0,
    })
  }

  const totalVolume = finalDays.reduce((s, d) => s + (d.totalVolume || 0), 0)
  const elapsed = Date.now() - startTime

  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`[Orchestrator] COMPLETED in ${elapsed}ms`)
  console.log(`[Orchestrator] Total Volume: ${totalVolume.toFixed(1)}km`)
  console.log(`[Orchestrator] Quality Score: ${quality.score}/100`)
  console.log('═══════════════════════════════════════════════════════════════')

  return {
    objective: `${objective} - ${period} | Score: ${quality.score}/100`,
    days: finalDays.sort((a, b) => a.day - b.day),
  }
}
