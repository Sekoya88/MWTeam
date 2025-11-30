'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Target, Save, CheckCircle2 } from 'lucide-react'

interface WorkZoneConfig {
  id: string
  vma: number | null
  seuil: number | null
  as10: number | null
  as5: number | null
  as21: number | null
  allureMarathon: number | null
}

export default function ZonesPage() {
  const [zones, setZones] = useState<WorkZoneConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState({
    vma: '',
    seuil: '',
    as10: '',
    as5: '',
    as21: '',
    allureMarathon: '',
  })

  useEffect(() => {
    fetch('/api/zones')
      .then(res => res.json())
      .then(data => {
        if (data.zones) {
          setZones(data.zones)
          setFormData({
            vma: data.zones.vma?.toString() || '',
            seuil: data.zones.seuil?.toString() || '',
            as10: data.zones.as10?.toString() || '',
            as5: data.zones.as5?.toString() || '',
            as21: data.zones.as21?.toString() || '',
            allureMarathon: data.zones.allureMarathon?.toString() || '',
          })
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      const payload: any = {}
      if (formData.vma) payload.vma = Number(formData.vma)
      if (formData.seuil) payload.seuil = Number(formData.seuil)
      if (formData.as10) payload.as10 = Number(formData.as10)
      if (formData.as5) payload.as5 = Number(formData.as5)
      if (formData.as21) payload.as21 = Number(formData.as21)
      if (formData.allureMarathon) payload.allureMarathon = Number(formData.allureMarathon)

      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setZones(data.zones)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error(err)
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-black transition-colors">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    VMA (km/h)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.vma}
                    onChange={(e) => setFormData({ ...formData, vma: e.target.value })}
                    placeholder="Ex: 18.5"
                  />
                  <p className="text-xs text-gray-500 mt-2">Vitesse Maximale Aérobie</p>
                </div>

                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-black transition-colors">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Seuil (min/km)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.seuil}
                    onChange={(e) => setFormData({ ...formData, seuil: e.target.value })}
                    placeholder="Ex: 3.75"
                  />
                  <p className="text-xs text-gray-500 mt-2">Allure seuil</p>
                </div>

                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-black transition-colors">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    AS10 (min/km)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.as10}
                    onChange={(e) => setFormData({ ...formData, as10: e.target.value })}
                    placeholder="Ex: 3.83"
                  />
                  <p className="text-xs text-gray-500 mt-2">Allure Seuil 10km</p>
                </div>

                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-black transition-colors">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    AS5 (min/km)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.as5}
                    onChange={(e) => setFormData({ ...formData, as5: e.target.value })}
                    placeholder="Ex: 3.67"
                  />
                  <p className="text-xs text-gray-500 mt-2">Allure Seuil 5km</p>
                </div>

                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-black transition-colors">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    AS21 (min/km)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.as21}
                    onChange={(e) => setFormData({ ...formData, as21: e.target.value })}
                    placeholder="Ex: 4.00"
                  />
                  <p className="text-xs text-gray-500 mt-2">Allure Seuil 21km</p>
                </div>

                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-black transition-colors">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Allure Marathon (min/km)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.allureMarathon}
                    onChange={(e) => setFormData({ ...formData, allureMarathon: e.target.value })}
                    placeholder="Ex: 4.25"
                  />
                  <p className="text-xs text-gray-500 mt-2">Allure cible marathon</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                {saved && (
                  <div className="flex items-center space-x-2 text-green-600 animate-fade-in">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Zones enregistrées avec succès</span>
                  </div>
                )}
                <div className="ml-auto">
                  <Button type="submit" disabled={saving} loading={saving} className="flex items-center space-x-2">
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
