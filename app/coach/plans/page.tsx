'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { Calendar, Plus, Sparkles, Trash2, Eye } from 'lucide-react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PlanDay {
  id?: string
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
    id: string
    firstName: string
    lastName: string
    email: string
  }
  weekStart: string
  weekEnd: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  objective?: string
  notes?: string
  days: PlanDay[]
}

export default function CoachPlansPage() {
  const { data: session } = useSession()
  const [plans, setPlans] = useState<WeeklyPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role === 'COACH' || session?.user?.role === 'ADMIN') {
      fetchPlans()
    }
  }, [session])

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans')
      const data = await res.json()
      setPlans(data.plans || [])
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) return

    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchPlans()
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la suppression')
    }
  }

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/plans/${id}/publish`, { method: 'POST' })
      if (res.ok) {
        fetchPlans()
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la publication')
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

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Plannings Hebdomadaires</h1>
            <p className="text-gray-600">Gérez les plannings de vos athlètes</p>
          </div>
          <div className="flex gap-3">
            <Link href="/coach/plans/generate">
              <Button className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Sparkles className="h-4 w-4" />
                <span>Générer avec IA</span>
              </Button>
            </Link>
            <Link href="/coach/plans/new">
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Créer manuellement</span>
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : plans.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Aucun planning</h3>
              <p className="text-gray-600">Créez votre premier planning hebdomadaire.</p>
              <div className="flex gap-3 justify-center">
                <Link href="/coach/plans/generate">
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Générer avec IA</span>
                  </Button>
                </Link>
                <Link href="/coach/plans/new">
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Créer manuellement</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => (
              <Card key={plan.id} className="hover:shadow-medium transition-shadow hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        {plan.athlete.firstName} {plan.athlete.lastName}
                      </CardTitle>
                      <CardDescription>
                        Semaine du {format(new Date(plan.weekStart), 'd MMMM yyyy', { locale: fr })} au {format(new Date(plan.weekEnd), 'd MMMM yyyy', { locale: fr })}
                      </CardDescription>
                      {plan.objective && (
                        <p className="text-sm text-gray-600 mt-1">Objectif: {plan.objective}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        plan.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                        plan.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.status === 'PUBLISHED' ? 'Publié' : plan.status === 'DRAFT' ? 'Brouillon' : 'Archivé'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {plan.days.map((day, idx) => (
                      <div key={idx} className="p-2 border border-gray-200 rounded-lg text-center">
                        <div className="text-xs font-medium text-gray-600 mb-1">
                          {['L', 'M', 'M', 'J', 'V', 'S', 'D'][day.dayOfWeek]}
                        </div>
                        {day.totalVolume ? (
                          <div className="text-sm font-bold text-black">{day.totalVolume.toFixed(1)}km</div>
                        ) : (
                          <div className="text-xs text-gray-400">-</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/coach/plans/${plan.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>Voir/Modifier</span>
                      </Button>
                    </Link>
                    {plan.status === 'DRAFT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePublish(plan.id)}
                        className="flex items-center space-x-1"
                      >
                        <span>Publier</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Supprimer</span>
                    </Button>
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

