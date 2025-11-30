import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const zoneSchema = z.object({
  vma: z.number().positive().optional(),
  seuil: z.number().positive().optional(),
  as10: z.number().positive().optional(),
  as5: z.number().positive().optional(),
  as21: z.number().positive().optional(),
  allureMarathon: z.number().positive().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const zones = await prisma.workZoneConfig.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ zones: zones || null })
  } catch (error) {
    console.error('Error fetching zones:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des zones' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validated = zoneSchema.parse(body)

    // Créer ou mettre à jour les zones
    const existingZones = await prisma.workZoneConfig.findFirst({
      where: { userId: session.user.id },
    })

    let zones
    if (existingZones) {
      zones = await prisma.workZoneConfig.update({
        where: { id: existingZones.id },
        data: validated,
      })
    } else {
      zones = await prisma.workZoneConfig.create({
        data: {
          ...validated,
          userId: session.user.id,
        }
      })
    }

    return NextResponse.json({ zones }, { status: existingZones ? 200 : 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error saving zones:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde des zones' },
      { status: 500 }
    )
  }
}

