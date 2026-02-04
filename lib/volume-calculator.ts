// Calcul intelligent du volume cible hebdomadaire
export interface VolumeTarget {
  min: number
  max: number
  target: number
  distribution: {
    zone1Endurance: number // % du volume total
    zone2Seuil: number
    zone3SupraMax: number
    zoneVitesse: number
  }
}

export interface AthleteStats {
  weeklyVolume: number
  ctl: number
  atl: number
  acwr: number
}

export function calculateTargetVolume(
  stats: AthleteStats,
  objective: string,
  period: string
): VolumeTarget {
  const base = stats.weeklyVolume || 80
  let multiplier = 1.0

  // Ajustement selon objectif
  if (objective === 'base' || objective === 'Base') {
    multiplier = 1.0 // Volume stable
  } else if (objective === 'résistance' || objective === 'Résistance') {
    multiplier = 1.15 // +15% pour résistance
  } else if (objective === 'compétition' || objective === 'Compétition') {
    multiplier = 0.9 // -10% pour compétition
  } else if (objective === 'récupération' || objective === 'Récupération') {
    multiplier = 0.7 // -30% pour récupération
  }

  // Ajustement selon période
  if (period === 'affûtage' || period === 'Affûtage') {
    multiplier *= 0.75 // Réduction importante pour affûtage
  } else if (period === 'spécifique' || period === 'Spécifique') {
    multiplier *= 1.1 // +10% pour spécifique
  } else if (period === 'général' || period === 'Général') {
    multiplier *= 1.0 // Stable pour général
  }

  // Ajustement selon ACWR (risque surentraînement)
  if (stats.acwr > 1.3) {
    multiplier *= 0.85 // Réduction si risque surentraînement
  } else if (stats.acwr < 0.8) {
    multiplier *= 1.1 // Augmentation si sous-charge
  }

  // Calcul volume cible
  const target = base * multiplier

  // Contraintes proportionnelles (pas de minimum/maximum absolu)
  const min = target * 0.9
  const max = target * 1.1
  const finalTarget = target

  // Répartition zones selon objectif
  let distribution = {
    zone1Endurance: 0.65, // 65% par défaut
    zone2Seuil: 0.20,    // 20%
    zone3SupraMax: 0.10, // 10%
    zoneVitesse: 0.05,   // 5%
  }

  if (objective === 'résistance' || objective === 'Résistance') {
    distribution = {
      zone1Endurance: 0.55, // Moins d'endurance
      zone2Seuil: 0.30,     // Plus de seuils
      zone3SupraMax: 0.10,
      zoneVitesse: 0.05,
    }
  } else if (objective === 'compétition' || objective === 'Compétition') {
    distribution = {
      zone1Endurance: 0.50,
      zone2Seuil: 0.25,
      zone3SupraMax: 0.15, // Plus de VMA
      zoneVitesse: 0.10,   // Plus de vitesse
    }
  } else if (objective === 'récupération' || objective === 'Récupération') {
    distribution = {
      zone1Endurance: 0.90, // Presque tout en endurance
      zone2Seuil: 0.05,
      zone3SupraMax: 0.03,
      zoneVitesse: 0.02,
    }
  }

  return {
    min,
    max,
    target: finalTarget,
    distribution,
  }
}

