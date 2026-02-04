'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Target, Save, CheckCircle2 } from 'lucide-react'
import { decimalToTimeString, timeStringToDecimal, formatPace } from '@/lib/time-format'

interface WorkZoneConfig {
  id: string
  vma: number | null
  sv1: number | null
  sv2: number | null
  seuil: number | null
  as10: number | null
  as5: number | null
  as21: number | null
  allureMarathon: number | null
}

function ZonesPageContent() {
  const searchParams = useSearchParams()
  const athleteId = searchParams.get('athleteId')
  const [zones, setZones] = useState<WorkZoneConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    vma: '',
    sv1: '',
    sv2: '',
  })

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const url = athleteId ? `/api/zones?userId=${athleteId}` : '/api/zones'
        const res = await fetch(url)
        const data = await res.json()
        if (data.zones && data.zones.length > 0) {
          const latest = data.zones[0]
          setZones(latest)
          setFormData({
            vma: latest.vma?.toString() || '',
            sv1: formatPace(latest.sv1),
            sv2: formatPace(latest.sv2),
          })
        } else if (data.zones) {
          // Format ancien (objet unique)
          setZones(data.zones)
          setFormData({
            vma: data.zones.vma?.toString() || '',
            sv1: formatPace(data.zones.sv1),
            sv2: formatPace(data.zones.sv2),
          })
        }
        setLoading(false)
      } catch (err) {
        console.error(err)
        setLoading(false)
      }
    }
    fetchZones()
  }, [athleteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      // Validation des champs requis
      if (!formData.vma || !formData.sv1 || !formData.sv2) {
        setError('Veuillez remplir tous les champs obligatoires')
        setSaving(false)
        return
      }

      // Convertir SV1 et SV2 du format 3:20 en décimal
      const sv1Decimal = timeStringToDecimal(formData.sv1)
      const sv2Decimal = timeStringToDecimal(formData.sv2)

      if (sv1Decimal === null) {
        setError('Format invalide pour SV1. Utilisez le format M:SS (ex: 3:20)')
        setSaving(false)
        return
      }

      if (sv2Decimal === null) {
        setError('Format invalide pour SV2. Utilisez le format M:SS (ex: 3:15)')
        setSaving(false)
        return
      }

      const vmaNum = Number(formData.vma)
      if (isNaN(vmaNum) || vmaNum <= 0) {
        setError('VMA doit être un nombre positif')
        setSaving(false)
        return
      }

      const payload: any = {
        vma: vmaNum,
        sv1: sv1Decimal,
        sv2: sv2Decimal,
      }
      if (athleteId) payload.userId = athleteId

      console.log('Sending payload:', payload)

      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.details?.[0]?.message || 'Erreur lors de la sauvegarde'
        setError(errorMsg)
        console.error('API Error:', data)
        return
      }

      // Succès
      setZones(data.zones)
      setSaved(true)
      setError(null)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-black mb-2">Zones de travail</h1>
          <p className="text-gray-600">Configurez vos allures de référence</p>
        </div>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Configuration des zones</span>
            </CardTitle>
            <CardDescription>
              Définissez vos allures de référence pour un suivi personnalisé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-black transition-colors">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    VMA (km/h) *
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.vma}
                    onChange={(e) => setFormData({ ...formData, vma: e.target.value })}
                    placeholder="Ex: 18.5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">Vitesse Maximale Aérobie</p>
                </div>

                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-black transition-colors">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    SV1 (Seuil Aérobie) - min/km *
                  </label>
                  <Input
                    type="text"
                    value={formData.sv1}
                    onChange={(e) => setFormData({ ...formData, sv1: e.target.value })}
                    placeholder="Ex: 3:20"
                    required
                    pattern="\d+:\d{2}"
                  />
                  <p className="text-xs text-gray-500 mt-2">Format: M:SS (ex: 3:20 pour 3 minutes 20 secondes)</p>
                </div>

                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-black transition-colors">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    SV2 (Seuil Anaérobie) - min/km *
                  </label>
                  <Input
                    type="text"
                    value={formData.sv2}
                    onChange={(e) => setFormData({ ...formData, sv2: e.target.value })}
                    placeholder="Ex: 3:15"
                    required
                    pattern="\d+:\d{2}"
                  />
                  <p className="text-xs text-gray-500 mt-2">Format: M:SS (ex: 3:15 pour 3 minutes 15 secondes)</p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                {saved && (
                  <div className="flex items-center space-x-2 text-green-600 animate-fade-in">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Zones enregistrées avec succès</span>
                  </div>
                )}
                <div className="ml-auto">
                  <Button 
                    type="submit" 
                    disabled={saving || !formData.vma || !formData.sv1 || !formData.sv2} 
                    loading={saving}
                    className="flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Enregistrer les zones</span>
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default function ZonesPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </Layout>
    }>
      <ZonesPageContent />
    </Suspense>
  )
}
