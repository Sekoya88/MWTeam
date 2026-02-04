'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import Link from 'next/link'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setRegistered(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setRegistered(false)
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email ou mot de passe incorrect.')
        setLoading(false)
        return
      }

      if (!result?.ok) {
        setError('Connexion impossible. Réessayez ou contactez l’administrateur.')
        setLoading(false)
        return
      }

      const session = await getSession()
      if (session?.user?.role === 'COACH' || session?.user?.role === 'ADMIN') {
        router.replace('/coach')
      } else {
        router.replace('/dashboard')
      }
      router.refresh()
    } catch (err) {
      setError('Une erreur est survenue. Vérifiez votre connexion.')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-8">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="flex flex-col items-center gap-5">
          <Logo size="lg" showText={true} />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
            <p className="text-sm text-gray-500">Entrez vos identifiants pour accéder à votre espace</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {registered && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
              Compte créé. Connectez-vous avec votre email et mot de passe.
            </div>
          )}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-800" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading} loading={loading} size="md">
              Se connecter
            </Button>

            <p className="text-center text-sm text-gray-500 pt-1">
              Pas encore de compte ?{' '}
              <Link href="/auth/register" className="font-medium text-gray-900 hover:underline">
                Créer un compte
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <p className="text-gray-500">Chargement…</p>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
