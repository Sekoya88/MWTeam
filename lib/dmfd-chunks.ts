/**
 * DMFD Knowledge Chunks — Shared between seed and reindex endpoints.
 * 
 * Based on: docs/training-knowledge/RAG_DemiFond_Architecture_GCP.pdf
 * and docs/training-knowledge/expert-800m-rules.txt
 * 
 * 20 structured DMFD chunks + 1 expert-800m-rules chunk = 21 documents total.
 */

export interface DmfdChunk {
    id: string
    titre: string
    contenu: string
    metadata: Record<string, string>
}

export const DMFD_CHUNKS: DmfdChunk[] = [
    {
        id: 'DMFD_001', titre: 'Filières énergétiques — Contribution par distance',
        contenu: `Le demi-fond couvre des distances de 800m à 5000m avec des profils énergétiques distincts.
800m : Anaérobie alactique 10-15%, Anaérobie lactique 35-45%, Aérobie 40-55%. Durée élite H 1'40"-1'44". Lactatémie 12-22 mmol/L.
1000m : Alactique 7-10%, Lactique 25-35%, Aérobie 55-65%. Durée 2'11"-2'14". Lactatémie 10-16.
1500m : Alactique 5-8%, Lactique 20-28%, Aérobie 65-75%. Durée 3'26"-3'32". Lactatémie 8-14.
3000m : Alactique 3-5%, Lactique 10-18%, Aérobie 77-87%. Durée 7'20"-7'35". Lactatémie 6-10.
3000m St : Alactique 4-6%, Lactique 12-20%, Aérobie 74-84%. Durée 8'00"-8'20". Lactatémie 7-11.
5000m : Alactique 2-3%, Lactique 6-10%, Aérobie 87-92%. Durée 12'35"-13'00". Lactatémie 5-8.`,
        metadata: { discipline: 'general', cycle: 'macro', theme: 'physiologie', niveau: 'tous', source: 'litterature', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_002', titre: 'Paramètres physiologiques — Définitions et valeurs',
        contenu: `VMA (Vitesse Maximale Aérobie) : vitesse à VO2max. Régional 17-20 km/h, Élite 21-24 km/h.
VO2max : consommation max O2. Régional 58-65 ml/kg/min, Élite 72-84.
VMAn (anaérobie) : vitesse max sprint <10s. Régional 8-9.5 m/s, Élite 10-11.5 m/s.
SL1 (Seuil lactique aérobie) : ~2 mmol/L. Régional 72-78% VMA, Élite 75-82%.
SL2 (Seuil anaérobie) : ~4 mmol/L. Régional 82-88% VMA, Élite 86-92%.
Économie de course : coût O2/km. Régional 195-210, Élite 170-190.
HRV (variabilité FC) : index de récupération. rMSSD >50ms normal, >65ms élite.`,
        metadata: { discipline: 'general', cycle: 'macro', theme: 'physiologie', niveau: 'tous', source: 'litterature', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_003', titre: 'Référentiel des 6 zones d\'intensité (modèle FFA)',
        contenu: `Z1 Récupération active : 55-65% VMA, 60-70% FCmax, <1.5 mmol/L, RPE 8-10. Usage : récup entre séances.
Z2 Endurance fondamentale : 65-75% VMA, 70-78% FCmax, 1.5-2 mmol/L, RPE 10-12. Usage : sorties longues, foncier.
Z3 Allure tempo/seuil 1 : 75-83% VMA, 78-86% FCmax, 2-3 mmol/L, RPE 12-14. Usage : tempo, allure 10km.
Z4 Seuil anaérobie (SL2) : 83-90% VMA, 86-92% FCmax, 3-5.5 mmol/L, RPE 14-16. Usage : intervalles moyens.
Z5 Puissance aérobie (VMA) : 90-100% VMA, 92-98% FCmax, 5.5-10 mmol/L, RPE 16-18. Usage : intervalles VMA.
Z6 Supra-maximal/Anaérobie : >100% VMA, >98% FCmax, >10 mmol/L, RPE 18-20. Usage : séries lactiques, vitesse.`,
        metadata: { discipline: 'general', cycle: 'seance', theme: 'physiologie', niveau: 'tous', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_004', titre: 'Tableau de conversion allures selon VMA',
        contenu: `Formule : Allure_cible (km/h) = VMA × % zone. Conversion : Allure /km = 60 / vitesse_kmh.
VMA 18: Z1(60%)=10.8/5'33", Z2(70%)=12.6/4'46", Z3(80%)=14.4/4'10", Z4(87%)=15.7/3'50", Z5(95%)=17.1/3'30", Z5(100%)=18.0/3'20", Z6(107%)=19.3/3'07".
VMA 20: Z1=12.0/5'00", Z2=14.0/4'17", Z3=16.0/3'45", Z4=17.4/3'27", Z5(95%)=19.0/3'09", Z5(100%)=20.0/3'00", Z6(107%)=21.4/2'48".
VMA 22: Z1=13.2/4'33", Z2=15.4/3'54", Z3=17.6/3'25", Z4=19.1/3'08", Z5(95%)=20.9/2'52", Z5(100%)=22.0/2'44", Z6(107%)=23.5/2'33".
Usage RAG : quand un entraîneur demande 'quelle allure pour des 1000m à 95% VMA pour un athlète avec VMA 19 km/h', réponse : 18.1 km/h soit 3'19"/km.`,
        metadata: { discipline: 'general', cycle: 'seance', theme: 'allures', niveau: 'regional', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_005', titre: 'Catalogue des séances types — Format standardisé',
        contenu: `VMA-COURT (30s/30s) : Z5 100-105%. 2×12×(30s vite / 30s lent), récup 5min. Volume 13-16km. Récup 24-36h.
VMA-MOY (2-3min) : Z5 95-100%. 5-8 rép 2-3min, récup 1:1. Volume 13-17km. Récup 36-48h. PPS.
VMA-LONG (1000m type) : Z4-Z5 90-98%. 4-6 rép 4-8min, récup 2-3min. Volume 15-20km. Récup 36-48h.
SEUIL-CONT : Z4 85-88%. 1×20-35min continu à SL2. Volume 13-18km. Récup 24-36h. PPG-PPS.
SEUIL-REP : Z4 85-88%. 3-4×8-15min, récup 2-3min Z1. Volume 14-18km. Récup 24-36h.
LACTI-LONG : Z6 102-108%. 3-4×400-600m allure 800-1000m, récup 5-8min. Volume 12-16km. Récup 48-72h.
LACTI-COURT : Z6 105-115%. 3×(3-5×200m @VMAn, r45s / r5min). Volume 11-14km. Récup 48-72h.
FONCIER-LONG : Z2 65-72%. 60-120min continu. Volume 14-25km. Récup 24-36h.
NEUROMUSC (Côtes) : Z6 supra-max. 8-12×60-100m côte 6-8%, récup descente. Volume 10-14km.
FARTLEK : Z2-Z5. 45-70min alternances 2-5min rapide / 1-3min lent. Volume 14-18km.`,
        metadata: { discipline: 'general', cycle: 'seance', theme: 'catalogue-seances', niveau: 'regional', source: 'expertise', intensite: 'mixte', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_006', titre: 'Macrocycle annuel — Double périodisation FFA',
        contenu: `PPG1 (Oct-Nov, 6-8 sem) : Base aérobie, renforcement. Z2 dominant, Z3 ponctuel, muscu. Volume 90-100%.
PPS1 (Déc-Jan, 4-6 sem) : VMA, puissance aérobie. Z4-Z5 dominant. Volume 80-90%.
COMP1 Indoor (Jan-Fév, 3-4 sem) : Performances salle. Z5-Z6, affûtage. Volume 60-70%.
TRANSITION (Mars, 2-3 sem) : Récupération. Z1-Z2. Volume 40-50%.
PPG2 (Mars-Avr, 4-5 sem) : Reconstruction aérobie. Z2-Z3. Volume 80-90%.
PPS2 (Avr-Mai, 5-6 sem) : VMA + capacité lactique. Z4-Z6. Volume 75-85%.
PRÉ-COMPÉTITION (Juin, 3-4 sem) : Affinage. Volume 60-70%.
COMP2 Outdoor (Juil-Août, 6-8 sem) : Performances majeures. Volume 50-60%.
TRANSITION FINALE (Sept, 3-4 sem) : Décharge, bilan. Volume 30-40%.`,
        metadata: { discipline: 'general', cycle: 'macro', theme: 'planification', niveau: 'tous', source: 'FFA', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_007', titre: 'Mésocycle — Principes de construction (3-6 semaines)',
        contenu: `Développement aérobie (foncier) : 4-6 sem, ratio 3+1. 2 seuil + 1 longue/sem. Indicateur : baisse FC 5-8 bpm. Phase PPG.
Développement VMA : 3-5 sem, ratio 2+1 ou 3+1. 2 VMA (court+long) + 1 seuil/sem. Indicateur : allure VMA +2-5%. Phase PPS.
Capacité lactique : 3-4 sem, ratio 2+1. 2 lactique + 1 VMA/sem. Phase PPS avancé.
Affûtage/Compétition : 2-4 sem, volume -30% intensité maintenue. 1 qualité + 1 stimulation/sem.
Récupération/Transition : 2-3 sem, Z1-Z2 uniquement.`,
        metadata: { discipline: 'general', cycle: 'meso', theme: 'planification', niveau: 'regional', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_008', titre: 'Microcycle — Règles de construction hebdomadaire',
        contenu: `Règles impératives pour un microcycle valide et sécuritaire :
- Jamais deux séances lactiques (Z6) à moins de 48h d'intervalle.
- Séance la plus exigeante = lendemain du jour de repos.
- Séances neuro-musculaires récupèrent en 24-36h vs 48-72h pour les lactiques.
- Pas de séance de qualité le lendemain d'une compétition ou effort >85% FCmax.
- Volume max augmentation hebdomadaire : +10% vs semaine précédente.
- Toute douleur tendineuse/articulaire → remplacer par Z1-Z2 immédiatement.
- Semaine de décharge : volume -30-40%, maintenir 1-2 stimulations qualité courtes.
Exemple PPG : Lundi repos, Mardi seuil Z4 30min, Mercredi foncier Z2 + renforcement, Jeudi VMA courte, Vendredi récup Z1, Samedi foncier progressif Z2-Z3, Dimanche sortie longue Z2.
Exemple PPS : Lundi repos, Mardi VMA longue 5×1000m Z5, Mercredi foncier Z2 + côtes, Jeudi lactique Z6, Vendredi récup Z1, Samedi spécifique Z5-Z6 court, Dimanche régénération Z1.`,
        metadata: { discipline: 'general', cycle: 'micro', theme: 'planification', niveau: 'regional', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_009', titre: '800 mètres — Profil, allures et priorités',
        contenu: `Performance 800m et allures de travail :
1'44" (Elite) : VMA 23km/h, VMAn 10.8m/s, allure compét 27.6km/h (~120% VMA).
1'50" (National) : VMA 22km/h, VMAn 10.2m/s, allure 26.2km/h (~119% VMA).
1'55" (Régional) : VMA 20km/h, VMAn 9.4m/s, allure 25.0km/h (~125% VMA).
2'00" (Régional) : VMA 19km/h, VMAn 8.9m/s, allure 24.0km/h (~126% VMA).
2'10" (Club) : VMA 17km/h, VMAn 8.3m/s, allure 22.2km/h (~131% VMA).
Priorités : 40% VMA, 30% capacité lactique, 20% vitesse pure, 10% endurance.
Volume hebdomadaire recommandé : 45-65km (régional), 65-85km (national).`,
        metadata: { discipline: '800m', cycle: 'macro', theme: 'planification', niveau: 'regional', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_010', titre: '1500 mètres — Équations et tactique',
        contenu: `Relations de performance 1500m :
- 1500m (sec) ≈ 800m (sec) × 1.93 + 15s. Ex : 1'55" 800m → 3'38" 1500m.
- 1500m (sec) ≈ 1500 / (VMA_km/h × 0.293). Ex : VMA 22 km/h → 3'52" 1500m.
- 3000m ≈ 1500m × 2.08 à 2.15. 1500m 4'00" → 3000m ~8'20"-8'36".
Tactique 1500m : 0-400m départ contrôlé, 400-800m régulation, 800-1200m phase critique, dernier 300m sprint à ~280m.`,
        metadata: { discipline: '1500m', cycle: 'macro', theme: 'planification', niveau: 'regional', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_011', titre: 'Catégories d\'athlètes — Adaptation des plans',
        contenu: `Benjamins (9-10 ans) : 800m, cross. Volume max 15-20 km/sem. Pas de travail anaérobie intense, jeux.
Minimes (11-12 ans) : 800m, 1000m, cross. Volume 20-30 km/sem. Initiation fartlek.
Cadets (13-14 ans) : 800m-3000m. Volume 30-45 km/sem. Débuter intervalles doux, surveiller croissance.
Juniors (15-16 ans) : 800m-3000m+cross. Volume 40-60 km/sem. Développement VMA possible.
Espoirs (17-19 ans) : 800m-5000m. Volume 55-75 km/sem. Spécialisation croissante.
Seniors (20-34 ans) : Toutes distances. Volume 60-120 km/sem.
Masters 35+ : Volume 40-80 km/sem. Récupération plus longue.
Différences femmes/hommes : phase folliculaire (J1-J14) mieux adaptée aux charges. Bilan fer semestriel (ferritine >30 µg/L).`,
        metadata: { discipline: 'general', cycle: 'macro', theme: 'planification', niveau: 'tous', source: 'FFA', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_012', titre: 'Nutrition et récupération pour le demi-fondeur',
        contenu: `Nutrition péri-entraînement :
- 3-4h avant : Repas complet pâtes/riz + protéines + légumes, 500-700 kcal.
- 60-90min avant : banane + yaourt, 150-250 kcal.
- Pendant séance >60min : eau + électrolytes, 150-200 ml/15min.
- 0-30min après : protéines rapides 20-25g + glucides 40-60g.
- 1-2h après : Repas complet, 600-800 kcal.
Récupération : Sommeil 7-9h, Immersion froide 10-15min, Compression 60-90min, Stretching 20-30min, Massage/rouleau 15-20min.`,
        metadata: { discipline: 'general', cycle: 'macro', theme: 'nutrition', niveau: 'tous', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_013', titre: 'Blessures courantes — Prévention et gestion',
        contenu: `Périostite tibiale : douleur face interne du tibia. Cause : augmentation volume >10%/sem. Réduire volume 50%.
Tendinopathie achilléenne : Protocole Alfredson (excentrique) 12 sem. Repos relatif.
Syndrome bandelette ilio-tibiale : douleur genou externe. Renforcement hanche + étirement TFL.
Fracture de fatigue : douleur osseuse progressive. Repos obligatoire 6-12 sem. IRM.
Fascéite plantaire : douleur sous le pied au réveil. Stretching + rouleau sous pied.
RÈGLE : toute douleur persistante >3 jours → réduire volume 50% et consulter.`,
        metadata: { discipline: 'general', cycle: 'macro', theme: 'blessure', niveau: 'tous', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_014', titre: 'Adaptation jeunes athlètes — Contre-indications par âge',
        contenu: `Benjamins/Minimes (<13 ans) : PAS de travail lactique pur (Z6). Privilégier jeux, fartlek léger. Volume max 20-30 km/sem.
Cadets (13-14 ans) : Introduction progressive intervalles. PAS plus de 2 qualité/sem. Surveiller croissance.
Juniors (15-16 ans) : VMA possible. PAS de séances lactiques longues (>400m à >105% VMA). Max 3 qualité/sem.
RÈGLE : si croissance >5cm en 6 mois, réduire volume 20% et supprimer travail lactique intense.`,
        metadata: { discipline: 'general', cycle: 'macro', theme: 'blessure', niveau: 'tous', source: 'FFA', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_015', titre: 'Récupération avancée — Méthodes et protocoles',
        contenu: `Méthodes classées par efficacité :
Sommeil (★★★★★) : 7-9h minimum. GH en sommeil profond. Déficit -20-30% adaptations.
Nutrition post-effort (★★★★★) : fenêtre 0-30min. 20-25g protéines + 40-60g glucides.
Hydratation (★★★★☆) : 1.5× poids perdu en eau.
Compression (★★★★☆) : manchons 60-90min post-effort.
Cryothérapie (★★★☆☆) : 10-15min à 10-15°C. Max 2x/sem.
Stretching (★★★☆☆) : 20-30min DOUX, 3-4h après ou lendemain.
Footing récup (★★★★☆) : 20-30min Z1 (<65% FCmax) lendemain séance intense.`,
        metadata: { discipline: 'general', cycle: 'micro', theme: 'recuperation', niveau: 'tous', source: 'litterature', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_016', titre: '3000m Steeple — Planification spécifique',
        contenu: `Le steeple exige un travail technique en plus du foncier.
Technique obstacle : pied sur barrière (économique) ou franchissement sauté (rapide).
Fosse à eau : entraîner 1x/semaine en PPS.
Intégration obstacles : 1 séance/semaine dès PPG. Minimum 4 semaines avant compétition.
Volume réduit vs 3000m plat : -10% volume hebdomadaire.`,
        metadata: { discipline: 'steeple', cycle: 'macro', theme: 'planification', niveau: 'regional', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_017', titre: 'Plan type 12 semaines PPS — 800m régional',
        contenu: `Objectif : améliorer de 1'58" à 1'54" sur 800m. VMA 20 km/h, VMAn 9.2 m/s. Volume 45-55 km/sem.
S1 Remise en route : 20×30s/30s, 4×12min @86%, 8×400m @97%. Vol 45km.
S2 Dev. VMA : 25×30s/30s (103%), 5×1000m @95%, 10×200m @107%. Vol 48km.
S3 Charge VMA+ : 3×10×30s/30s, 6×800m @96%, 3×500m allure 800m. Vol 52km.
S4 Décharge : 4×800m @95%, 20×30s/30s, Compétition 1500m. Vol 38km.
S5-S6 Cap. lactique : séries 200-600m @104-110% VMAn. Vol 50-54km.
S7-S8 Mixte + Décharge : VMA + lactique + compétition test. Vol 36-48km.
S9-S10 Vitesse spécific : 600m @104%, 200m @108%, Compétition principal. Vol 44-50km.
S11-S12 Affûtage + COMPÉTITION OBJECTIF 800m. Vol 28-32km.`,
        metadata: { discipline: '800m', cycle: 'meso', theme: 'planification', niveau: 'regional', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_018', titre: 'Protocoles d\'évaluation standardisés',
        contenu: `Tests évaluation athlète demi-fond :
Test Léger-Bouvet (navette 20m) : VMA indirecte. 3-4x/an.
Test terrain VMA (demi-Cooper 6min) : VMA = Dist(m)/100.
Test 3000m piste : VMA = 3000/(temps_sec × 3.6).
Test seuil (30min tempo) : SL2 / allure seuil. Début PPS.
Test 30m lancé : VMAn. 2-3 fois/an.
Bilan RPE hebdo : sommeil + fatigue + motivation + douleurs. Chaque semaine.
FC repos matinal : FC 5min allongé au réveil. Augmentation >5bpm sur 3j = alerte surcharge.`,
        metadata: { discipline: 'general', cycle: 'macro', theme: 'evaluation', niveau: 'tous', source: 'FFA', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_019', titre: 'Bilan de séance — Format standardisé',
        contenu: `Format bilan post-séance :
- Type séance : code catalogue (VMA-LONG, LACTI-COURT…)
- Séance réalisée : description libre
- Allures observées : comparaison cibles vs réalisées (±s/km)
- RPE (0-10) : effort perçu global
- RPE cible : valeur planifiée
- FC moyenne
- Douleurs : localisation + EVA (0-10)
- Qualité sommeil veille : 1-5
- Notes entraîneur
- Validation plan semaine suivante : oui/non/modifier`,
        metadata: { discipline: 'general', cycle: 'micro', theme: 'evaluation', niveau: 'tous', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    {
        id: 'DMFD_020', titre: 'Prompt système RAG — Template expert demi-fond',
        contenu: `Tu es un assistant expert en planification de l'entraînement en demi-fond (800m, 1500m, 3000m, steeple).
Tu as accès à une base de connaissances spécialisée. Tu réponds UNIQUEMENT en te basant sur les chunks de contexte fournis.
RÈGLES : 1. Cite sources [CHUNK DMFD_XXX]. 2. Calcule allures km/h ET min/km. 3. Adapte au niveau athlète. 4. Signale contre-indications. 5. Score de confiance final. 6. Questions de clarification si doute.`,
        metadata: { discipline: 'general', cycle: 'macro', theme: 'rag-system', niveau: 'tous', source: 'expertise', version: '1.0', langue: 'fr' }
    },
    // Expert 800m rules from docs/training-knowledge/expert-800m-rules.txt
    {
        id: 'EXPERT_800M', titre: 'Principes d\'entraînement 800m-1500m Expert',
        contenu: `Structure semaine type phase spécifique 800m-1500m expert :
Lundi : VMA Longue ou Seuil (3x2000m seuil ou 6x1000m). Objectif : caisse aérobie.
Mardi : Footing récup 45'-1h Z1 + renforcement.
Mercredi : Vitesse Spécifique max (6x300m ou 4x400m allure compétition). Récup longue.
Jeudi : Footing Endurance Fondamentale 1h-1h15.
Vendredi : VMA Courte ou Lactique (10x200m ou 15x200m vite).
Samedi : Repos ou footing très léger.
Dimanche : Sortie Longue 1h15-1h30 avec portions d'allure.
Volume : 60-100km/sem selon profil. Répartition : Z1 60-70%, Z2(Seuil) 15-20%, Z3(VMA) 10-15%, Vitesse <5%.
Séances clés : Spé 800m : 3 séries (300m-200m) allure course R=5'. VMA : 2×10×200m (30"-30"). Seuil : 30-40' effort cumulé.
RÈGLE : Jamais 2 séances lactiques dures sans 48h de récupération aérobie.`,
        metadata: { discipline: '800m', cycle: 'micro', theme: 'catalogue-seances', niveau: 'national', source: 'expertise', version: '1.0', langue: 'fr' }
    },
]
