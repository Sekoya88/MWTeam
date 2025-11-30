import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isApiRoute = req.nextUrl.pathname.startsWith('/api')

    // Si l'utilisateur est connecté et essaie d'accéder à /auth, rediriger vers le dashboard
    if (token && isAuthPage) {
      if (token.role === 'COACH' || token.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/coach', req.url))
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
    if (!token && !isAuthPage && !isApiRoute) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
        const isApiRoute = req.nextUrl.pathname.startsWith('/api')

        // Autoriser l'accès aux pages d'auth et API
        if (isAuthPage || isApiRoute) {
          return true
        }

        // Pour les autres pages, nécessite une authentification
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|mwteam.jpeg).*)',
  ],
}

