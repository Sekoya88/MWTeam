'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AlertTriangle, X, Save } from 'lucide-react'
import { decimalToTimeString, timeStringToDecimal, formatPace } from '@/lib/time-format'

interface ZonesWarningDialogProps {
  athleteId: string
  athleteName: string
  onClose: () => void
  onSave: () => void
}

export function ZonesWarningDialog({ athleteId, athleteName, onClose, onSave }: ZonesWarningDialogProps) {
  const [vma, setVma] = useState('')
  const [sv1, setSv1] = useState('')
  const [sv2, setSv2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Charger les zones existantes si disponibles
    const loadZones = async () => {
      try {
        const res = await fetch(`/api/zones?userId=${athleteId}`)
        const data = await res.json()
        if (data.zones && data.zones.length > 0) {
          const latest = data.zones[0]
          if (latest.vma) setVma(latest.vma.toString())
          if (latest.sv1) setSv1(formatPace(latest.sv1))
          if (latest.sv2) setSv2(formatPace(latest.sv2))
        } else if (data.zones) {
          // Format ancien (objet unique)
          if (data.zones.vma) setVma(data.zones.vma.toString())
          if (data.zones.sv1) setSv1(formatPace(data.zones.sv1))
          if (data.zones.sv2) setSv2(formatPace(data.zones.sv2))
        }
      } catch (err) {
        console.error('Error loading zones:', err)
      }
    }
    loadZones()
  }, [athleteId])

  const handleSave = async () => {
    if (!vma || !sv1 || !sv2) {
      setError('Veuillez remplir tous les champs')
      return
    }

    // Convertir SV1 et SV2 du format 3:20 en décimal
    const sv1Decimal = timeStringToDecimal(sv1)
    const sv2Decimal = timeStringToDecimal(sv2)

    if (sv1Decimal === null || sv2Decimal === null) {
      setError('Format invalide pour SV1 ou SV2. Utilisez le format M:SS (ex: 3:20)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: athleteId,
          vma: parseFloat(vma),
          sv1: sv1Decimal,
          sv2: sv2Decimal,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMsg = errorData.error || 'Erreur lors de la sauvegarde'
        throw new Error(errorMsg)
      }

      onSave()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Zones d'allures manquantes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              <strong>Attention :</strong> L'athlète <strong>{athleteName}</strong> n'a pas enregistré ses zones de seuil (SV1, SV2) et VMA.
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              Ces informations sont nécessaires pour créer des plannings cohérents avec ses capacités.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VMA (Vitesse Maximale Aérobie) - km/h *
              </label>
              <Input
                type="number"
                step="0.1"
                value={vma}
                onChange={(e) => setVma(e.target.value)}
                placeholder="Ex: 18.5"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SV1 (Seuil Aérobie) - min/km *
              </label>
              <Input
                type="text"
                value={sv1}
                onChange={(e) => setSv1(e.target.value)}
                placeholder="Ex: 3:20"
                required
                pattern="\d+:\d{2}"
              />
              <p className="text-xs text-gray-500 mt-1">Format: M:SS (ex: 3:20 pour 3 minutes 20 secondes)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SV2 (Seuil Anaérobie) - min/km *
              </label>
              <Input
                type="text"
                value={sv2}
                onChange={(e) => setSv2(e.target.value)}
                placeholder="Ex: 3:15"
                required
                pattern="\d+:\d{2}"
              />
              <p className="text-xs text-gray-500 mt-1">Format: M:SS (ex: 3:15 pour 3 minutes 15 secondes)</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={loading || !vma || !sv1 || !sv2}
            >
              {loading ? 'Enregistrement...' : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

