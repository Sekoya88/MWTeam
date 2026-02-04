'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'ATHLETE' as 'ATHLETE' | 'COACH' | 'ADMIN',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        ...formData,
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      }
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({ error: 'Erreur lors de l\'inscription' }))

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'inscription')
        setLoading(false)
        return
      }

      router.push('/auth/signin?registered=true')
    } catch (err) {
      setError('Une erreur est survenue. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        {/* Logo Section */}
        <div className="flex flex-col items-center space-y-6">
          <Logo size="lg" showText={true} />
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-black">Créer un compte</h1>
            <p className="text-gray-600">Rejoignez l'équipe performance</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-medium">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 animate-fade-in">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-900 mb-2">
                    Prénom
                  </label>
                  <Input
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-900 mb-2">
                    Nom
                  </label>
                  <Input
                    id="lastName"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Dupont"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="votre@email.com"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 caractères"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-semibold text-gray-900 mb-2">
                  Rôle
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ATHLETE' | 'COACH' | 'ADMIN' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all"
                >
                  <option value="ATHLETE">Athlète</option>
                  <option value="COACH">Coach</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'COACH' && 'En tant que coach, vous pourrez créer des plannings pour vos athlètes'}
                  {formData.role === 'ATHLETE' && 'En tant qu\'athlète, vous pourrez suivre vos entraînements'}
                </p>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading} loading={loading}>
              S'inscrire
            </Button>
            
            <div className="text-center text-sm pt-4 border-t border-gray-200">
              <span className="text-gray-600">Déjà un compte ? </span>
              <Link href="/auth/signin" className="font-semibold text-black hover:underline">
                Se connecter
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
