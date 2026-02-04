import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const zoneSchema = z.object({
  userId: z.string().optional(),
  vma: z.union([z.number().positive(), z.null()]).optional(),
  sv1: z.union([z.number().positive(), z.null()]).optional(),
  sv2: z.union([z.number().positive(), z.null()]).optional(),
  seuil: z.union([z.number().positive(), z.null()]).optional(),
  as10: z.union([z.number().positive(), z.null()]).optional(),
  as5: z.union([z.number().positive(), z.null()]).optional(),
  as21: z.union([z.number().positive(), z.null()]).optional(),
  allureMarathon: z.union([z.number().positive(), z.null()]).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    // Vérifier accès si userId différent
    if (userId !== session.user.id) {
      if (session.user.role !== 'COACH' && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
      
      if (session.user.role === 'COACH') {
        const athlete = await prisma.user.findUnique({
          where: { id: userId },
          select: { coachId: true },
        })
        if (athlete?.coachId !== session.user.id) {
          return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        }
      }
    }

    const zones = await prisma.workZoneConfig.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ zones: zones || [] })
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
    console.log('POST /api/zones - Received body:', body)
    
    // Validation avec gestion d'erreurs détaillée
    let validated
    try {
      validated = zoneSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Zod validation error:', error.errors)
        return NextResponse.json(
          { error: 'Données invalides', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }
    
    const { userId: targetUserId, ...zoneData } = validated
    console.log('Validated data:', { targetUserId, zoneData })

    // Si userId est fourni, vérifier que c'est un coach qui modifie pour un athlète
    const finalUserId = targetUserId || session.user.id
    
    // Si on modifie pour un autre utilisateur, vérifier les permissions
    if (targetUserId && targetUserId !== session.user.id) {
      // Vérifier que l'utilisateur est coach/admin
      if (session.user.role !== 'COACH' && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
      
      // Pour les coachs, vérifier que l'athlète leur est assigné
      if (session.user.role === 'COACH') {
        const athlete = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { coachId: true, role: true },
        })
        
        if (!athlete) {
          return NextResponse.json({ error: 'Athlète non trouvé' }, { status: 404 })
        }
        
        // Si l'athlète n'a pas de coachId, on permet au coach de l'assigner (première fois)
        // Sinon, vérifier que c'est bien le coach assigné
        if (athlete.coachId && athlete.coachId !== session.user.id) {
          console.error(`Permission denied: Coach ${session.user.id} trying to modify zones for athlete ${targetUserId} (coachId: ${athlete.coachId})`)
          return NextResponse.json({ error: 'Accès refusé: Cet athlète ne vous est pas assigné' }, { status: 403 })
        }
        
        // Si l'athlète n'a pas de coachId, l'assigner automatiquement au coach
        if (!athlete.coachId) {
          await prisma.user.update({
            where: { id: targetUserId },
            data: { coachId: session.user.id },
          })
        }
      }
    }

    // Nettoyer et valider les données pour Prisma
    const cleanZoneData: any = {}
    
    // Convertir et valider chaque champ
    if (zoneData.vma !== undefined && zoneData.vma !== null) {
      const vmaNum = Number(zoneData.vma)
      if (isNaN(vmaNum) || vmaNum <= 0) {
        return NextResponse.json(
          { error: 'VMA doit être un nombre positif' },
          { status: 400 }
        )
      }
      cleanZoneData.vma = vmaNum
    }
    
    if (zoneData.sv1 !== undefined && zoneData.sv1 !== null) {
      const sv1Num = Number(zoneData.sv1)
      if (isNaN(sv1Num) || sv1Num <= 0) {
        return NextResponse.json(
          { error: 'SV1 doit être un nombre positif' },
          { status: 400 }
        )
      }
      cleanZoneData.sv1 = sv1Num
    }
    
    if (zoneData.sv2 !== undefined && zoneData.sv2 !== null) {
      const sv2Num = Number(zoneData.sv2)
      if (isNaN(sv2Num) || sv2Num <= 0) {
        return NextResponse.json(
          { error: 'SV2 doit être un nombre positif' },
          { status: 400 }
        )
      }
      cleanZoneData.sv2 = sv2Num
    }
    
    if (zoneData.seuil !== undefined && zoneData.seuil !== null) {
      cleanZoneData.seuil = Number(zoneData.seuil)
    }
    if (zoneData.as10 !== undefined && zoneData.as10 !== null) {
      cleanZoneData.as10 = Number(zoneData.as10)
    }
    if (zoneData.as5 !== undefined && zoneData.as5 !== null) {
      cleanZoneData.as5 = Number(zoneData.as5)
    }
    if (zoneData.as21 !== undefined && zoneData.as21 !== null) {
      cleanZoneData.as21 = Number(zoneData.as21)
    }
    if (zoneData.allureMarathon !== undefined && zoneData.allureMarathon !== null) {
      cleanZoneData.allureMarathon = Number(zoneData.allureMarathon)
    }

    console.log('Clean zone data:', cleanZoneData)
    console.log('Final user ID:', finalUserId)
    console.log('Session user:', { id: session.user.id, role: session.user.role })

    // Créer ou mettre à jour les zones
    const existingZones = await prisma.workZoneConfig.findFirst({
      where: { userId: finalUserId },
    })

    console.log('Existing zones:', existingZones)

    // Vérifier qu'on a au moins une donnée à sauvegarder
    if (Object.keys(cleanZoneData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à sauvegarder' },
        { status: 400 }
      )
    }

    let zones
    try {
      if (existingZones) {
        console.log('Updating existing zones with data:', cleanZoneData)
        zones = await prisma.workZoneConfig.update({
          where: { id: existingZones.id },
          data: cleanZoneData,
        })
        console.log('Successfully updated zones:', zones)
      } else {
        console.log('Creating new zones with data:', { ...cleanZoneData, userId: finalUserId })
        zones = await prisma.workZoneConfig.create({
          data: {
            ...cleanZoneData,
            userId: finalUserId,
          }
        })
        console.log('Successfully created zones:', zones)
      }

      return NextResponse.json({ zones }, { status: existingZones ? 200 : 201 })
    } catch (prismaError: any) {
      console.error('Prisma error full details:', JSON.stringify({
        message: prismaError.message,
        code: prismaError.code,
        meta: prismaError.meta,
        cause: prismaError.cause,
      }, null, 2))
      
      // Message d'erreur plus détaillé
      let errorMessage = 'Erreur base de données'
      if (prismaError.code === 'P2002') {
        errorMessage = 'Une configuration de zones existe déjà pour cet utilisateur'
      } else if (prismaError.code === 'P2025') {
        errorMessage = 'Enregistrement non trouvé'
      } else if (prismaError.message) {
        errorMessage = `Erreur: ${prismaError.message}`
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: prismaError.message,
          code: prismaError.code,
        },
        { status: 500 }
      )
    }
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

