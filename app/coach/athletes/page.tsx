'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Users, UserPlus, Search, X, Check } from 'lucide-react'
import Link from 'next/link'

interface Athlete {
  id: string
  email: string
  firstName: string
  lastName: string
  coachId?: string
}

export default function ManageAthletesPage() {
  const { data: session } = useSession()
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([])
  const [myAthletes, setMyAthletes] = useState<Athlete[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role === 'COACH' || session?.user?.role === 'ADMIN') {
      fetchAthletes()
    }
  }, [session])

  const fetchAthletes = async () => {
    try {
      const res = await fetch('/api/coach/athletes')
      const data = await res.json()
      const athletes = data.athletes || []
      
      // Séparer mes athlètes des autres
      const my = athletes.filter((a: Athlete) => a.coachId === session?.user?.id)
      const others = athletes.filter((a: Athlete) => !a.coachId || a.coachId !== session?.user?.id)
      
      setMyAthletes(my)
      setAllAthletes(others)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleAssign = async (athleteId: string) => {
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/assign`, {
        method: 'POST',
      })
      
      if (res.ok) {
        fetchAthletes()
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors de l\'assignation')
    }
  }

  const handleUnassign = async (athleteId: string) => {
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/unassign`, {
        method: 'POST',
      })
      
      if (res.ok) {
        fetchAthletes()
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la désassignation')
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

  const filteredAthletes = allAthletes.filter(a =>
    `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-black mb-2 flex items-center gap-3">
            <Users className="h-8 w-8 text-gray-400" />
            Gérer mes Athlètes
          </h1>
          <p className="text-gray-600">Assignez des athlètes à votre équipe pour créer leurs plannings</p>
        </div>

        {/* Mes Athlètes */}
        <Card className="border-2 border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Mes Athlètes ({myAthletes.length})
            </CardTitle>
            <CardDescription>Athlètes assignés à votre équipe</CardDescription>
          </CardHeader>
          <CardContent>
            {myAthletes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun athlète assigné pour le moment</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myAthletes.map(athlete => (
                  <div key={athlete.id} className="p-4 bg-white rounded-lg border border-green-200 flex items-center justify-between hover:border-green-300 hover:shadow-md transition-all">
                    <Link href={`/coach/athletes/${athlete.id}`} className="flex-1">
                      <p className="font-semibold text-black">{athlete.firstName} {athlete.lastName}</p>
                      <p className="text-sm text-gray-600">{athlete.email}</p>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnassign(athlete.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tous les Athlètes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-gray-400" />
              Tous les Athlètes
            </CardTitle>
            <CardDescription>Assignez des athlètes à votre équipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher un athlète..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              </div>
            ) : filteredAthletes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {searchTerm ? 'Aucun athlète trouvé' : 'Aucun athlète disponible'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAthletes.map(athlete => (
                  <div key={athlete.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between hover:border-gray-300 transition-colors">
                    <div>
                      <p className="font-semibold text-black">{athlete.firstName} {athlete.lastName}</p>
                      <p className="text-sm text-gray-600">{athlete.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAssign(athlete.id)}
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Assigner</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

