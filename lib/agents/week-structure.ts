/**
 * WeekStructureAgent - Plans the optimal weekly structure
 */

import { BaseAgent } from './base-agent'
import { CoachAnalyzerOutput } from './coach-analyzer'

export type DayType = 'REPOS' | 'ENDURANCE' | 'VMA' | 'SEUIL' | 'FRACTIONNE' | 'COTES' | 'SORTIE_LONGUE' | 'MUSCU' | 'COMPETITION'

export interface WeekStructureInput {
    coachAnalysis: CoachAnalyzerOutput
    constraints?: string
}

export interface WeekStructureOutput {
    days: {
        dayOfWeek: number  // 0=Lundi, 6=Dimanche
        dayType: DayType
        intensity: 'low' | 'medium' | 'high'
        estimatedVolume: number  // km
        notes?: string
    }[]
    totalVolume: number
}

export class WeekStructureAgent extends BaseAgent<WeekStructureInput, WeekStructureOutput> {
    constructor() {
        super({
            name: 'WeekStructureAgent',
            temperature: 0.4,
            maxTokens: 1500,
        })
    }

    protected buildPrompt(input: WeekStructureInput): string {
        const { coachAnalysis, constraints } = input

        return `Tu es un coach expert middle distance qui planifie la STRUCTURE d'une semaine d'entraînement.

TYPE DE SEMAINE: ${coachAnalysis.weekType.toUpperCase()}

VOLUME CIBLE: ${coachAnalysis.volumeRecommendation.target} km (min: ${coachAnalysis.volumeRecommendation.min}, max: ${coachAnalysis.volumeRecommendation.max})

RÉPARTITION SOUHAITÉE:
- Endurance: ${coachAnalysis.sessionMix.endurance}%
- Seuils: ${coachAnalysis.sessionMix.seuil}%
- VMA: ${coachAnalysis.sessionMix.vma}%
- Vitesse: ${coachAnalysis.sessionMix.vitesse}%
- Musculation: ${coachAnalysis.sessionMix.musculation}%
- Repos: ${coachAnalysis.sessionMix.repos}%

${coachAnalysis.warnings.length > 0 ? `AVERTISSEMENTS: ${coachAnalysis.warnings.join(', ')}` : ''}
${constraints ? `CONTRAINTES: ${constraints}` : ''}

RÈGLES DE STRUCTURE:
1. Lundi (0) = souvent MUSCU + footing ou repos après compétition
2. Mardi (1) = séance qualité (VMA ou fractionné)
3. Mercredi (2) = récupération ou endurance
4. Jeudi (3) = séance seuils ou VMA
5. Vendredi (4) = repos ou footing léger
6. Samedi (5) = côtes, compétition ou séance spécifique
7. Dimanche (6) = sortie longue

IMPORTANT:
- Au moins 1 jour de repos complet par semaine
- Pas 2 séances haute intensité consécutives
- Placer repos ou endurance après séance difficile

RÉPONDS UNIQUEMENT EN JSON (pas de markdown):
{
  "days": [
    { "dayOfWeek": 0, "dayType": "MUSCU", "intensity": "medium", "estimatedVolume": 6, "notes": "Muscu + JOG" },
    { "dayOfWeek": 1, "dayType": "VMA", "intensity": "high", "estimatedVolume": 10 },
    { "dayOfWeek": 2, "dayType": "ENDURANCE", "intensity": "low", "estimatedVolume": 12 },
    { "dayOfWeek": 3, "dayType": "SEUIL", "intensity": "high", "estimatedVolume": 14 },
    { "dayOfWeek": 4, "dayType": "REPOS", "intensity": "low", "estimatedVolume": 0 },
    { "dayOfWeek": 5, "dayType": "COTES", "intensity": "medium", "estimatedVolume": 8 },
    { "dayOfWeek": 6, "dayType": "SORTIE_LONGUE", "intensity": "medium", "estimatedVolume": 18 }
  ],
  "totalVolume": 68
}`
    }

    protected parseResponse(content: string): WeekStructureOutput {
        const parsed = JSON.parse(content)

        if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length !== 7) {
            throw new Error('WeekStructureAgent must return exactly 7 days')
        }

        // Validate each day
        const validDayTypes: DayType[] = ['REPOS', 'ENDURANCE', 'VMA', 'SEUIL', 'FRACTIONNE', 'COTES', 'SORTIE_LONGUE', 'MUSCU', 'COMPETITION']

        for (const day of parsed.days) {
            if (!validDayTypes.includes(day.dayType)) {
                day.dayType = 'ENDURANCE' // Fallback
            }
            day.estimatedVolume = Number(day.estimatedVolume) || 0
        }

        const totalVolume = parsed.days.reduce((sum: number, d: { estimatedVolume: number }) => sum + d.estimatedVolume, 0)

        return {
            days: parsed.days,
            totalVolume,
        }
    }
}
