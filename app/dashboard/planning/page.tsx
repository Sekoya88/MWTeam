'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, Clock, TrendingUp, History, CheckCircle, XCircle } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
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
  weekStart: string
  weekEnd: string
  objective?: string
  notes?: string
  days: PlanDay[]
  coach: {
    firstName: string
    lastName: string
  }
}

interface TrainingSession {
  id: string
  date: string
  status: string
  distance?: number
}

export default function PlanningPage() {
  const { data: session } = useSession()
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null)
  const [history, setHistory] = useState<WeeklyPlan[]>([])
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (session) {
      fetchCurrentPlan()
      fetchHistory()
      fetchSessions()
    }
  }, [session])

  const fetchCurrentPlan = async () => {
    try {
      const res = await fetch('/api/plans/current')
      const data = await res.json()
      setCurrentPlan(data.plan)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/plans/history?limit=10')
      const data = await res.json()
      setHistory(data.plans || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      const res = await fetch(`/api/sessions?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`)
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error(err)
    }
  }

  const getDayStatus = (dayDate: string) => {
    const day = new Date(dayDate)
    const today = new Date()
    const isPast = day < today
    const isToday = isSameDay(day, today)
    const session = sessions.find(s => isSameDay(new Date(s.date), day))
    
    if (session && session.status === 'REALISEE') {
      return { status: 'completed', icon: CheckCircle, color: 'text-green-600' }
    } else if (session && session.status === 'PREVUE') {
      return { status: 'planned', icon: Clock, color: 'text-blue-600' }
    } else if (isPast) {
      return { status: 'missed', icon: XCircle, color: 'text-red-600' }
    } else {
      return { status: 'upcoming', icon: Clock, color: 'text-gray-400' }
    }
  }

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'zone1Endurance': return 'bg-blue-100 text-blue-800'
      case 'zone2Seuil': return 'bg-yellow-100 text-yellow-800'
      case 'zone3SupraMax': return 'bg-orange-100 text-orange-800'
      case 'zoneVitesse': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!session) {
    return <Layout>Chargement...</Layout>
  }

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-gray-400" />
              Planning Hebdomadaire
            </h1>
            <p className="text-gray-600">Votre planning de la semaine en cours</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center space-x-2"
            >
              <History className="h-4 w-4" />
              <span>{showHistory ? 'Planning actuel' : 'Historique'}</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : showHistory ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-black">Historique des plannings</h2>
            {history.length === 0 ? (
              <Card className="py-16">
                <CardContent className="text-center">
                  <p className="text-gray-600">Aucun planning dans l'historique</p>
                </CardContent>
              </Card>
            ) : (
              history.map(plan => (
                <Card key={plan.id} className="hover:shadow-medium transition-shadow">
                  <CardHeader>
                    <CardTitle>
                      Semaine du {format(new Date(plan.weekStart), 'd MMMM yyyy', { locale: fr })} au {format(new Date(plan.weekEnd), 'd MMMM yyyy', { locale: fr })}
                    </CardTitle>
                    {plan.objective && (
                      <CardDescription>Objectif: {plan.objective}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {plan.days.map((day, idx) => {
                        const dayStatus = getDayStatus(day.date)
                        return (
                          <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                            <div className="text-xs font-medium text-gray-600 mb-2">
                              {dayNames[day.dayOfWeek]}
                            </div>
                            {day.totalVolume ? (
                              <>
                                <div className="text-sm font-bold text-black mb-1">{day.totalVolume.toFixed(1)}km</div>
                                <div className="text-xs text-gray-600 line-clamp-2">{day.sessionDescription}</div>
                              </>
                            ) : (
                              <div className="text-xs text-gray-400">-</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : !currentPlan ? (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Aucun planning assigné</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Votre coach n'a pas encore créé de planning pour cette semaine.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-2 border-black/10 hover-lift">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      Semaine du {format(new Date(currentPlan.weekStart), 'd MMMM yyyy', { locale: fr })} au {format(new Date(currentPlan.weekEnd), 'd MMMM yyyy', { locale: fr })}
                    </CardTitle>
                    {currentPlan.objective && (
                      <CardDescription className="mt-1">Objectif: {currentPlan.objective}</CardDescription>
                    )}
                    <CardDescription>
                      Planning créé par {currentPlan.coach.firstName} {currentPlan.coach.lastName}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {currentPlan.days.map((day, idx) => {
                    const dayDate = new Date(day.date)
                    const dayStatus = getDayStatus(day.date)
                    const StatusIcon = dayStatus.icon
                    const isToday = isSameDay(dayDate, new Date())
                    
                    return (
                      <div
                        key={idx}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          isToday
                            ? 'border-black bg-black/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-sm font-semibold text-black">
                              {dayNames[day.dayOfWeek]}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(dayDate, 'd MMM', { locale: fr })}
                            </div>
                          </div>
                          <StatusIcon className={`h-5 w-5 ${dayStatus.color}`} />
                        </div>

                        {day.totalVolume ? (
                          <>
                            <div className="mb-2">
                              <div className="text-lg font-bold text-black mb-1">
                                {day.totalVolume.toFixed(1)} km
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-2">
                                {day.sessionDescription || 'Séance prévue'}
                              </p>
                            </div>

                            <div className="space-y-1 mb-3">
                              {day.zone1Endurance && day.zone1Endurance > 0 && (
                                <div className={`text-xs px-2 py-1 rounded ${getZoneColor('zone1Endurance')}`}>
                                  Z1: {day.zone1Endurance.toFixed(1)}km
                                </div>
                              )}
                              {day.zone2Seuil && day.zone2Seuil > 0 && (
                                <div className={`text-xs px-2 py-1 rounded ${getZoneColor('zone2Seuil')}`}>
                                  Z2: {day.zone2Seuil.toFixed(1)}km
                                </div>
                              )}
                              {day.zone3SupraMax && day.zone3SupraMax > 0 && (
                                <div className={`text-xs px-2 py-1 rounded ${getZoneColor('zone3SupraMax')}`}>
                                  Z3: {day.zone3SupraMax.toFixed(1)}km
                                </div>
                              )}
                              {day.zoneVitesse && day.zoneVitesse > 0 && (
                                <div className={`text-xs px-2 py-1 rounded ${getZoneColor('zoneVitesse')}`}>
                                  V: {day.zoneVitesse.toFixed(1)}km
                                </div>
                              )}
                            </div>

                            {day.targetTimes && (
                              <div className="text-xs text-gray-600 mb-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {day.targetTimes}
                              </div>
                            )}

                            {day.notes && (
                              <p className="text-xs text-gray-500 italic">{day.notes}</p>
                            )}

                            <Link href={`/sessions/new?date=${day.date}`}>
                              <Button variant="outline" size="sm" className="w-full mt-3">
                                Ajouter séance
                              </Button>
                            </Link>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400 text-center py-4">
                            Jour de repos
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {currentPlan.notes && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Notes du coach:</span> {currentPlan.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistiques de réalisation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Taux de réalisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Séances réalisées cette semaine:</span>
                  <span className="text-2xl font-bold text-black">
                    {sessions.filter(s => s.status === 'REALISEE').length} / {currentPlan.days.filter(d => d.totalVolume).length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  )
}

