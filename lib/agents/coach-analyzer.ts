/**
 * CoachAnalyzerAgent - Analyzes athlete context and determines week type
 */

import { BaseAgent } from './base-agent'


export interface CoachAnalyzerInput {
    athleteStats: {
        ctl: number
        atl: number
        acwr: number
        weeklyVolume: number
    }
    objective: string // base, résistance, compétition, récupération
    period: string    // général, spécifique, affûtage
    constraints?: string
}

export interface CoachAnalyzerOutput {
    weekType: 'volume' | 'intensite' | 'mixte' | 'recuperation' | 'competition'
    volumeRecommendation: {
        min: number
        max: number
        target: number
    }
    sessionMix: {
        endurance: number  // % of week (0-100)
        seuil: number
        vma: number
        vitesse: number
        musculation: number
        repos: number
    }
    warnings: string[]
    recommendations: string[]
}

export class CoachAnalyzerAgent extends BaseAgent<CoachAnalyzerInput, CoachAnalyzerOutput> {
    constructor() {
        super({
            name: 'CoachAnalyzerAgent',
            temperature: 0.3, // More deterministic for analysis
            maxTokens: 1500,
        })
    }

    protected buildPrompt(input: CoachAnalyzerInput): string {
        const { athleteStats, objective, period, constraints } = input

        return `Tu es un coach expert middle distance (800m-5000m) qui analyse le profil d'un athlète pour planifier sa semaine.

STATISTIQUES DE L'ATHLÈTE:
- CTL (Charge Chronique): ${athleteStats.ctl.toFixed(1)}
- ATL (Charge Aiguë): ${athleteStats.atl.toFixed(1)}
- ACWR (Ratio charge): ${athleteStats.acwr.toFixed(2)} ${athleteStats.acwr > 1.5 ? '⚠️ RISQUE BLESSURE' : athleteStats.acwr < 0.8 ? '⚠️ SOUS-ENTRAÎNEMENT' : '✅ OK'}
- Volume moyen: ${athleteStats.weeklyVolume.toFixed(1)} km/semaine

OBJECTIF: ${objective}
PÉRIODE: ${period}
${constraints ? `CONTRAINTES: ${constraints}` : ''}

RÈGLES D'ANALYSE:
1. Si ACWR > 1.5 → semaine "recuperation" obligatoire
2. Si période = "affûtage" → semaine "competition" avec volume réduit (-30%)
3. Si objectif = "base" → semaine "volume" (70% endurance)
4. Si objectif = "résistance" → semaine "intensite" (20% VMA, 15% seuils)
5. Si objectif = "compétition proche" → semaine "mixte" équilibrée

RÉPONDS UNIQUEMENT EN JSON (pas de markdown):
{
  "weekType": "volume|intensite|mixte|recuperation|competition",
  "volumeRecommendation": { "min": 60, "max": 100, "target": 80 },
  "sessionMix": {
    "endurance": 60,
    "seuil": 15,
    "vma": 10,
    "vitesse": 5,
    "musculation": 5,
    "repos": 5
  },
  "warnings": ["avertissements si nécessaire"],
  "recommendations": ["recommandations spécifiques pour cette semaine"]
}`
    }

    protected parseResponse(content: string): CoachAnalyzerOutput {
        const parsed = JSON.parse(content)

        // Validate required fields
        if (!parsed.weekType || !parsed.volumeRecommendation || !parsed.sessionMix) {
            throw new Error('Missing required fields in CoachAnalyzerAgent response')
        }

        // Normalize sessionMix to ensure it sums to ~100%
        const total = Object.values(parsed.sessionMix as Record<string, number>).reduce((a, b) => a + b, 0)
        if (total < 90 || total > 110) {
            console.warn(`[CoachAnalyzerAgent] sessionMix total is ${total}%, adjusting...`)
            const factor = 100 / total
            for (const key of Object.keys(parsed.sessionMix)) {
                parsed.sessionMix[key] = Math.round(parsed.sessionMix[key] * factor)
            }
        }

        return {
            weekType: parsed.weekType,
            volumeRecommendation: parsed.volumeRecommendation,
            sessionMix: parsed.sessionMix,
            warnings: parsed.warnings || [],
            recommendations: parsed.recommendations || [],
        }
    }
}
