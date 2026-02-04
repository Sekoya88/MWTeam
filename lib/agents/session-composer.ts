/**
 * SessionComposerAgent - Composes detailed sessions for each day
 * This is the most critical agent - generates sessions in the correct format
 */

import { BaseAgent } from './base-agent'
import { WeekStructureOutput, DayType } from './week-structure'
import { SESSION_TEMPLATES, SessionTemplate } from '@/lib/session-templates'

export interface SessionComposerInput {
    weekStructure: WeekStructureOutput
    athleteStats: {
        ctl: number
        atl: number
        weeklyVolume: number
    }
    constraints?: string
}

export interface ComposedSession {
    day: number  // 0=Lundi, 6=Dimanche
    sessionDescription: string  // e.g. "15 x 400 r45 (~1'12)"
    sessionType: 'ENDURANCE' | 'FRACTIONNE' | 'SEUIL' | 'VMA' | 'RECUPERATION' | 'COMPETITION' | 'AUTRE'
    zone1Endurance: number
    zone2Seuil: number
    zone3SupraMax: number
    zoneVitesse: number
    totalVolume: number
    targetTimes?: string
    notes?: string
}

export interface SessionComposerOutput {
    sessions: ComposedSession[]
}

export class SessionComposerAgent extends BaseAgent<SessionComposerInput, SessionComposerOutput> {
    constructor() {
        super({
            name: 'SessionComposerAgent',
            temperature: 0.6, // More creative for sessions
            maxTokens: 3000,
        })
    }

    private getTemplatesForType(dayType: DayType): SessionTemplate[] {
        switch (dayType) {
            case 'ENDURANCE':
            case 'SORTIE_LONGUE':
                return SESSION_TEMPLATES.filter(t => t.category === 'endurance')
            case 'SEUIL':
                return SESSION_TEMPLATES.filter(t => t.category === 'seuil')
            case 'VMA':
                return SESSION_TEMPLATES.filter(t => t.category === 'vma')
            case 'FRACTIONNE':
            case 'COTES':
                return SESSION_TEMPLATES.filter(t =>
                    t.category === 'fractionne' ||
                    t.name.includes('CÔTES')
                )
            case 'MUSCU':
                return SESSION_TEMPLATES.filter(t =>
                    t.name.includes('MUSCU') ||
                    t.name.includes('PPG')
                )
            case 'REPOS':
                return SESSION_TEMPLATES.filter(t => t.category === 'repos')
            case 'COMPETITION':
                return SESSION_TEMPLATES.filter(t => t.category === 'competition')
            default:
                return []
        }
    }

    protected buildPrompt(input: SessionComposerInput): string {
        const { weekStructure, athleteStats, constraints } = input

        // Build examples from templates for each day type needed
        const dayExamples = weekStructure.days.map(day => {
            const templates = this.getTemplatesForType(day.dayType).slice(0, 5)
            return {
                dayOfWeek: day.dayOfWeek,
                dayType: day.dayType,
                targetVolume: day.estimatedVolume,
                examples: templates.map(t => ({
                    name: t.name,
                    description: t.description,
                    zones: { z1: t.zone1Endurance, z2: t.zone2Seuil, z3: t.zone3SupraMax, v: t.zoneVitesse },
                    volume: t.totalVolume,
                })),
            }
        })

        const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

        return `Tu es un coach expert middle distance (800m-5000m) qui compose des séances DÉTAILLÉES.

STYLE DE NOTATION À UTILISER (TRÈS IMPORTANT):
- VMA: "2 x (5 x 1' r1) R4" ou "8 x 400 r1' (~1'08)"
- Seuils: "SV2 > 15 x 400 r45 (~1'12 > 08)" ou "SV1 > 3 x 10' r2"
- Côtes: "CÔTES > 8 x 150 r4 (80%)" ou "CÔTES LONGUES 2 x 3' & 4 x 2'"
- Muscu: "MUSCU (Bulgare / Kettle Swing / Starsynski)" ou "PPG + Gainage"
- Endurance: "JOG 1H" ou "ACTIF 1H (~4'00/km)" ou "JOG 45' & MUSCU"
- Sortie longue: "SL 18K" ou "SL 1H30 vallonné"
- Repos: "REPOS"

STATISTIQUES ATHLÈTE:
- CTL: ${athleteStats.ctl.toFixed(1)}
- ATL: ${athleteStats.atl.toFixed(1)}
- Volume moyen: ${athleteStats.weeklyVolume.toFixed(1)} km

${constraints ? `CONTRAINTES: ${constraints}` : ''}

STRUCTURE DE LA SEMAINE À REMPLIR:
${dayExamples.map(d => `
${dayNames[d.dayOfWeek]} (${d.dayType}) - Volume cible: ${d.targetVolume}km
  Exemples possibles: ${d.examples.map(e => e.name).join(', ') || 'Libre'}
`).join('')}

RÈGLES:
1. Échauffement inclus: pour séances qualité, ajoute ~4.5km Z1 avant et après
2. Respecte le volume cible de chaque jour
3. Varie les séances (pas toujours le même type de fractionné)
4. Pour MUSCU, précise les exercices (Bulgare, Squat, Kettle Swing, etc.)
5. Inclus les temps cibles quand pertinent (~1'08 pour 400m VMA, ~3'45/km pour SV1)

RÉPONDS UNIQUEMENT EN JSON (pas de markdown):
{
  "sessions": [
    {
      "day": 0,
      "sessionDescription": "MUSCU (Bulgare / Squat) + JOG 40'",
      "sessionType": "AUTRE",
      "zone1Endurance": 8,
      "zone2Seuil": 0,
      "zone3SupraMax": 0,
      "zoneVitesse": 0,
      "totalVolume": 8,
      "targetTimes": null,
      "notes": "Renforcement bas du corps"
    },
    ...pour les 7 jours
  ]
}`
    }

    protected parseResponse(content: string): SessionComposerOutput {
        const parsed = JSON.parse(content)

        if (!parsed.sessions || !Array.isArray(parsed.sessions)) {
            throw new Error('SessionComposerAgent must return sessions array')
        }

        // Validate and clean sessions
        const validSessionTypes = ['ENDURANCE', 'FRACTIONNE', 'SEUIL', 'VMA', 'RECUPERATION', 'COMPETITION', 'AUTRE']

        const sessions: ComposedSession[] = parsed.sessions.map((s: Record<string, unknown>) => {
            const sessionType = validSessionTypes.includes(s.sessionType as string)
                ? s.sessionType as ComposedSession['sessionType']
                : 'AUTRE'

            return {
                day: Number(s.day) || 0,
                sessionDescription: String(s.sessionDescription || 'REPOS'),
                sessionType,
                zone1Endurance: Number(s.zone1Endurance) || 0,
                zone2Seuil: Number(s.zone2Seuil) || 0,
                zone3SupraMax: Number(s.zone3SupraMax) || 0,
                zoneVitesse: Number(s.zoneVitesse) || 0,
                totalVolume: Number(s.totalVolume) || 0,
                targetTimes: s.targetTimes ? String(s.targetTimes) : undefined,
                notes: s.notes ? String(s.notes) : undefined,
            }
        })

        // Ensure we have 7 days
        const dayMap = new Map(sessions.map(s => [s.day, s]))
        const completeSessions: ComposedSession[] = []

        for (let i = 0; i < 7; i++) {
            if (dayMap.has(i)) {
                completeSessions.push(dayMap.get(i)!)
            } else {
                completeSessions.push({
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
        }

        return { sessions: completeSessions.sort((a, b) => a.day - b.day) }
    }
}
