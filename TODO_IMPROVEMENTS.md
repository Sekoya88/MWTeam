# 🎯 TODO - Améliorations Planning & Architecture IA

## ✅ STATUT : IMPLÉMENTATION TERMINÉE

Toutes les améliorations critiques ont été implémentées :
- ✅ Volumes IA 70-120km avec validation
- ✅ Sauvegarde planning IA corrigée
- ✅ Calcul automatique volumes/zones
- ✅ 50+ templates enrichis
- ✅ Architecture agentic documentée

---

## 📊 Analyse des Problèmes Actuels (RÉSOLUS)

### Problème 1 : Volume IA trop faible (35km au lieu de 70-120km)
**Cause** : Le prompt Mistral ne spécifie pas clairement le volume cible pour athlètes expérimentés
**Impact** : Plannings inadaptés pour groupe d'élite

### Problème 2 : Impossible de sauvegarder planning généré par IA
**Cause** : Format de données incorrect entre génération et sauvegarde
**Impact** : Perte de temps, frustration

### Problème 3 : Calculs manuels fastidieux
**Cause** : Pas de calcul automatique des volumes/zones selon type de séance
**Impact** : Saisie lente, erreurs possibles

### Problème 4 : Architecture IA limitée
**Cause** : Prompt unique, pas de spécialisation par type de séance/distance
**Impact** : Qualité variable, pas de prise en compte musculation

---

## 🚀 PLAN D'ACTION COMPLET

### PHASE 1 : Corrections Urgentes (Priorité CRITIQUE)

#### ✅ Tâche 1.1 : Corriger le prompt IA pour volumes élevés (70-120km)
**Fichier** : `lib/mistral.ts`
- [ ] Ajouter dans le prompt : "Volume hebdomadaire cible : 70-120km pour athlètes expérimentés"
- [ ] Calculer volume cible basé sur historique + objectif
- [ ] Valider que le volume total généré est dans la fourchette
- [ ] Ajouter contrainte : "Le volume total de la semaine DOIT être entre X et Y km"

**Critères de succès** :
- Volume hebdomadaire généré entre 70-120km
- Répartition cohérente (pas tout en endurance)

#### ✅ Tâche 1.2 : Corriger la sauvegarde du planning IA
**Fichiers** : `app/coach/plans/generate/page.tsx`, `app/api/plans/route.ts`
- [ ] Vérifier le format des `days` envoyés à l'API
- [ ] S'assurer que `dayOfWeek` correspond bien (0-6)
- [ ] Valider que toutes les dates sont correctes
- [ ] Tester la sauvegarde complète

**Critères de succès** :
- Planning généré sauvegardable en 1 clic
- Pas d'erreur de format
- Planning visible dans `/coach/plans`

#### ✅ Tâche 1.3 : Calcul automatique volumes/zones pour création manuelle
**Fichier** : `app/coach/plans/new/page.tsx`
- [ ] Créer fonction `calculateSessionVolumes(description, type)` qui :
  - Parse la description (ex: "JOG 1H" → 12km Z1)
  - Calcule zones selon type de séance
  - Remplit automatiquement les champs
- [ ] Déclencher calcul quand description ou type change
- [ ] Ajouter règles de calcul :
  - **ENDURANCE** : 80-90% Z1, 10-20% Z2
  - **SEUIL** : 20-30% Z1, 60-70% Z2, 10% Z3
  - **VMA** : 20% Z1, 0% Z2, 60% Z3, 20% V
  - **FRACTIONNE** : 10% Z1, 0% Z2, 20% Z3, 70% V
  - **COMPETITION** : 100% selon distance

**Critères de succès** :
- Coach tape "JOG 1H" → Auto-remplit 12km Z1
- Coach tape "VMA 8x1" → Auto-remplit zones VMA
- Volume total calculé automatiquement

---

### PHASE 2 : Amélioration IA (Priorité HAUTE)

#### ✅ Tâche 2.1 : Améliorer le prompt Mistral avec contraintes strictes
**Fichier** : `lib/mistral.ts`
- [ ] Ajouter section "CONTRAINTES VOLUME" :
  ```
  **VOLUME HEBDOMADAIRE CIBLE :**
  - Minimum : 70km (athlètes expérimentés)
  - Maximum : 120km (pic d'entraînement)
  - Volume actuel moyen : ${weeklyVolume}km
  - Objectif : ${objective === 'base' ? '80-100km' : objective === 'résistance' ? '90-110km' : '70-90km'}
  ```
- [ ] Ajouter validation post-génération :
  ```typescript
  const totalVolume = parsed.days.reduce((sum, d) => sum + (d.totalVolume || 0), 0)
  if (totalVolume < 70 || totalVolume > 120) {
    throw new Error(`Volume total ${totalVolume}km hors fourchette 70-120km`)
  }
  ```
- [ ] Ajouter répartition zones :
  - Endurance (Z1) : 60-70% du volume total
  - Seuils (Z2) : 15-25%
  - VMA/Supra (Z3) : 5-10%
  - Vitesse (V) : 3-8%

**Critères de succès** :
- Volume toujours entre 70-120km
- Répartition zones cohérente
- Pas de jours vides (sauf repos planifié)

#### ✅ Tâche 2.2 : Ajouter calcul de volume cible intelligent
**Fichier** : `lib/mistral.ts`
- [ ] Fonction `calculateTargetVolume(weeklyVolume, objective, period, ctl, atl)` :
  ```typescript
  function calculateTargetVolume(stats, objective, period) {
    const base = stats.weeklyVolume || 80
    let multiplier = 1.0
    
    if (objective === 'base') multiplier = 1.0-1.1
    if (objective === 'résistance') multiplier = 1.1-1.3
    if (objective === 'compétition') multiplier = 0.8-1.0
    if (objective === 'récupération') multiplier = 0.6-0.8
    
    if (period === 'affûtage') multiplier *= 0.7
    if (period === 'spécifique') multiplier *= 1.1
    
    // Ajuster selon CTL/ATL
    if (stats.acwr > 1.3) multiplier *= 0.9 // Risque surentraînement
    if (stats.acwr < 0.8) multiplier *= 1.1 // Sous-charge
    
    return {
      min: Math.max(70, base * multiplier * 0.9),
      max: Math.min(120, base * multiplier * 1.1),
      target: base * multiplier
    }
  }
  ```

**Critères de succès** :
- Volume cible calculé intelligemment
- Prise en compte CTL/ATL/ACWR
- Adaptation selon objectif/période

---

### PHASE 3 : Système de Calcul Automatique (Priorité HAUTE)

#### ✅ Tâche 3.1 : Créer moteur de calcul de volumes par séance
**Fichier** : `lib/session-calculator.ts` (NOUVEAU)
- [ ] Fonction `parseSessionDescription(description: string)` :
  - Parse "JOG 1H" → { duration: 60, type: 'endurance' }
  - Parse "VMA 8 x 1 r1" → { reps: 8, duration: 1, rest: 1, type: 'vma' }
  - Parse "TEMPO 10K" → { distance: 10, type: 'seuil' }
  - Parse "6 x 800 & 4 x 200" → { reps1: 6, dist1: 0.8, reps2: 4, dist2: 0.2 }

- [ ] Fonction `calculateZonesFromSession(description, type, athleteVMA?)` :
  ```typescript
  function calculateZonesFromSession(desc, type, vma = 20) {
    const parsed = parseSessionDescription(desc)
    
    switch(type) {
      case 'ENDURANCE':
        // JOG 1H → ~12km à 12km/h
        const distance = parsed.duration ? parsed.duration * 0.2 : parsed.distance
        return {
          zone1Endurance: distance * 0.9,
          zone2Seuil: distance * 0.1,
          zone3SupraMax: 0,
          zoneVitesse: 0,
          totalVolume: distance
        }
      
      case 'VMA':
        // VMA 8x1 r1 → 8x400m à VMA
        const vmaDistance = parsed.reps * (vma / 3.6) * parsed.duration / 60
        return {
          zone1Endurance: vmaDistance * 0.2, // Échauffement
          zone2Seuil: 0,
          zone3SupraMax: vmaDistance * 0.8,
          zoneVitesse: 0,
          totalVolume: vmaDistance + 2 // + échauffement/récup
        }
      
      // ... autres types
    }
  }
  ```

**Critères de succès** :
- Parsing correct de toutes les descriptions courantes
- Calcul automatique des zones
- Prise en compte VMA de l'athlète si disponible

#### ✅ Tâche 3.2 : Intégrer calcul automatique dans formulaire manuel
**Fichier** : `app/coach/plans/new/page.tsx`
- [ ] Ajouter `useEffect` qui écoute `sessionDescription` et `sessionType`
- [ ] Appeler `calculateZonesFromSession` quand description change
- [ ] Auto-remplir les champs zones
- [ ] Permettre override manuel si besoin
- [ ] Afficher indicateur "Calculé automatiquement" vs "Saisi manuellement"

**Critères de succès** :
- Coach tape "JOG 1H" → Auto-remplit 12km Z1
- Coach tape "VMA 8x1" → Auto-remplit zones VMA
- Possibilité de modifier après calcul

#### ✅ Tâche 3.3 : Enrichir les templates avec plus de séances
**Fichier** : `lib/session-templates.ts`
- [ ] Ajouter séances manquantes :
  - **Endurance** : JOG 1H30, JOG 2H, ACTIF 1H30, SL 25K, SL 30K
  - **Seuils** : SV1 3x12', SV2 3x8', TEMPO 15K, TEMPO 21K
  - **VMA** : VMA 12x400, VMA 5x1000, VMA 3x2000
  - **Fractionné** : 10x400, 12x300, 8x600, 5x1000
  - **Côtes** : CÔTES 15x200, CÔTES 3x5, CÔTES courtes 20x100
  - **Musculation** : MUSCU complète, MUSCU haut du corps, PPG, Gainage
  - **Compétition** : 800m, 1500m, 3000m, 5000m, 10K, Semi, Marathon

**Critères de succès** :
- 50+ templates disponibles
- Couvre tous les types de séances courantes
- Inclut musculation

---

### PHASE 4 : Architecture Agentic (Priorité MOYENNE)

#### ✅ Tâche 4.1 : Analyse architecture actuelle vs agentic
**Réflexion** :
- **Avantages Ollama (local)** :
  - ✅ Gratuit, pas de limite
  - ✅ Données privées (RGPD)
  - ✅ Pas de dépendance externe
  - ❌ Nécessite GPU/serveur local
  - ❌ Performance variable
  - ❌ Maintenance infrastructure

- **Avantages Workflow Agentic (AGNO/LangGraph)** :
  - ✅ Agents spécialisés par tâche
  - ✅ Orchestration intelligente
  - ✅ Meilleure qualité (chaque agent expert)
  - ✅ Extensible (nouveaux agents facilement)
  - ❌ Plus complexe à développer
  - ❌ Nécessite LLM (local ou cloud)

- **Recommandation** :
  - **Court terme** : Améliorer Mistral avec prompts spécialisés
  - **Moyen terme** : Workflow agentic avec Mistral (ou Ollama si besoin)
  - **Long terme** : Agents spécialisés + RAG sur historique

#### ✅ Tâche 4.2 : Design architecture agentic proposée
**Structure** :
```
PlanningOrchestrator (Agent Principal)
  ├── VolumeCalculatorAgent
  │   └── Calcule volume cible (70-120km) selon stats/objectif
  ├── EnduranceAgent
  │   └── Génère séances endurance (JOG, SL, ACTIF)
  ├── SeuilAgent
  │   └── Génère séances seuils (SV1, SV2, TEMPO)
  ├── VMAAgent
  │   └── Génère séances VMA (fractionné court, VMA)
  ├── FractionneAgent
  │   └── Génère séances vitesse (200m, 400m, 800m)
  ├── MusculationAgent
  │   └── Génère séances musculation (PPG, gainage, renfo)
  ├── CompetitionAgent
  │   └── Génère séances compétition (affûtage, spécifique)
  └── PlanValidatorAgent
      └── Valide cohérence, volumes, répartition zones
```

**Workflow** :
1. Orchestrator reçoit demande (athlète, objectif, période)
2. VolumeCalculatorAgent → Volume cible (ex: 90km)
3. Répartition : 60% Endurance, 20% Seuils, 10% VMA, 5% Vitesse, 5% Muscu
4. Chaque agent génère ses séances
5. PlanValidatorAgent valide et ajuste
6. Retour planning complet

#### ✅ Tâche 4.3 : Implémentation workflow agentic (Optionnel)
**Fichiers** : `lib/agents/` (NOUVEAU)
- [ ] Créer structure agents
- [ ] Implémenter Orchestrator
- [ ] Implémenter chaque agent spécialisé
- [ ] Intégrer avec Mistral ou Ollama
- [ ] Tester workflow complet

**Critères de succès** :
- Workflow fonctionnel
- Qualité supérieure à prompt unique
- Extensible (nouveaux agents facilement)

---

### PHASE 5 : Améliorations UX (Priorité MOYENNE)

#### ✅ Tâche 5.1 : Améliorer interface génération IA
**Fichier** : `app/coach/plans/generate/page.tsx`
- [ ] Afficher volume cible calculé avant génération
- [ ] Afficher volume total généré après génération
- [ ] Alerte si volume hors fourchette
- [ ] Bouton "Ajuster volume" pour régénérer avec contrainte
- [ ] Preview amélioré avec répartition zones (graphique)

#### ✅ Tâche 5.2 : Améliorer interface création manuelle
**Fichier** : `app/coach/plans/new/page.tsx`
- [ ] Indicateur volume total semaine en temps réel
- [ ] Alerte si volume < 70km ou > 120km
- [ ] Suggestions automatiques selon volume actuel
- [ ] Bouton "Remplir semaine avec templates" (génération rapide)
- [ ] Graphique répartition zones

---

## 📋 PRIORISATION

### 🔴 URGENT (À faire immédiatement)
1. ✅ Tâche 1.1 : Corriger prompt IA volumes 70-120km
2. ✅ Tâche 1.2 : Corriger sauvegarde planning IA
3. ✅ Tâche 1.3 : Calcul automatique volumes/zones

### 🟠 HAUTE (Cette semaine)
4. ✅ Tâche 2.1 : Améliorer prompt avec contraintes strictes
5. ✅ Tâche 2.2 : Calcul volume cible intelligent
6. ✅ Tâche 3.1 : Moteur calcul volumes par séance
7. ✅ Tâche 3.2 : Intégrer calcul dans formulaire
8. ✅ Tâche 3.3 : Enrichir templates

### 🟡 MOYENNE (Prochaines semaines)
9. ✅ Tâche 4.1 : Analyser architecture agentic
10. ✅ Tâche 4.2 : Designer workflow agents
11. ✅ Tâche 5.1 : Améliorer UX génération IA
12. ✅ Tâche 5.2 : Améliorer UX création manuelle

### 🟢 BASSE (Futur)
13. ✅ Tâche 4.3 : Implémenter workflow agentic complet

---

## 🎯 RÉSULTATS ATTENDUS

### Après Phase 1 (Corrections Urgentes)
- ✅ IA génère plannings 70-120km
- ✅ Sauvegarde planning IA fonctionnelle
- ✅ Calcul automatique volumes en création manuelle

### Après Phase 2 (Amélioration IA)
- ✅ Plannings IA toujours cohérents (volume + répartition)
- ✅ Adaptation intelligente selon stats athlète

### Après Phase 3 (Calcul Automatique)
- ✅ Création manuelle 3x plus rapide
- ✅ Moins d'erreurs de saisie
- ✅ 50+ templates disponibles

### Après Phase 4 (Architecture Agentic)
- ✅ Qualité plannings supérieure
- ✅ Prise en compte musculation
- ✅ Agents spécialisés par type de séance

---

## 🔧 DÉCISIONS TECHNIQUES

### LLM Local (Ollama) vs Cloud (Mistral)
**Recommandation** : **Mistral amélioré** pour l'instant
- ✅ Déjà intégré
- ✅ Performance fiable
- ✅ Pas d'infrastructure à gérer
- ⚠️ Limites de capacité (429) → Retry + Fallback manuel

**Migration future vers Ollama si** :
- Besoin de plus de contrôle
- Volume de générations très élevé
- Contraintes RGPD strictes

### Architecture Agentic
**Recommandation** : **Workflow séquentiel simple** d'abord
- Orchestrator → Agents spécialisés → Validator
- Utilise Mistral pour chaque agent
- Pas besoin de framework complexe (AGNO) au début

**Évolution** : Ajouter LangGraph si besoin de workflows complexes

---

## 📝 NOTES IMPORTANTES

1. **Volumes 70-120km** : Critère absolu pour athlètes expérimentés
2. **Calcul automatique** : Doit être intelligent, pas juste templates
3. **Sauvegarde IA** : Bug critique à corriger en priorité
4. **Architecture** : Commencer simple, évoluer vers agentic si besoin
5. **Musculation** : À intégrer dans les plannings (templates + agents)

---

**Prochaine étape** : Commencer par Phase 1 (Corrections Urgentes)

