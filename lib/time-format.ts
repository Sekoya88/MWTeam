/**
 * Utilitaires pour convertir entre format décimal (min/km) et format minutes:secondes (3:20)
 */

/**
 * Convertit un nombre décimal (ex: 3.333) en format minutes:secondes (ex: "3:20")
 * @param decimalMinutes Nombre décimal de minutes (ex: 3.333 pour 3min20s)
 * @returns String au format "M:SS" ou "MM:SS"
 */
export function decimalToTimeString(decimalMinutes: number): string {
  if (isNaN(decimalMinutes) || decimalMinutes < 0) return ''
  
  const minutes = Math.floor(decimalMinutes)
  const seconds = Math.round((decimalMinutes - minutes) * 60)
  
  // Gérer le cas où seconds = 60
  const finalMinutes = seconds === 60 ? minutes + 1 : minutes
  const finalSeconds = seconds === 60 ? 0 : seconds
  
  return `${finalMinutes}:${finalSeconds.toString().padStart(2, '0')}`
}

/**
 * Convertit un string au format "M:SS" ou "MM:SS" en nombre décimal
 * @param timeString String au format "3:20" ou "03:20"
 * @returns Nombre décimal de minutes (ex: 3.333 pour 3:20)
 */
export function timeStringToDecimal(timeString: string): number | null {
  if (!timeString || !timeString.trim()) return null
  
  // Nettoyer le string (enlever espaces, etc.)
  const cleaned = timeString.trim()
  
  // Format attendu: "M:SS" ou "MM:SS"
  const match = cleaned.match(/^(\d+):(\d{2})$/)
  if (!match) return null
  
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  
  if (isNaN(minutes) || isNaN(seconds) || seconds >= 60) return null
  
  return minutes + seconds / 60
}

/**
 * Valide un string au format "M:SS" ou "MM:SS"
 * @param timeString String à valider
 * @returns true si valide, false sinon
 */
export function isValidTimeString(timeString: string): boolean {
  if (!timeString || !timeString.trim()) return false
  const cleaned = timeString.trim()
  const match = cleaned.match(/^(\d+):(\d{2})$/)
  if (!match) return false
  
  const seconds = parseInt(match[2], 10)
  return seconds < 60
}

/**
 * Formate un nombre décimal pour l'affichage (ex: 3.333 → "3:20")
 * Gère aussi les cas où c'est déjà un string valide
 */
export function formatPace(pace: number | string | null | undefined): string {
  if (pace === null || pace === undefined) return ''
  
  if (typeof pace === 'string') {
    // Si c'est déjà au bon format, le retourner
    if (isValidTimeString(pace)) return pace
    // Sinon essayer de le convertir
    const decimal = parseFloat(pace)
    if (!isNaN(decimal)) return decimalToTimeString(decimal)
    return ''
  }
  
  if (typeof pace === 'number') {
    return decimalToTimeString(pace)
  }
  
  return ''
}

