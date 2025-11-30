'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { formatDuration } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { TrendingUp, Activity, AlertTriangle, Calendar, Plus, BarChart3 } from 'lucide-react'

interface Statistics {
  ctl: number
  atl: number
  acwr: number
  overtraining: boolean
  weeklyVolume: {
    distance: number
    duration: number
    trimp: number
  }
  monthlyVolume: {
    distance: number
    duration: number
    trimp: number
  }
  totalSessions: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetch('/api/statistics')
        .then(res => res.json())
        .then(data => {
          setStats(data)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [session])

  if (!session) {
    return <Layout>Chargement...</Layout>
  }

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Tableau de bord</h1>
            <p className="text-gray-600">Bienvenue, {session.user.email?.split('@')[0]}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/sessions/new">
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Nouvelle séance</span>
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : stats ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-medium transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Charge Chronique</CardTitle>
                  <Activity className="h-5 w-5 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">{Math.round(stats.ctl)}</div>
                  <p className="text-xs text-gray-500 mt-1">Moyenne sur 42 jours</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-medium transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Charge Aiguë</CardTitle>
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">{Math.round(stats.atl)}</div>
                  <p className="text-xs text-gray-500 mt-1">Moyenne sur 7 jours</p>
                </CardContent>
              </Card>

              <Card className={`hover:shadow-medium transition-shadow ${stats.overtraining ? 'border-red-300 bg-red-50/50' : ''}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Ratio ACWR</CardTitle>
                  <AlertTriangle className={`h-5 w-5 ${stats.overtraining ? 'text-red-500' : 'text-gray-400'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${stats.overtraining ? 'text-red-600' : 'text-black'}`}>
                    {stats.acwr.toFixed(2)}
                  </div>
                  {stats.overtraining ? (
                    <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Risque de surentraînement</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Ratio optimal</p>
                  )}
                </CardContent>
              </Card>

              <Card className="hover:shadow-medium transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Séances totales</CardTitle>
                  <Calendar className="h-5 w-5 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">{stats.totalSessions}</div>
                  <p className="text-xs text-gray-500 mt-1">Toutes séances confondues</p>
                </CardContent>
              </Card>
            </div>

            {/* Volume Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="hover:shadow-medium transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Volume Hebdomadaire</span>
                  </CardTitle>
                  <CardDescription>Semaine en cours</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-bold text-lg text-black">{stats.weeklyVolume.distance.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Durée:</span>
                    <span className="font-bold text-lg text-black">{formatDuration(stats.weeklyVolume.duration)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">TRIMP:</span>
                    <span className="font-bold text-lg text-black">{Math.round(stats.weeklyVolume.trimp)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-medium transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Volume Mensuel</span>
                  </CardTitle>
                  <CardDescription>Mois en cours</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-bold text-lg text-black">{stats.monthlyVolume.distance.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Durée:</span>
                    <span className="font-bold text-lg text-black">{formatDuration(stats.monthlyVolume.duration)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">TRIMP:</span>
                    <span className="font-bold text-lg text-black">{Math.round(stats.monthlyVolume.trimp)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
              <Link href="/statistics">
                <Button variant="outline" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Statistiques détaillées</span>
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Aucune donnée disponible</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Commencez votre suivi d'entraînement en ajoutant votre première séance.
              </p>
              <Link href="/sessions/new">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une séance
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
