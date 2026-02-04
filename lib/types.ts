
export interface GeneratePlanParams {
    athleteStats: {
        ctl: number
        atl: number
        acwr: number
        weeklyVolume: number
    }
    objective: string
    period: string
    constraints?: string
    historicalPlans?: {
        weekStart: string | Date
        days: { totalVolume: number }[]
    }[]
}

export interface GeneratedDay {
    day: number
    sessionDescription: string
    sessionType: 'ENDURANCE' | 'FRACTIONNE' | 'SEUIL' | 'VMA' | 'RECUPERATION' | 'COMPETITION' | 'AUTRE'
    zone1Endurance: number
    zone2Seuil: number
    zone3SupraMax: number
    zoneVitesse: number
    totalVolume: number
    targetTimes?: string
    notes?: string
}

export interface GeneratedPlan {
    objective: string
    days: GeneratedDay[]
}
