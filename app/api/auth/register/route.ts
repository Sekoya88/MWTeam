import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ATHLETE', 'COACH', 'ADMIN']).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)
    const email = validated.email.trim().toLowerCase()

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email déjà utilisé' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: validated.firstName.trim(),
        lastName: validated.lastName.trim(),
        role: validated.role || 'ATHLETE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      }
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.errors.map(e => e.message).join('. ')
      return NextResponse.json(
        { error: msg || 'Données invalides' },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    const stack = error instanceof Error ? error.stack : undefined
    console.error('Registration error:', message, stack)

    if (message.includes('Unique constraint') || message.includes('unique')) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 400 })
    }
    if (message.includes('connect') || message.includes('ECONNREFUSED') || message.includes('database') || message.includes('P1001')) {
      return NextResponse.json(
        { error: 'Impossible de joindre la base de données. Vérifiez la connexion (Cloud SQL, réseau autorisé).' },
        { status: 503 }
      )
    }
    if (message.includes('Authentication failed') || message.includes('password') || message.includes('P1017')) {
      return NextResponse.json(
        { error: 'Erreur d\'accès à la base. Vérifiez DATABASE_URL (utilisateur / mot de passe).' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Erreur lors de l\'inscription. Réessayez ou contactez l\'administrateur.' },
      { status: 500 }
    )
  }
}

