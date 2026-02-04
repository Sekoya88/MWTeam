// Moteur de calcul automatique des volumes/zones selon type de séance
// Utilise les seuils personnalisés de l'athlète pour calculer les distances

export interface ParsedSession {
  type: 'endurance' | 'seuil' | 'vma' | 'fractionne' | 'repos' | 'competition' | 'musculation'
  duration?: number // minutes
  distance?: number // km
  reps?: number
  repDistance?: number // km
  rest?: number // minutes ou secondes
  intensity?: string // '100%', 'Sv1', 'Sv2', etc.
}

export interface CalculatedZones {
  zone1Endurance: number
  zone2Seuil: number
  zone3SupraMax: number
  zoneVitesse: number
  totalVolume: number
}

/**
 * Seuils personnalisés de l'athlète
 */
export interface AthleteThresholds {
  vma?: number      // VMA en km/h (ex: 20 km/h)
  sv1?: number      // Seuil aérobie en min/km décimal (ex: 3.75 = 3:45/km)
  sv2?: number      // Seuil anaérobie en min/km décimal (ex: 3.50 = 3:30/km)
  as10?: number     // Allure seuil 10km en min/km
  as5?: number      // Allure seuil 5km en min/km
}

// Constantes pour échauffement et récupération
const WARMUP_DISTANCE = 4.5 // ~20 min à 13.5 km/h
const COOLDOWN_DISTANCE = 4.5 // ~20 min à 13.5 km/h

/**
 * Parse une description de séance pour extraire les paramètres
 */
export function parseSessionDescription(description: string): ParsedSession {
  const desc = description.toUpperCase().trim()

  // REPOS
  if (desc.includes('REPOS') || desc === '' || desc === 'OFF') {
    return { type: 'repos' }
  }

  // ENDURANCE
  if (desc.includes('JOG')) {
    const hourMatch = desc.match(/(\d+)H/)
    const minMatch = desc.match(/(\d+)[\'']/)
    const duration = hourMatch ? parseInt(hourMatch[1]) * 60 : minMatch ? parseInt(minMatch[1]) : 60
    return { type: 'endurance', duration }
  }

  if (desc.includes('SL') || desc.includes('SORTIE LONGUE')) {
    const hourMatch = desc.match(/(\d+)H(\d+)?/)
    const kmMatch = desc.match(/(\d+)K/)
    if (hourMatch) {
      const hours = parseInt(hourMatch[1])
      const mins = hourMatch[2] ? parseInt(hourMatch[2]) : 0
      return { type: 'endurance', duration: hours * 60 + mins }
    }
    if (kmMatch) {
      return { type: 'endurance', distance: parseInt(kmMatch[1]) }
    }
    return { type: 'endurance', duration: 90 } // Par défaut 1H30
  }

  if (desc.includes('ACTIF')) {
    const hourMatch = desc.match(/(\d+)H/)
    const duration = hourMatch ? parseInt(hourMatch[1]) * 60 : 60
    return { type: 'endurance', duration }
  }

  // SEUILS
  if (desc.includes('TEMPO')) {
    const kmMatch = desc.match(/(\d+)K/)
    return { type: 'seuil', distance: kmMatch ? parseInt(kmMatch[1]) : 10 }
  }

  if (desc.includes('SV1') || desc.includes('SEUIL 1')) {
    const repMatch = desc.match(/(\d+)\s*X\s*(\d+)/)
    if (repMatch) {
      return { type: 'seuil', reps: parseInt(repMatch[1]), duration: parseInt(repMatch[2]), intensity: 'Sv1' }
    }
    return { type: 'seuil', duration: 30 }
  }

  if (desc.includes('SV2') || desc.includes('SEUIL 2')) {
    const repMatch = desc.match(/(\d+)\s*X\s*(\d+)/)
    if (repMatch) {
      return { type: 'seuil', reps: parseInt(repMatch[1]), duration: parseInt(repMatch[2]), intensity: 'Sv2' }
    }
    return { type: 'seuil', duration: 20 }
  }

  // VMA
  if (desc.includes('VMA')) {
    const repMatch = desc.match(/(\d+)\s*X\s*(\d+)/)
    const distMatch = desc.match(/(\d+)\s*X\s*(\d+)(M|K)/)
    if (distMatch) {
      const reps = parseInt(distMatch[1])
      const dist = parseInt(distMatch[2])
      const unit = distMatch[3]
      return {
        type: 'vma',
        reps,
        repDistance: unit === 'K' ? dist : dist / 1000,
        intensity: '100%',
      }
    }
    if (repMatch) {
      return { type: 'vma', reps: parseInt(repMatch[1]), duration: parseInt(repMatch[2]), intensity: '100%' }
    }
    return { type: 'vma', reps: 8, duration: 1 }
  }

  // FRACTIONNÉ
  if (desc.includes('X') && (desc.includes('400') || desc.includes('800') || desc.includes('200') || desc.includes('1000'))) {
    const matches = desc.match(/(\d+)\s*X\s*(\d+)(M|K)/g)
    if (matches) {
      // Format: "6 x 800 & 4 x 200"
      const firstMatch = matches[0].match(/(\d+)\s*X\s*(\d+)(M|K)/)
      if (firstMatch) {
        return {
          type: 'fractionne',
          reps: parseInt(firstMatch[1]),
          repDistance: firstMatch[3] === 'K' ? parseInt(firstMatch[2]) : parseInt(firstMatch[2]) / 1000,
        }
      }
    }
    // Format simple: "8 x 400"
    const simpleMatch = desc.match(/(\d+)\s*X\s*(\d+)(M|K)/)
    if (simpleMatch) {
      return {
        type: 'fractionne',
        reps: parseInt(simpleMatch[1]),
        repDistance: simpleMatch[3] === 'K' ? parseInt(simpleMatch[2]) : parseInt(simpleMatch[2]) / 1000,
      }
    }
  }

  // CÔTES
  if (desc.includes('CÔTE') || desc.includes('COTE')) {
    return { type: 'vma', duration: 20 } // Côtes = VMA
  }

  // MUSCULATION
  if (desc.includes('MUSCU') || desc.includes('PPG') || desc.includes('GAINAGE')) {
    return { type: 'musculation' }
  }

  // COMPÉTITION
  if (desc.includes('COMPET') || desc.match(/\d+M\s*$/) || desc.match(/\d+K\s*$/)) {
    return { type: 'competition' }
  }

  // Par défaut: endurance
  return { type: 'endurance', duration: 60 }
}

/**
 * Calcule les zones à partir d'une séance parsée
 * Utilise les seuils personnalisés de l'athlète pour des calculs précis
 */
export function calculateZonesFromSession(
  parsed: ParsedSession,
  sessionType: string,
  thresholds: AthleteThresholds = {}
): CalculatedZones {
  // Utiliser les seuils de l'athlète ou les valeurs par défaut
  const athleteVMA = thresholds.vma || 20 // km/h par défaut

  // Convertir les allures (min/km) en vitesses (km/h)
  // sv1 = 3.75 min/km => 60/3.75 = 16 km/h
  const sv1Speed = thresholds.sv1 ? 60 / thresholds.sv1 : 16 // km/h
  const sv2Speed = thresholds.sv2 ? 60 / thresholds.sv2 : 17 // km/h
  const as10Speed = thresholds.as10 ? 60 / thresholds.as10 : 17.5 // km/h

  // Vitesse endurance fondamentale: environ 70% de la VMA ou 60% de SV1
  const enduranceSpeed = thresholds.sv1
    ? 60 / (thresholds.sv1 * 1.25) // 25% plus lent que SV1
    : athleteVMA * 0.65 // 65% VMA

  const result: CalculatedZones = {
    zone1Endurance: 0,
    zone2Seuil: 0,
    zone3SupraMax: 0,
    zoneVitesse: 0,
    totalVolume: 0,
  }

  switch (parsed.type) {
    case 'repos':
      return result

    case 'endurance':
      // Calculer distance à partir de durée ou utiliser distance directe
      let distance = parsed.distance
      if (!distance && parsed.duration) {
        // Utiliser la vitesse endurance calculée à partir des seuils de l'athlète
        distance = (parsed.duration / 60) * enduranceSpeed
      }
      if (!distance) distance = 10 // Par défaut

      // Endurance = pas d'échauffement/récup séparés, tout en Z1
      result.zone1Endurance = Math.round(distance * 10) / 10
      result.zone2Seuil = 0
      result.totalVolume = Math.round(distance * 10) / 10
      break

    case 'seuil':
      if (parsed.distance) {
        // TEMPO 10K
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.zone2Seuil = parsed.distance
        result.totalVolume = parsed.distance + WARMUP_DISTANCE + COOLDOWN_DISTANCE
      } else if (parsed.reps && parsed.duration) {
        // SV1 2 x 15' ou SV2 5 x 4'
        // Utiliser les vitesses personnalisées de l'athlète
        const totalDuration = parsed.reps * parsed.duration
        const seuilSpeed = parsed.intensity === 'Sv1' ? sv1Speed : sv2Speed
        const seuilDistance = (totalDuration / 60) * seuilSpeed
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.zone2Seuil = Math.round(seuilDistance * 10) / 10
        result.totalVolume = Math.round((seuilDistance + WARMUP_DISTANCE + COOLDOWN_DISTANCE) * 10) / 10
      } else {
        // Par défaut
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.zone2Seuil = 8
        result.totalVolume = 8 + WARMUP_DISTANCE + COOLDOWN_DISTANCE
      }
      break

    case 'vma':
      if (parsed.reps && parsed.repDistance) {
        // VMA 8 x 400m
        const vmaDistance = parsed.reps * parsed.repDistance
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.zone3SupraMax = vmaDistance
        result.totalVolume = vmaDistance + WARMUP_DISTANCE + COOLDOWN_DISTANCE
      } else if (parsed.reps && parsed.duration) {
        // VMA 8 x 1'
        const vmaDistance = parsed.reps * (athleteVMA / 3.6) * (parsed.duration / 60) // km
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.zone3SupraMax = vmaDistance
        result.totalVolume = vmaDistance + WARMUP_DISTANCE + COOLDOWN_DISTANCE
      } else {
        // Par défaut
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.zone3SupraMax = 2.4
        result.totalVolume = 2.4 + WARMUP_DISTANCE + COOLDOWN_DISTANCE
      }
      break

    case 'fractionne':
      if (parsed.reps && parsed.repDistance) {
        // 6 x 800m ou 8 x 400m
        const fractionneDistance = parsed.reps * parsed.repDistance
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.zoneVitesse = fractionneDistance
        result.totalVolume = fractionneDistance + WARMUP_DISTANCE + COOLDOWN_DISTANCE
      } else {
        // Par défaut
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.zoneVitesse = 1.5
        result.totalVolume = 1.5 + WARMUP_DISTANCE + COOLDOWN_DISTANCE
      }
      break

    case 'musculation':
      // Musculation = pas de volume course
      result.totalVolume = 0
      break

    case 'competition':
      // Compétition = distance de la course + échauffement/récup
      if (parsed.distance) {
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.zone3SupraMax = parsed.distance
        result.totalVolume = parsed.distance + WARMUP_DISTANCE + COOLDOWN_DISTANCE
      } else {
        result.zone1Endurance = WARMUP_DISTANCE + COOLDOWN_DISTANCE
        result.totalVolume = 5 + WARMUP_DISTANCE + COOLDOWN_DISTANCE
      }
      break
  }

  return result
}

/**
 * Fonction principale: calcule les zones à partir d'une description
 * @param description - Description de la séance (ex: "VMA > 10 x 400")
 * @param sessionType - Type de séance
 * @param thresholds - Seuils personnalisés de l'athlète (VMA, SV1, SV2...)
 */
export function calculateSessionZones(
  description: string,
  sessionType: string,
  thresholds?: AthleteThresholds
): CalculatedZones {
  const parsed = parseSessionDescription(description)
  return calculateZonesFromSession(parsed, sessionType, thresholds || {})
}

