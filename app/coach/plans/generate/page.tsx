'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { startOfWeek, addDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ZonesWarningDialog } from '@/components/ZonesWarningDialog'

interface Athlete {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface GeneratedDay {
  dayOfWeek: number
  date: string
  sessionDescription: string
  sessionType: string
  zone1Endurance?: number
  zone2Seuil?: number
  zone3SupraMax?: number
  zoneVitesse?: number
  totalVolume?: number
  targetTimes?: string
  notes?: string
}

interface GeneratedPlan {
  objective: string
  weekStart: string
  weekEnd: string
  days: GeneratedDay[]
  volumeTarget?: {
    min: number
    max: number
    target: number
    actual: number
  }
}

export default function GeneratePlanPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [objective, setObjective] = useState('')
  const [period, setPeriod] = useState('')
  const [constraints, setConstraints] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  const [error, setError] = useState('')
  const [showZonesWarning, setShowZonesWarning] = useState(false)
  const [selectedAthleteZones, setSelectedAthleteZones] = useState<any>(null)

  useEffect(() => {
    if (session?.user?.role === 'COACH' || session?.user?.role === 'ADMIN') {
      fetchAthletes()
    }
  }, [session])

  const fetchAthletes = async () => {
    try {
      const res = await fetch('/api/coach/athletes')
      const data = await res.json()
      setAthletes(data.athletes || [])
    } catch (err) {
      console.error(err)
    }
  }

  const checkAthleteZones = async (athleteId: string, athleteList?: Athlete[]) => {
    try {
      const res = await fetch(`/api/zones?userId=${athleteId}`)
      const data = await res.json()
      const zones = data.zones?.[0] || {}

      if (!zones.vma || !zones.sv1 || !zones.sv2) {
        const athlete = (athleteList || athletes).find(a => a.id === athleteId)
        if (athlete) {
          setSelectedAthleteZones({ ...zones, athleteId, athleteName: `${athlete.firstName} ${athlete.lastName}` })
          setShowZonesWarning(true)
        }
      }
    } catch (err) {
      console.error('Error checking zones:', err)
    }
  }

  useEffect(() => {
    if (selectedAthlete && athletes.length > 0) {
      checkAthleteZones(selectedAthlete, athletes)
    }
  }, [selectedAthlete])

  const handleGenerate = async () => {
    if (!selectedAthlete || !objective || !period) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setGenerating(true)
    setError('')
    setGeneratedPlan(null)

    try {
      const weekStartDate = new Date(weekStart)
      const weekStartISO = startOfWeek(weekStartDate, { weekStartsOn: 1 }).toISOString()

      const res = await fetch('/api/plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: selectedAthlete,
          weekStart: weekStartISO,
          objective,
          period,
          constraints: constraints || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        const errorMsg = data.error || 'Erreur lors de la génération'

        // Message d'erreur amélioré pour 429
        if (errorMsg.includes('429') || errorMsg.includes('capacity exceeded')) {
          throw new Error('Limite de capacité IA dépassée. Veuillez réessayer dans quelques instants ou créer le planning manuellement.')
        }

        throw new Error(errorMsg)
      }

      const data = await res.json()

      setGeneratedPlan(data.plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedPlan) return

    try {
      // S'assurer que les jours ont le bon format
      const formattedDays = generatedPlan.days.map(day => {
        // S'assurer que dayOfWeek est entre 0-6
        const dayOfWeek = Math.max(0, Math.min(6, day.dayOfWeek || 0))

        // Convertir targetTimes en string si c'est un objet
        let targetTimesStr = null
        if (day.targetTimes) {
          if (typeof day.targetTimes === 'string') {
            targetTimesStr = day.targetTimes
          } else if (typeof day.targetTimes === 'object') {
            targetTimesStr = JSON.stringify(day.targetTimes)
          }
        }

        return {
          dayOfWeek: dayOfWeek,
          date: day.date,
          sessionDescription: day.sessionDescription || null,
          sessionType: day.sessionType || null,
          zone1Endurance: day.zone1Endurance != null ? Number(day.zone1Endurance) : null,
          zone2Seuil: day.zone2Seuil != null ? Number(day.zone2Seuil) : null,
          zone3SupraMax: day.zone3SupraMax != null ? Number(day.zone3SupraMax) : null,
          zoneVitesse: day.zoneVitesse != null ? Number(day.zoneVitesse) : null,
          totalVolume: day.totalVolume != null ? Number(day.totalVolume) : null,
          targetTimes: targetTimesStr,
          notes: day.notes || null,
        }
      })

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: selectedAthlete,
          weekStart: generatedPlan.weekStart,
          objective: generatedPlan.objective,
          days: formattedDays,
          status: 'DRAFT',
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Erreur sauvegarde:', errorData)
        throw new Error(errorData.error || errorData.details?.[0]?.message || 'Erreur lors de la sauvegarde')
      }

      router.push('/coach/plans')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
  }

  if (!session || (session.user.role !== 'COACH' && session.user.role !== 'ADMIN')) {
    return (
      <Layout>
        <Card className="py-16">
          <CardContent className="text-center">
            <p className="text-gray-600">Accès réservé aux coachs</p>
          </CardContent>
        </Card>
      </Layout>
    )
  }

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

  return (
    <>
      {showZonesWarning && selectedAthleteZones && (
        <ZonesWarningDialog
          athleteId={selectedAthleteZones.athleteId}
          athleteName={selectedAthleteZones.athleteName}
          onClose={() => {
            setShowZonesWarning(false)
            setSelectedAthleteZones(null)
          }}
          onSave={() => {
            setShowZonesWarning(false)
            setSelectedAthleteZones(null)
          }}
        />
      )}
      <Layout>
        <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-600" />
              Générer un Planning avec IA
            </h1>
            <p className="text-gray-600">L'IA génère un planning personnalisé basé sur les statistiques de l'athlète</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres de génération</CardTitle>
              <CardDescription>Remplissez les informations pour générer le planning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Athlète *</label>
                <select
                  value={selectedAthlete}
                  onChange={(e) => {
                    setSelectedAthlete(e.target.value)
                    if (e.target.value) {
                      checkAthleteZones(e.target.value, athletes)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Sélectionner un athlète</option>
                  {athletes.map(athlete => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.firstName} {athlete.lastName} ({athlete.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semaine *</label>
                <Input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectif de la semaine *</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Sélectionner un objectif</option>
                  <option value="base">Base (endurance fondamentale)</option>
                  <option value="résistance">Résistance (seuils, VMA)</option>
                  <option value="compétition">Compétition (affûtage)</option>
                  <option value="récupération">Récupération (volume réduit)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Période d'entraînement *</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Sélectionner une période</option>
                  <option value="général">Général (préparation générale)</option>
                  <option value="spécifique">Spécifique (préparation spécifique)</option>
                  <option value="affûtage">Affûtage (pré-compétition)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraintes (optionnel)</label>
                <Input
                  type="text"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="Ex: Blessure genou, compétition samedi, disponibilité limitée..."
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-red-800 font-medium">
                    <AlertCircle className="h-5 w-5" />
                    <span>Erreur lors de la génération</span>
                  </div>
                  <p className="text-sm text-red-700">{error}</p>
                  {error.includes('429') || error.includes('capacity') ? (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-xs text-red-600 mb-2">💡 Solution :</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/coach/plans/new')}
                        className="text-xs"
                      >
                        Créer le planning manuellement
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={generating || !selectedAthlete || !objective || !period}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer le planning
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {generatedPlan && (
            <Card className="border-2 border-purple-200 hover-lift">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Planning généré
                    </CardTitle>
                    <CardDescription>
                      Semaine du {format(new Date(generatedPlan.weekStart), 'd MMMM yyyy', { locale: fr })} au {format(new Date(generatedPlan.weekEnd), 'd MMMM yyyy', { locale: fr })}
                    </CardDescription>
                    <p className="text-sm text-gray-600 mt-1">Objectif: {generatedPlan.objective}</p>
                    {generatedPlan.volumeTarget && (
                      <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-blue-900">Volume total généré:</p>
                          <span className={`text-xl font-bold ${generatedPlan.volumeTarget.actual < generatedPlan.volumeTarget.min || generatedPlan.volumeTarget.actual > generatedPlan.volumeTarget.max
                              ? 'text-red-600'
                              : 'text-green-600'
                            }`}>
                            {generatedPlan.volumeTarget.actual.toFixed(1)} km
                          </span>
                        </div>
                        <p className="text-xs text-gray-700">
                          Cible: {generatedPlan.volumeTarget.target.toFixed(1)} km | Fourchette: {generatedPlan.volumeTarget.min.toFixed(0)}-{generatedPlan.volumeTarget.max.toFixed(0)} km
                        </p>
                        {generatedPlan.volumeTarget.actual < generatedPlan.volumeTarget.min || generatedPlan.volumeTarget.actual > generatedPlan.volumeTarget.max ? (
                          <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ Volume hors fourchette recommandée - Régénération suggérée</p>
                        ) : (
                          <p className="text-xs text-green-600 mt-2 font-semibold">✅ Volume dans la fourchette recommandée pour athlètes expérimentés</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generatedPlan.days.map((day, idx) => {
                    const date = new Date(day.date)
                    return (
                      <div key={idx} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-black">{dayNames[day.dayOfWeek]} {format(date, 'd MMM', { locale: fr })}</h4>
                          {day.totalVolume && (
                            <span className="text-sm font-bold text-gray-700">{day.totalVolume.toFixed(1)} km</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{day.sessionDescription}</p>
                        <div className="flex gap-4 text-xs text-gray-600">
                          {day.zone1Endurance && day.zone1Endurance > 0 && (
                            <span>Z1: {day.zone1Endurance.toFixed(1)}km</span>
                          )}
                          {day.zone2Seuil && day.zone2Seuil > 0 && (
                            <span>Z2: {day.zone2Seuil.toFixed(1)}km</span>
                          )}
                          {day.zone3SupraMax && day.zone3SupraMax > 0 && (
                            <span>Z3: {day.zone3SupraMax.toFixed(1)}km</span>
                          )}
                          {day.zoneVitesse && day.zoneVitesse > 0 && (
                            <span>V: {day.zoneVitesse.toFixed(1)}km</span>
                          )}
                        </div>
                        {day.notes && (
                          <p className="text-xs text-gray-500 mt-2 italic">{day.notes}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-3 mt-6">
                  <Button onClick={handleSave} className="flex-1">
                    Sauvegarder comme brouillon
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setGeneratedPlan(null)}
                    className="flex-1"
                  >
                    Régénérer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </>
  )
}

