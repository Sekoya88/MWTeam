'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Calendar, Plus, X, Save, Zap, ChevronDown } from 'lucide-react'
import { startOfWeek, addDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { SESSION_TEMPLATES, TEMPLATES_BY_CATEGORY, SessionTemplate } from '@/lib/session-templates'
import { calculateSessionZones } from '@/lib/session-calculator'
import { ZonesWarningDialog } from '@/components/ZonesWarningDialog'

interface Athlete {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface PlanDay {
  dayOfWeek: number
  date: string
  sessionDescription: string
  sessionType: string
  zone1Endurance: number
  zone2Seuil: number
  zone3SupraMax: number
  zoneVitesse: number
  totalVolume: number
  targetTimes: string
  notes: string
}

export default function NewPlanPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [objective, setObjective] = useState('')
  const [notes, setNotes] = useState('')
  const [days, setDays] = useState<PlanDay[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showTemplates, setShowTemplates] = useState<number | null>(null)
  const [showZonesWarning, setShowZonesWarning] = useState(false)
  const [selectedAthleteZones, setSelectedAthleteZones] = useState<any>(null)

  useEffect(() => {
    if (session?.user?.role === 'COACH' || session?.user?.role === 'ADMIN') {
      fetchAthletes()
      initializeDays()
    }
  }, [session, weekStart])

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

  const fetchAthletes = async () => {
    try {
      const res = await fetch('/api/coach/athletes')
      const data = await res.json()
      const athleteList = data.athletes || []
      setAthletes(athleteList)
      if (athleteList.length > 0 && !selectedAthlete) {
        setSelectedAthlete(athleteList[0].id)
        checkAthleteZones(athleteList[0].id, athleteList)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const initializeDays = () => {
    const start = startOfWeek(new Date(weekStart), { weekStartsOn: 1 })
    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    
    const newDays: PlanDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i)
      return {
        dayOfWeek: i,
        date: format(date, 'yyyy-MM-dd'),
        sessionDescription: '',
        sessionType: 'ENDURANCE',
        zone1Endurance: 0,
        zone2Seuil: 0,
        zone3SupraMax: 0,
        zoneVitesse: 0,
        totalVolume: 0,
        targetTimes: '',
        notes: '',
      }
    })
    setDays(newDays)
  }

  const updateDay = (index: number, field: keyof PlanDay, value: any) => {
    const newDays = [...days]
    newDays[index] = { ...newDays[index], [field]: value }
    
    // Calcul automatique si description ou type change
    if (field === 'sessionDescription' || field === 'sessionType') {
      const day = newDays[index]
      if (day.sessionDescription && day.sessionDescription.trim() !== '') {
        try {
          const calculated = calculateSessionZones(day.sessionDescription, day.sessionType || 'ENDURANCE')
          newDays[index] = {
            ...newDays[index],
            zone1Endurance: calculated.zone1Endurance,
            zone2Seuil: calculated.zone2Seuil,
            zone3SupraMax: calculated.zone3SupraMax,
            zoneVitesse: calculated.zoneVitesse,
            totalVolume: calculated.totalVolume,
          }
        } catch (err) {
          console.warn('Erreur calcul automatique:', err)
        }
      }
    }
    
    // Recalculer le volume total si zones changent manuellement
    if (['zone1Endurance', 'zone2Seuil', 'zone3SupraMax', 'zoneVitesse'].includes(field)) {
      const total = newDays[index].zone1Endurance + newDays[index].zone2Seuil + 
                    newDays[index].zone3SupraMax + newDays[index].zoneVitesse
      newDays[index].totalVolume = total
    }
    
    setDays(newDays)
  }

  const applyTemplate = (index: number, template: SessionTemplate) => {
    const newDays = [...days]
    newDays[index] = {
      ...newDays[index],
      sessionDescription: template.description,
      sessionType: template.sessionType,
      zone1Endurance: template.zone1Endurance,
      zone2Seuil: template.zone2Seuil,
      zone3SupraMax: template.zone3SupraMax,
      zoneVitesse: template.zoneVitesse,
      totalVolume: template.totalVolume,
      targetTimes: template.targetTimes || '',
      notes: template.notes || '',
    }
    setDays(newDays)
    setShowTemplates(null)
  }

  const clearDay = (index: number) => {
    const newDays = [...days]
    newDays[index] = {
      ...newDays[index],
      sessionDescription: '',
      sessionType: 'ENDURANCE',
      zone1Endurance: 0,
      zone2Seuil: 0,
      zone3SupraMax: 0,
      zoneVitesse: 0,
      totalVolume: 0,
      targetTimes: '',
      notes: '',
    }
    setDays(newDays)
  }

  const handleSave = async () => {
    if (!selectedAthlete) {
      setError('Veuillez sélectionner un athlète')
      return
    }

    setSaving(true)
    setError('')

    try {
      const start = startOfWeek(new Date(weekStart), { weekStartsOn: 1 })
      const weekEnd = addDays(start, 6)

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: selectedAthlete,
          weekStart: start.toISOString(),
          objective,
          notes,
          days: days.map((day, idx) => {
            const date = addDays(start, idx)
            return {
              dayOfWeek: day.dayOfWeek,
              date: date.toISOString(),
              sessionDescription: day.sessionDescription || null,
              sessionType: day.sessionType || null,
              zone1Endurance: day.zone1Endurance != null && day.zone1Endurance > 0 ? Number(day.zone1Endurance) : null,
              zone2Seuil: day.zone2Seuil != null && day.zone2Seuil > 0 ? Number(day.zone2Seuil) : null,
              zone3SupraMax: day.zone3SupraMax != null && day.zone3SupraMax > 0 ? Number(day.zone3SupraMax) : null,
              zoneVitesse: day.zoneVitesse != null && day.zoneVitesse > 0 ? Number(day.zoneVitesse) : null,
              totalVolume: day.totalVolume != null && day.totalVolume > 0 ? Number(day.totalVolume) : null,
              targetTimes: day.targetTimes || null,
              notes: day.notes || null,
            }
          }),
          status: 'DRAFT',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      router.push('/coach/plans')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
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
      <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
        <div>
          <h1 className="text-4xl font-bold text-black mb-2 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-gray-400" />
            Créer un Planning Manuellement
          </h1>
          <p className="text-gray-600">Créez un planning hebdomadaire jour par jour</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semaine (Lundi) *</label>
                <Input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectif</label>
                <Input
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Base, Résistance, Compétition..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                rows={3}
                placeholder="Notes générales pour cette semaine..."
              />
            </div>
          </CardContent>
        </Card>


        {/* Days */}
        <div className="space-y-4">
          {days.map((day, idx) => {
            const date = new Date(day.date)
            return (
              <Card key={idx} className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{dayNames[day.dayOfWeek]} {format(date, 'd MMM', { locale: fr })}</span>
                    <span className="text-sm font-normal text-gray-600">
                      Volume: {day.totalVolume.toFixed(1)} km
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Templates rapides */}
                  <div className="mb-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-600" />
                        Séances rapides (1 clic)
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTemplates(showTemplates === idx ? null : idx)}
                        className="text-xs hover:bg-yellow-100"
                      >
                        {showTemplates === idx ? 'Masquer' : 'Afficher'}
                        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showTemplates === idx ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>
                    
                    {showTemplates === idx && (
                      <div className="space-y-4 animate-fade-in">
                        {Object.entries(TEMPLATES_BY_CATEGORY).filter(([_, templates]) => templates.length > 0).map(([category, templates]) => (
                          <div key={category} className="bg-white/60 rounded-lg p-3 border border-yellow-200">
                            <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                              {category === 'endurance' ? '🏃 Endurance' :
                               category === 'seuil' ? '⚡ Seuils' :
                               category === 'vma' ? '🔥 VMA' :
                               category === 'fractionne' ? '💨 Fractionné' :
                               category === 'repos' ? '😴 Repos' : '🏆 Compétition'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {templates.map(template => (
                                <Button
                                  key={template.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => applyTemplate(idx, template)}
                                  className="text-xs h-8 hover:bg-yellow-100 hover:border-yellow-400 transition-all"
                                  title={`${template.description} - Vol: ${template.totalVolume}km`}
                                >
                                  {template.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-yellow-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearDay(idx)}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Effacer cette journée
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description de la séance
                      <span className="text-xs text-gray-500 ml-2">(Calcul automatique des zones)</span>
                    </label>
                    <Input
                      value={day.sessionDescription}
                      onChange={(e) => updateDay(idx, 'sessionDescription', e.target.value)}
                      placeholder="Ex: JOG 1H & MUSCU, VMA 8x1, TEMPO 10K..."
                      className="font-mono text-sm"
                    />
                    {day.sessionDescription && day.totalVolume > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Calculé automatiquement: {day.totalVolume.toFixed(1)}km total
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={day.sessionType}
                        onChange={(e) => updateDay(idx, 'sessionType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="ENDURANCE">Endurance</option>
                        <option value="FRACTIONNE">Fractionné</option>
                        <option value="SEUIL">Seuil</option>
                        <option value="VMA">VMA</option>
                        <option value="RECUPERATION">Récupération</option>
                        <option value="COMPETITION">Compétition</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chronos cibles</label>
                      <Input
                        value={day.targetTimes}
                        onChange={(e) => updateDay(idx, 'targetTimes', e.target.value)}
                        placeholder="Ex: 1'06-1'04-1'05"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Z1 (Endurance) km</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={day.zone1Endurance || ''}
                        onChange={(e) => updateDay(idx, 'zone1Endurance', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Z2 (Seuils) km</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={day.zone2Seuil || ''}
                        onChange={(e) => updateDay(idx, 'zone2Seuil', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Z3 (Supra-max) km</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={day.zone3SupraMax || ''}
                        onChange={(e) => updateDay(idx, 'zone3SupraMax', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">V (Vitesse) km</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={day.zoneVitesse || ''}
                        onChange={(e) => updateDay(idx, 'zoneVitesse', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <Input
                      value={day.notes}
                      onChange={(e) => updateDay(idx, 'notes', e.target.value)}
                      placeholder="Notes spécifiques pour ce jour..."
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {error && (
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-4 text-red-800">
              {error}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving || !selectedAthlete} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder comme brouillon'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/coach/plans')}>
            Annuler
          </Button>
        </div>
      </div>
    </Layout>
    </>
  )
}

