'use client'

import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDuration, formatPace } from '@/lib/utils'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, Calendar, MapPin, Activity, Zap } from 'lucide-react'

interface TrainingSession {
  id: string
  type: string
  status: string
  date: string
  duration: number
  distance: number | null
  rpe: number
  zones: string[]
  notes: string | null
  location: string | null
  weather: string | null
  isKeySession: boolean
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  FRACTIONNE: 'Fractionné',
  ENDURANCE: 'Endurance',
  RECUPERATION: 'Récupération',
  COMPETITION: 'Compétition',
  SEUIL: 'Seuil',
  VMA: 'VMA',
  AUTRE: 'Autre',
}

const STATUS_LABELS: Record<string, string> = {
  PREVUE: 'Prévue',
  REALISEE: 'Réalisée',
  ANNULEE: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  PREVUE: 'bg-blue-100 text-blue-800 border-blue-200',
  REALISEE: 'bg-green-100 text-green-800 border-green-200',
  ANNULEE: 'bg-gray-100 text-gray-800 border-gray-200',
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) return

    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== id))
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Mes séances</h1>
            <p className="text-gray-600">Historique de vos entraînements</p>
          </div>
          <Link href="/sessions/new">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Nouvelle séance</span>
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : sessions.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Aucune séance enregistrée</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Commencez à suivre vos entraînements en ajoutant votre première séance.
              </p>
              <Link href="/sessions/new">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une séance
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <Card key={session.id} className="hover:shadow-medium transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-xl font-bold text-black">
                              {SESSION_TYPE_LABELS[session.type] || session.type}
                            </h3>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[session.status] || STATUS_COLORS.ANNULEE}`}>
                              {STATUS_LABELS[session.status] || session.status}
                            </span>
                            {session.isKeySession && (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Séance clé
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(session.date), 'PPP')} à {format(new Date(session.date), 'HH:mm')}</span>
                            </div>
                            {session.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                <span>{session.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-gray-50">
                          <p className="text-xs text-gray-600 mb-1">Durée</p>
                          <p className="text-lg font-bold text-black">{formatDuration(session.duration)}</p>
                        </div>
                        {session.distance && (
                          <div className="p-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-gray-600 mb-1">Distance</p>
                            <p className="text-lg font-bold text-black">{session.distance.toFixed(1)} km</p>
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-gray-50">
                          <p className="text-xs text-gray-600 mb-1">RPE</p>
                          <p className="text-lg font-bold text-black">{session.rpe}/10</p>
                        </div>
                        {session.distance && session.duration && (
                          <div className="p-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-gray-600 mb-1">Allure</p>
                            <p className="text-lg font-bold text-black">
                              {formatPace((session.duration / 60) / session.distance)}
                            </p>
                          </div>
                        )}
                      </div>

                      {session.zones.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm font-medium text-gray-700">Zones:</span>
                          {session.zones.map((zone, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 text-xs font-medium rounded-full bg-black text-white"
                            >
                              {zone.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {session.notes && (
                        <div className="p-4 rounded-lg bg-gray-50 border-l-4 border-black">
                          <p className="text-sm text-gray-700 italic">{session.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 lg:flex-col">
                      <Link href={`/sessions/${session.id}/edit`}>
                        <Button variant="outline" size="sm" className="flex items-center space-x-2 w-full lg:w-auto">
                          <Edit className="h-4 w-4" />
                          <span>Modifier</span>
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(session.id)}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:border-red-300 w-full lg:w-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Supprimer</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
