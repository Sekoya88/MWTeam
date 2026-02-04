import { calculateTargetVolume, VolumeTarget } from './volume-calculator'
import { generatePlanWithAgents } from './agents/orchestrator'
import { generateCompletion } from './llm-provider'

export interface GeneratePlanParams {
  athleteStats: {
    ctl: number;
    atl: number;
    acwr: number;
    weeklyVolume: number;
  };
  historicalPlans: Array<{
    weekStart: Date;
    days: Array<{
      dayOfWeek: number;
      sessionDescription: string;
      zone1Endurance?: number;
      zone2Seuil?: number;
      zone3SupraMax?: number;
      zoneVitesse?: number;
      totalVolume?: number;
    }>;
  }>;
  objective: string; // base, résistance, compétition, récupération
  period: string; // général, spécifique, affûtage
  constraints?: string;
}

export interface GeneratedDay {
  day: number; // 0=lundi, 6=dimanche
  sessionDescription: string;
  sessionType: 'ENDURANCE' | 'FRACTIONNE' | 'SEUIL' | 'VMA' | 'RECUPERATION' | 'COMPETITION' | 'AUTRE';
  zone1Endurance?: number;
  zone2Seuil?: number;
  zone3SupraMax?: number;
  zoneVitesse?: number;
  totalVolume?: number;
  targetTimes?: string;
  notes?: string;
}

export interface GeneratedPlan {
  objective: string;
  days: GeneratedDay[];
}

export async function generateWeeklyPlan(params: GeneratePlanParams, useAgents: boolean = false): Promise<GeneratedPlan> {
  // Si agents activés, utiliser workflow agentic
  if (useAgents) {
    try {
      return await generatePlanWithAgents(params)
    } catch (error) {
      console.warn('Erreur workflow agentic, fallback Mistral:', error)
      // Fallback sur Mistral - continue le code ci-dessous
    }
  }

  // Génération avec Mistral (ou fallback si agents échouent)
  const { athleteStats, historicalPlans, objective, period, constraints } = params;

  // Calculer le volume cible intelligent
  const volumeTarget = calculateTargetVolume(athleteStats, objective, period);

  // Construire le contexte historique
  const historyContext = historicalPlans.slice(-4).map(plan => {
    const totalVol = plan.days.reduce((sum, d) => sum + (d.totalVolume || 0), 0);
    const daysDesc = plan.days.map(d => {
      const zones = [];
      if (d.zone1Endurance) zones.push(`Z1:${d.zone1Endurance}km`);
      if (d.zone2Seuil) zones.push(`Z2:${d.zone2Seuil}km`);
      if (d.zone3SupraMax) zones.push(`Z3:${d.zone3SupraMax}km`);
      if (d.zoneVitesse) zones.push(`V:${d.zoneVitesse}km`);
      return `${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][d.dayOfWeek]}: ${d.sessionDescription} (${zones.join(', ') || 'Volume: ' + d.totalVolume + 'km'})`;
    }).join('\n');
    return `Semaine du ${plan.weekStart.toLocaleDateString('fr-FR')} (Volume total: ${totalVol.toFixed(1)}km):\n${daysDesc}`;
  }).join('\n\n');

  const prompt = `Tu es un coach expert en course à pied middle distance (800m-5000m) pour des ATHLÈTES EXPÉRIMENTÉS.

Génère un planning hebdomadaire (7 jours, lundi à dimanche) pour un athlète avec les caractéristiques suivantes:

**Statistiques actuelles:**
- CTL (Charge Chronique): ${athleteStats.ctl.toFixed(1)}
- ATL (Charge Aiguë): ${athleteStats.atl.toFixed(1)}
- ACWR (Ratio): ${athleteStats.acwr.toFixed(2)}
- Volume hebdomadaire moyen récent: ${athleteStats.weeklyVolume.toFixed(1)} km

**VOLUME HEBDOMADAIRE CIBLE (CONTRAINTE ABSOLUE):**
- Volume MINIMUM: ${volumeTarget.min.toFixed(1)} km (athlètes expérimentés)
- Volume MAXIMUM: ${volumeTarget.max.toFixed(1)} km
- Volume CIBLE: ${volumeTarget.target.toFixed(1)} km
- ⚠️ LE VOLUME TOTAL DE LA SEMAINE DOIT IMPÉRATIVEMENT ÊTRE ENTRE ${volumeTarget.min.toFixed(0)} ET ${volumeTarget.max.toFixed(0)} KM

**RÉPARTITION DES ZONES (en % du volume total):**
- Zone 1 (Endurance): ${(volumeTarget.distribution.zone1Endurance * 100).toFixed(0)}%
- Zone 2 (Seuils): ${(volumeTarget.distribution.zone2Seuil * 100).toFixed(0)}%
- Zone 3 (Supra-max/VMA): ${(volumeTarget.distribution.zone3SupraMax * 100).toFixed(0)}%
- Zone Vitesse (Fractionné): ${(volumeTarget.distribution.zoneVitesse * 100).toFixed(0)}%

**Objectif de la semaine:** ${objective}
**Période d'entraînement:** ${period}
${constraints ? `**Contraintes spécifiques:** ${constraints}` : ''}

**Historique récent (4 dernières semaines):**
${historyContext || 'Aucun historique disponible'}

**Instructions CRITIQUES:**
- ⚠️ Le volume total de la semaine DOIT être entre ${volumeTarget.min.toFixed(0)} et ${volumeTarget.max.toFixed(0)} km
- Respecte la répartition des zones indiquée ci-dessus
- Crée un planning équilibré et progressif sur la semaine
- Inclus 1-2 jours de récupération active (JOG court) si nécessaire
- Assure une progression logique (endurance → seuils → VMA → récup)
- Utilise des séances courantes : JOG, SL, TEMPO, VMA, Fractionné, Côtes

**Format JSON strict (pas de markdown, juste le JSON):**
{
  "objective": "description courte de l'objectif",
  "days": [
    {
      "day": 0,
      "sessionDescription": "description détaillée de la séance (ex: 'JOG 1H & MUSCU' ou '2 x (5 x 1 r1) r4')",
      "sessionType": "ENDURANCE|FRACTIONNE|SEUIL|VMA|RECUPERATION|COMPETITION|AUTRE",
      "zone1Endurance": 12.5,
      "zone2Seuil": 0,
      "zone3SupraMax": 0,
      "zoneVitesse": 0,
      "totalVolume": 12.5,
      "targetTimes": null,
      "notes": null
    }
  ]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

  // Retry logic avec fallback (Vertex AI ou Mistral selon LLM_PROVIDER)
  let lastError: Error | null = null;
  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const content = await generateCompletion(
        [{ role: 'user', content: prompt }],
        { temperature: 0.7, maxTokens: 2000 }
      );

      if (!content) {
        throw new Error('Aucune réponse du LLM');
      }

      // Extraire le JSON (enlever markdown si présent)
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Format de réponse invalide');
      }

      // Nettoyer le JSON des commentaires (// ...) qui ne sont pas valides en JSON
      let cleanedJson = jsonMatch[0]
        // Supprimer les commentaires // en fin de ligne (mais pas dans les strings)
        .replace(/,\s*\/\/[^\n]*/g, ',') // Commentaires après virgule
        .replace(/:\s*([^",\[\{][^,\n]*?)\s*\/\/[^\n]*/g, ': $1') // Commentaires après valeur non-string
        .replace(/\/\/[^\n]*\n/g, '\n') // Commentaires sur ligne entière
        // Supprimer les virgules traînantes (trailing commas) qui ne sont pas valides en JSON
        .replace(/,\s*([}\]])/g, '$1');

      const parsed = JSON.parse(cleanedJson) as GeneratedPlan;

      // Validation basique
      if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length !== 7) {
        throw new Error('Le planning doit contenir exactement 7 jours');
      }

      // Validation volume total (warning seulement, pas bloquant)
      const totalVolume = parsed.days.reduce((sum, d) => sum + (d.totalVolume || 0), 0);
      if (totalVolume < volumeTarget.min * 0.8 || totalVolume > volumeTarget.max * 1.2) {
        // Seulement si vraiment très éloigné (20% de marge)
        console.warn(
          `Volume total généré (${totalVolume.toFixed(1)}km) très éloigné de la fourchette recommandée (${volumeTarget.min.toFixed(0)}-${volumeTarget.max.toFixed(0)}km).`
        );
      }

      // Validation répartition zones
      const totalZ1 = parsed.days.reduce((sum, d) => sum + (d.zone1Endurance || 0), 0);
      const totalZ2 = parsed.days.reduce((sum, d) => sum + (d.zone2Seuil || 0), 0);
      const totalZ3 = parsed.days.reduce((sum, d) => sum + (d.zone3SupraMax || 0), 0);
      const totalV = parsed.days.reduce((sum, d) => sum + (d.zoneVitesse || 0), 0);

      const z1Percent = (totalZ1 / totalVolume) * 100;
      const z2Percent = (totalZ2 / totalVolume) * 100;
      const z3Percent = (totalZ3 / totalVolume) * 100;
      const vPercent = (totalV / totalVolume) * 100;

      // Avertissement si répartition très éloignée (mais pas bloquant)
      const expectedZ1 = volumeTarget.distribution.zone1Endurance * 100;
      if (Math.abs(z1Percent - expectedZ1) > 15) {
        console.warn(`Répartition Z1 (${z1Percent.toFixed(1)}%) éloignée de la cible (${expectedZ1.toFixed(0)}%)`);
      }

      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  // Si on arrive ici, toutes les tentatives ont échoué
  throw lastError || new Error('Erreur lors de la génération: toutes les tentatives ont échoué');
}

