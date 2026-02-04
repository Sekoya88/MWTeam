'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Users, UserCheck, UserX, Shield, Activity, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: string
  coachId?: string
  _count?: {
    sessions: number
  }
}

interface Stats {
  totalUsers: number
  athletes: number
  coaches: number
  admins: number
  totalSessions: number
  totalPlans: number
}

export default function AdminPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers()
      fetchStats()
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users || [])
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchUsers()
        fetchStats()
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la suppression')
    }
  }

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <Layout>
        <Card className="py-16">
          <CardContent className="text-center">
            <p className="text-gray-600">Accès réservé aux administrateurs</p>
          </CardContent>
        </Card>
      </Layout>
    )
  }

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-black mb-2 flex items-center gap-3">
            <Shield className="h-8 w-8 text-gray-400" />
            Panel Administrateur
          </h1>
          <p className="text-gray-600">Gestion complète de la plateforme</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-medium transition-shadow hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Utilisateurs</CardTitle>
                <Users className="h-5 w-5 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{stats.totalUsers}</div>
                <p className="text-xs text-gray-500 mt-1">Tous rôles confondus</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-medium transition-shadow hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Athlètes</CardTitle>
                <Activity className="h-5 w-5 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.athletes}</div>
                <p className="text-xs text-gray-500 mt-1">Inscrits</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-medium transition-shadow hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Coachs</CardTitle>
                <UserCheck className="h-5 w-5 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.coaches}</div>
                <p className="text-xs text-gray-500 mt-1">Actifs</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-medium transition-shadow hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Séances</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.totalSessions}</div>
                <p className="text-xs text-gray-500 mt-1">Total enregistrées</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs enregistrés</CardTitle>
            <CardDescription>Gérer tous les utilisateurs de la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun utilisateur trouvé</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nom</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rôle</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Séances</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Inscription</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-black">{user.firstName} {user.lastName}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                            user.role === 'COACH' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{user._count?.sessions || 0}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

