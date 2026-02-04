/**
 * ValidationAgent - Validates and adjusts the final plan
 */

import { BaseAgent } from './base-agent'
import { ComposedSession } from './session-composer'
import { CoachAnalyzerOutput } from './coach-analyzer'

export interface ValidationInput {
    sessions: ComposedSession[]
    coachAnalysis: CoachAnalyzerOutput
}

export interface ValidationOutput {
    isValid: boolean
    adjustedSessions: ComposedSession[]
    volumeStats: {
        total: number
        target: number
        difference: number
    }
    zoneDistribution: {
        zone1Percent: number
        zone2Percent: number
        zone3Percent: number
        vitessePercent: number
    }
    issues: string[]
    fixes: string[]
}

export class ValidationAgent extends BaseAgent<ValidationInput, ValidationOutput> {
    constructor() {
        super({
            name: 'ValidationAgent',
            temperature: 0.2, // Very deterministic for validation
            maxTokens: 2000,
        })
    }

    protected buildPrompt(input: ValidationInput): string {
        const { sessions, coachAnalysis } = input

        // Calculate current stats
        const totalVolume = sessions.reduce((sum, s) => sum + s.totalVolume, 0)
        const totalZ1 = sessions.reduce((sum, s) => sum + s.zone1Endurance, 0)
        const totalZ2 = sessions.reduce((sum, s) => sum + s.zone2Seuil, 0)
        const totalZ3 = sessions.reduce((sum, s) => sum + s.zone3SupraMax, 0)
        const totalV = sessions.reduce((sum, s) => sum + s.zoneVitesse, 0)

        const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

        return `Tu es un coach expert qui VALIDE un plan d'entraînement.

PLAN PROPOSÉ:
${sessions.map(s => `${dayNames[s.day]}: ${s.sessionDescription} (${s.totalVolume}km)`).join('\n')}

STATISTIQUES ACTUELLES:
- Volume total: ${totalVolume.toFixed(1)} km
- Zone 1 (Endurance): ${totalZ1.toFixed(1)} km (${((totalZ1 / totalVolume) * 100).toFixed(0)}%)
- Zone 2 (Seuils): ${totalZ2.toFixed(1)} km (${((totalZ2 / totalVolume) * 100).toFixed(0)}%)
- Zone 3 (VMA): ${totalZ3.toFixed(1)} km (${((totalZ3 / totalVolume) * 100).toFixed(0)}%)
- Vitesse: ${totalV.toFixed(1)} km (${((totalV / totalVolume) * 100).toFixed(0)}%)

CIBLES DU COACH:
- Volume cible: ${coachAnalysis.volumeRecommendation.target} km (${coachAnalysis.volumeRecommendation.min}-${coachAnalysis.volumeRecommendation.max})
- Endurance: ${coachAnalysis.sessionMix.endurance}%
- Seuils: ${coachAnalysis.sessionMix.seuil}%
- VMA: ${coachAnalysis.sessionMix.vma}%
- Repos: ${coachAnalysis.sessionMix.repos}%

RÈGLES DE VALIDATION:
1. Volume total doit être dans la fourchette min-max
2. Au moins 1 jour de repos (totalVolume = 0)
3. Z1 (endurance) doit être >50% du volume total pour semaine normale
4. Pas 2 séances haute intensité (VMA/Fractionné) consécutives
5. Dimanche = Sortie Longue si pas compétition

RÉPONDS UNIQUEMENT EN JSON (pas de markdown):
{
  "isValid": true,
  "adjustedSessions": [...les 7 séances, ajustées si nécessaire],
  "volumeStats": {
    "total": ${totalVolume.toFixed(1)},
    "target": ${coachAnalysis.volumeRecommendation.target},
    "difference": ${(totalVolume - coachAnalysis.volumeRecommendation.target).toFixed(1)}
  },
  "zoneDistribution": {
    "zone1Percent": ${((totalZ1 / totalVolume) * 100).toFixed(0)},
    "zone2Percent": ${((totalZ2 / totalVolume) * 100).toFixed(0)},
    "zone3Percent": ${((totalZ3 / totalVolume) * 100).toFixed(0)},
    "vitessePercent": ${((totalV / totalVolume) * 100).toFixed(0)}
  },
  "issues": ["problèmes trouvés"],
  "fixes": ["corrections appliquées"]
}

Si le plan est bon, renvoie isValid=true et adjustedSessions identiques aux sessions d'entrée.
Si corrections nécessaires, applique-les dans adjustedSessions et documente dans fixes.`
    }

    protected parseResponse(content: string): ValidationOutput {
        const parsed = JSON.parse(content)

        if (!parsed.adjustedSessions || !Array.isArray(parsed.adjustedSessions)) {
            throw new Error('ValidationAgent must return adjustedSessions array')
        }

        // Validate session format
        const validSessionTypes = ['ENDURANCE', 'FRACTIONNE', 'SEUIL', 'VMA', 'RECUPERATION', 'COMPETITION', 'AUTRE']

        const adjustedSessions: ComposedSession[] = parsed.adjustedSessions.map((s: Record<string, unknown>) => {
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

        return {
            isValid: Boolean(parsed.isValid),
            adjustedSessions: adjustedSessions.sort((a, b) => a.day - b.day),
            volumeStats: {
                total: Number(parsed.volumeStats?.total) || 0,
                target: Number(parsed.volumeStats?.target) || 0,
                difference: Number(parsed.volumeStats?.difference) || 0,
            },
            zoneDistribution: {
                zone1Percent: Number(parsed.zoneDistribution?.zone1Percent) || 0,
                zone2Percent: Number(parsed.zoneDistribution?.zone2Percent) || 0,
                zone3Percent: Number(parsed.zoneDistribution?.zone3Percent) || 0,
                vitessePercent: Number(parsed.zoneDistribution?.vitessePercent) || 0,
            },
            issues: parsed.issues || [],
            fixes: parsed.fixes || [],
        }
    }
}
