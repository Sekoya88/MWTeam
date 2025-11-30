'use client'

import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react'

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
  zoneDistribution: Record<string, number>
  averagePace: number | null
  totalSessions: number
}

const COLORS = ['#000000', '#4A4A4A', '#808080', '#B0B0B0', '#D0D0D0']

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </Layout>
    )
  }

  if (!stats) {
    return (
      <Layout>
        <Card className="py-16">
          <CardContent className="text-center text-gray-600">
            Aucune donnée disponible
          </CardContent>
        </Card>
      </Layout>
    )
  }

  const zoneData = Object.entries(stats.zoneDistribution).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value: Math.round(value),
  }))

  const weeklyData = [
    { name: 'Distance', value: stats.weeklyVolume.distance.toFixed(1), unit: 'km' },
    { name: 'Durée', value: (stats.weeklyVolume.duration / 60).toFixed(1), unit: 'h' },
    { name: 'TRIMP', value: Math.round(stats.weeklyVolume.trimp), unit: '' },
  ]

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-black mb-2">Statistiques détaillées</h1>
          <p className="text-gray-600">Analyse approfondie de vos performances</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Charge d'entraînement</span>
              </CardTitle>
              <CardDescription>CTL, ATL et ratio ACWR</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-lg bg-gray-50">
                  <span className="text-gray-600 font-medium">CTL (42j):</span>
                  <span className="text-2xl font-bold text-black">{Math.round(stats.ctl)}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-lg bg-gray-50">
                  <span className="text-gray-600 font-medium">ATL (7j):</span>
                  <span className="text-2xl font-bold text-black">{Math.round(stats.atl)}</span>
                </div>
                <div className={`flex justify-between items-center p-4 rounded-lg ${stats.overtraining ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
                  <span className="text-gray-600 font-medium">ACWR:</span>
                  <span className={`text-2xl font-bold ${stats.overtraining ? 'text-red-600' : 'text-black'}`}>
                    {stats.acwr.toFixed(2)}
                  </span>
                </div>
                {stats.overtraining && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertTriangle className="h-5 w-5" />
                      <p className="text-sm font-semibold">
                        Attention: Ratio ACWR élevé, risque de surentraînement
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Volume hebdomadaire</span>
              </CardTitle>
              <CardDescription>Comparaison des métriques</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name: string, props: any) => [
                      `${value} ${props.payload.unit}`,
                      name,
                    ]}
                  />
                  <Bar dataKey="value" fill="#000000" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {zoneData.length > 0 && (
            <Card className="hover:shadow-medium transition-shadow">
              <CardHeader>
                <CardTitle>Répartition par zones</CardTitle>
                <CardDescription>Distribution du temps d'entraînement</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={zoneData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {zoneData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
              <CardDescription>Vue d'ensemble</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Séances totales:</span>
                <span className="font-bold text-lg text-black">{stats.totalSessions}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Volume mensuel (distance):</span>
                <span className="font-bold text-lg text-black">{stats.monthlyVolume.distance.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Volume mensuel (durée):</span>
                <span className="font-bold text-lg text-black">{(stats.monthlyVolume.duration / 60).toFixed(1)} h</span>
              </div>
              {stats.averagePace && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Allure moyenne:</span>
                  <span className="font-bold text-lg text-black">
                    {Math.floor(stats.averagePace)}'{(Math.round((stats.averagePace % 1) * 60)).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
