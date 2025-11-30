'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { Users, AlertTriangle, TrendingUp, Activity } from 'lucide-react'

interface Athlete {
  id: string
  email: string
  firstName: string
  lastName: string
  statistics?: {
    ctl: number
    atl: number
    acwr: number
    overtraining: boolean
    totalSessions: number
  }
}

export default function CoachDashboardPage() {
  const { data: session } = useSession()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role === 'COACH' || session?.user?.role === 'ADMIN') {
      fetch('/api/coach/athletes')
        .then(res => res.json())
        .then(data => {
          setAthletes(data.athletes || [])
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [session])

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

  const athletesWithAlerts = athletes.filter(a => a.statistics?.overtraining)
  const totalSessions = athletes.reduce((sum, a) => sum + (a.statistics?.totalSessions || 0), 0)

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-black mb-2">Dashboard Coach</h1>
          <p className="text-gray-600">Vue d'ensemble de vos athlètes</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Athlètes</CardTitle>
              <Users className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">{athletes.length}</div>
              <p className="text-xs text-gray-500 mt-1">Total</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Alertes</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{athletesWithAlerts.length}</div>
              <p className="text-xs text-gray-500 mt-1">Surentraînement</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Séances</CardTitle>
              <Activity className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">{totalSessions}</div>
              <p className="text-xs text-gray-500 mt-1">Total toutes séances</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : athletes.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Aucun athlète assigné</h3>
              <p className="text-gray-600">Les athlètes apparaîtront ici une fois qu'ils auront créé un compte.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.map(athlete => (
              <Card key={athlete.id} className="hover:shadow-medium transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{athlete.firstName} {athlete.lastName}</span>
                    {athlete.statistics?.overtraining && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </CardTitle>
                  <CardDescription>{athlete.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  {athlete.statistics ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-gray-50">
                          <p className="text-xs text-gray-600 mb-1">CTL</p>
                          <p className="text-lg font-bold text-black">{Math.round(athlete.statistics.ctl)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50">
                          <p className="text-xs text-gray-600 mb-1">ATL</p>
                          <p className="text-lg font-bold text-black">{Math.round(athlete.statistics.atl)}</p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${athlete.statistics.overtraining ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">ACWR</span>
                          <span className={`text-lg font-bold ${athlete.statistics.overtraining ? 'text-red-600' : 'text-black'}`}>
                            {athlete.statistics.acwr.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-600">Séances:</span>
                        <span className="font-semibold text-black">{athlete.statistics.totalSessions}</span>
                      </div>
                      {athlete.statistics.overtraining && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                          <p className="text-xs font-medium text-red-800 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Risque de surentraînement
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
                  )}
                  <div className="mt-4">
                    <Link href={`/coach/athletes/${athlete.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Voir le détail
                      </Button>
                    </Link>
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
