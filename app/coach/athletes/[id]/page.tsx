'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, User, AlertTriangle, CheckCircle, Activity, TrendingUp, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatPace } from '@/lib/time-format'

interface WorkZoneConfig {
  id: string
  vma?: number
  sv1?: number
  sv2?: number
  seuil?: number
  as10?: number
  as5?: number
  as21?: number
  allureMarathon?: number
}

interface Athlete {
  id: string
  email: string
  firstName: string
  lastName: string
  zones: WorkZoneConfig[]
  indicators: any[]
  performances: any[]
  sessions: any[]
  plansAsAthlete: any[]
}

export default function AthleteDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role === 'COACH' || session?.user?.role === 'ADMIN') {
      fetchAthlete()
    }
  }, [session, params.id])

  const fetchAthlete = async () => {
    try {
      const res = await fetch(`/api/coach/athletes/${params.id}`)
      if (!res.ok) {
        throw new Error('Athlète non trouvé')
      }
      const data = await res.json()
      setAthlete(data.athlete)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </Layout>
    )
  }

  if (!athlete) {
    return (
      <Layout>
        <Card className="py-16">
          <CardContent className="text-center">
            <p className="text-gray-600">Athlète non trouvé</p>
            <Link href="/coach/athletes">
              <Button className="mt-4">Retour à la liste</Button>
            </Link>
          </CardContent>
        </Card>
      </Layout>
    )
  }

  const latestZones = athlete.zones[0] || {}
  const hasZones = !!(latestZones.vma || latestZones.sv1 || latestZones.sv2)
  const missingZones = []
  if (!latestZones.vma) missingZones.push('VMA')
  if (!latestZones.sv1) missingZones.push('SV1')
  if (!latestZones.sv2) missingZones.push('SV2')

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/coach/athletes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-black mb-2 flex items-center gap-3">
                <User className="h-8 w-8 text-gray-400" />
                {athlete.firstName} {athlete.lastName}
              </h1>
              <p className="text-gray-600">{athlete.email}</p>
            </div>
          </div>
        </div>

        {/* Alerte zones manquantes */}
        {!hasZones && (
          <Card className="border-2 border-yellow-300 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900">Zones d'allures manquantes</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    Cet athlète n'a pas enregistré ses zones de seuil (SV1, SV2) et VMA. 
                    Ces informations sont nécessaires pour créer des plannings cohérents.
                  </p>
                  <Link href={`/zones?athleteId=${athlete.id}`}>
                    <Button size="sm" className="mt-3">
                      Configurer les zones
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zones d'allures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Zones d'Allures
            </CardTitle>
            <CardDescription>Configuration des seuils et VMA de l'athlète</CardDescription>
          </CardHeader>
          <CardContent>
            {hasZones ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {latestZones.vma && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">VMA</p>
                    <p className="text-2xl font-bold text-blue-700">{latestZones.vma.toFixed(1)} km/h</p>
                  </div>
                )}
                {latestZones.sv1 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-900">SV1 (Seuil Aérobie)</p>
                    <p className="text-2xl font-bold text-green-700">{formatPace(latestZones.sv1)} min/km</p>
                  </div>
                )}
                {latestZones.sv2 && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-900">SV2 (Seuil Anaérobie)</p>
                    <p className="text-2xl font-bold text-orange-700">{formatPace(latestZones.sv2)} min/km</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Aucune zone d'allure configurée</p>
                <Link href={`/zones?athleteId=${athlete.id}`}>
                  <Button>Configurer les zones</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Séances</p>
                  <p className="text-3xl font-bold text-black">{athlete.sessions.length}</p>
                </div>
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Performances</p>
                  <p className="text-3xl font-bold text-black">{athlete.performances.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Plannings</p>
                  <p className="text-3xl font-bold text-black">{athlete.plansAsAthlete.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Link href={`/coach/plans/new?athleteId=${athlete.id}`}>
              <Button>Créer un planning</Button>
            </Link>
            <Link href={`/coach/plans/generate?athleteId=${athlete.id}`}>
              <Button variant="outline">Générer avec IA</Button>
            </Link>
            <Link href={`/zones?athleteId=${athlete.id}`}>
              <Button variant="outline">Configurer zones</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

