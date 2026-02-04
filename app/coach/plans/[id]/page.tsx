'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Calendar, Save, Eye, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

interface PlanDay {
  id: string
  dayOfWeek: number
  date: string
  sessionDescription?: string
  sessionType?: string
  zone1Endurance?: number
  zone2Seuil?: number
  zone3SupraMax?: number
  zoneVitesse?: number
  totalVolume?: number
  targetTimes?: string
  notes?: string
}

interface WeeklyPlan {
  id: string
  athleteId: string
  athlete: {
    firstName: string
    lastName: string
    email: string
  }
  weekStart: string
  weekEnd: string
  status: string
  objective?: string
  notes?: string
  days: PlanDay[]
}

export default function ViewPlanPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editedPlan, setEditedPlan] = useState<WeeklyPlan | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session && params.id) {
      fetchPlan()
    }
  }, [session, params.id])

  const fetchPlan = async () => {
    try {
      const res = await fetch(`/api/plans/${params.id}`)
      const data = await res.json()
      setPlan(data.plan)
      setEditedPlan(data.plan)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editedPlan) return

    setSaving(true)
    try {
      const res = await fetch(`/api/plans/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: editedPlan.objective,
          notes: editedPlan.notes,
          days: editedPlan.days.map(day => ({
            id: day.id,
            dayOfWeek: day.dayOfWeek,
            date: day.date,
            sessionDescription: day.sessionDescription,
            sessionType: day.sessionType,
            zone1Endurance: day.zone1Endurance,
            zone2Seuil: day.zone2Seuil,
            zone3SupraMax: day.zone3SupraMax,
            zoneVitesse: day.zoneVitesse,
            totalVolume: day.totalVolume,
            targetTimes: day.targetTimes,
            notes: day.notes,
          })),
        }),
      })

      if (res.ok) {
        setEditing(false)
        fetchPlan()
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const updateDay = (index: number, field: keyof PlanDay, value: any) => {
    if (!editedPlan) return
    const newDays = [...editedPlan.days]
    newDays[index] = { ...newDays[index], [field]: value }
    
    if (['zone1Endurance', 'zone2Seuil', 'zone3SupraMax', 'zoneVitesse'].includes(field)) {
      const total = (newDays[index].zone1Endurance || 0) + (newDays[index].zone2Seuil || 0) + 
                    (newDays[index].zone3SupraMax || 0) + (newDays[index].zoneVitesse || 0)
      newDays[index].totalVolume = total
    }
    
    setEditedPlan({ ...editedPlan, days: newDays })
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </Layout>
    )
  }

  if (!plan) {
    return (
      <Layout>
        <Card className="py-16">
          <CardContent className="text-center">
            <p className="text-gray-600">Planning non trouvé</p>
          </CardContent>
        </Card>
      </Layout>
    )
  }

  const currentPlan = editing ? editedPlan : plan
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-gray-400" />
              Planning de {plan.athlete.firstName} {plan.athlete.lastName}
            </h1>
            <p className="text-gray-600">
              Semaine du {format(new Date(plan.weekStart), 'd MMMM yyyy', { locale: fr })} au {format(new Date(plan.weekEnd), 'd MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <div className="flex gap-3">
            {!editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(true)} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Modifier
                </Button>
                <Link href="/coach/plans">
                  <Button variant="outline">Retour</Button>
                </Link>
              </>
            ) : (
              <>
                <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                <Button variant="outline" onClick={() => { setEditing(false); setEditedPlan(plan) }}>
                  Annuler
                </Button>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>{plan.athlete.email}</CardDescription>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                plan.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                plan.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {plan.status === 'PUBLISHED' ? 'Publié' : plan.status === 'DRAFT' ? 'Brouillon' : 'Archivé'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objectif</label>
                  <Input
                    value={editedPlan?.objective || ''}
                    onChange={(e) => setEditedPlan({ ...editedPlan!, objective: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editedPlan?.notes || ''}
                    onChange={(e) => setEditedPlan({ ...editedPlan!, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                {plan.objective && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Objectif: </span>
                    <span className="text-sm text-gray-900">{plan.objective}</span>
                  </div>
                )}
                {plan.notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Notes: </span>
                    <span className="text-sm text-gray-900">{plan.notes}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {currentPlan?.days.map((day, idx) => {
            const date = new Date(day.date)
            return (
              <Card key={day.id || idx} className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{dayNames[day.dayOfWeek]} {format(date, 'd MMM', { locale: fr })}</span>
                    {day.totalVolume && (
                      <span className="text-sm font-normal text-gray-600">
                        Volume: {day.totalVolume.toFixed(1)} km
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <Input
                          value={day.sessionDescription || ''}
                          onChange={(e) => updateDay(idx, 'sessionDescription', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Z1 km</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={day.zone1Endurance || ''}
                            onChange={(e) => updateDay(idx, 'zone1Endurance', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Z2 km</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={day.zone2Seuil || ''}
                            onChange={(e) => updateDay(idx, 'zone2Seuil', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Z3 km</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={day.zone3SupraMax || ''}
                            onChange={(e) => updateDay(idx, 'zone3SupraMax', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">V km</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={day.zoneVitesse || ''}
                            onChange={(e) => updateDay(idx, 'zoneVitesse', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <Input
                          value={day.notes || ''}
                          onChange={(e) => updateDay(idx, 'notes', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {day.sessionDescription && (
                        <p className="text-gray-900 font-medium">{day.sessionDescription}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-600">
                        {day.zone1Endurance && day.zone1Endurance > 0 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Z1: {day.zone1Endurance.toFixed(1)}km</span>
                        )}
                        {day.zone2Seuil && day.zone2Seuil > 0 && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Z2: {day.zone2Seuil.toFixed(1)}km</span>
                        )}
                        {day.zone3SupraMax && day.zone3SupraMax > 0 && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Z3: {day.zone3SupraMax.toFixed(1)}km</span>
                        )}
                        {day.zoneVitesse && day.zoneVitesse > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded">V: {day.zoneVitesse.toFixed(1)}km</span>
                        )}
                      </div>
                      {day.notes && (
                        <p className="text-sm text-gray-500 italic">{day.notes}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}

