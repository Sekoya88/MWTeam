'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from './ui/Button'
import { Logo } from './Logo'
import { User, LogOut, Menu, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    if (session) {
      fetch('/api/notifications?unreadOnly=true')
        .then(res => res.json())
        .then(data => setUnreadNotifications(data.unreadCount || 0))
        .catch(() => { })
    }
  }, [session])

  if (!session) return <>{children}</>

  const isCoach = session.user.role === 'COACH' || session.user.role === 'ADMIN'
  const isAthlete = session.user.role === 'ATHLETE'

  const navLinks = isAthlete
    ? [
      { href: '/dashboard', label: 'Tableau de bord' },
      { href: '/dashboard/planning', label: 'Planning' },
      { href: '/sessions', label: 'Séances' },
      { href: '/statistics', label: 'Statistiques' },
      { href: '/zones', label: 'Zones' },
      { href: '/indicators', label: 'Indicateurs' },
      { href: '/performances', label: 'Performances' },
    ]
    : session.user.role === 'ADMIN'
      ? [
        { href: '/admin', label: 'Admin' },
        { href: '/coach', label: 'Dashboard Coach' },
        { href: '/coach/plans', label: 'Plannings' },
        { href: '/coach/athletes', label: 'Mes Athlètes' },
        { href: '/coach/assistant', label: 'Assistant' },
      ]
      : [
        { href: '/coach', label: 'Dashboard Coach' },
        { href: '/coach/plans', label: 'Plannings' },
        { href: '/coach/athletes', label: 'Mes Athlètes' },
        { href: '/coach/assistant', label: 'Assistant' },
      ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <nav className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 backdrop-blur-sm shadow-soft">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center space-x-12">
              <Logo
                href={isCoach ? '/coach' : '/dashboard'}
                size="md"
                showText={true}
                className="flex-shrink-0"
              />

              {/* Desktop Navigation */}
              <div className="hidden lg:flex space-x-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all ${isActive
                          ? 'text-black bg-black/5'
                          : 'text-gray-600 hover:text-black hover:bg-gray-50'
                        }`}
                    >
                      {link.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-black rounded-full" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {unreadNotifications > 0 && (
                <Link href="/dashboard/planning" className="relative">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                </Link>
              )}
              <div className="hidden sm:flex items-center space-x-3 px-4 py-2 rounded-lg bg-gray-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white text-xs font-semibold">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{session.user.role.toLowerCase()}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4 space-y-1 animate-slide-up">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-2 text-sm font-medium rounded-lg ${isActive
                        ? 'text-black bg-black/5'
                        : 'text-gray-600 hover:text-black hover:bg-gray-50'
                      }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
