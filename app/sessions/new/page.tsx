'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

const SESSION_TYPES = [
  { value: 'FRACTIONNE', label: 'Fractionné' },
  { value: 'ENDURANCE', label: 'Endurance' },
  { value: 'RECUPERATION', label: 'Récupération' },
  { value: 'COMPETITION', label: 'Compétition' },
  { value: 'SEUIL', label: 'Seuil' },
  { value: 'VMA', label: 'VMA' },
  { value: 'AUTRE', label: 'Autre' },
]

const WORK_ZONES = [
  { value: 'RECUPERATION', label: 'Récupération' },
  { value: 'ENDURANCE_FONDAMENTALE', label: 'Endurance fondamentale' },
  { value: 'SEUIL', label: 'Seuil' },
  { value: 'VMA', label: 'VMA' },
  { value: 'VITESSE', label: 'Vitesse' },
]

const WEATHER_CONDITIONS = [
  { value: 'SOLEIL', label: 'Soleil' },
  { value: 'NUAGEUX', label: 'Nuageux' },
  { value: 'PLUIE', label: 'Pluie' },
  { value: 'VENT', label: 'Vent' },
  { value: 'NEIGE', label: 'Neige' },
  { value: 'AUTRE', label: 'Autre' },
]

export default function NewSessionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    type: 'ENDURANCE',
    status: 'REALISEE',
    date: new Date().toISOString().slice(0, 16),
    duration: 60,
    distance: '',
    rpe: 5,
    zones: [] as string[],
    notes: '',
    location: '',
    weather: '',
    cadence: '',
    heartRateAvg: '',
    heartRateMax: '',
    isKeySession: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload: any = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        duration: Number(formData.duration),
        rpe: Number(formData.rpe),
        zones: formData.zones,
      }

      if (formData.distance) payload.distance = Number(formData.distance)
      if (formData.cadence) payload.cadence = Number(formData.cadence)
      if (formData.heartRateAvg) payload.heartRateAvg = Number(formData.heartRateAvg)
      if (formData.heartRateMax) payload.heartRateMax = Number(formData.heartRateMax)
      if (formData.weather && formData.weather.trim() !== '') {
        payload.weather = formData.weather
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Erreur lors de la création')
        return
      }

      router.push('/sessions')
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const toggleZone = (zone: string) => {
    setFormData({
      ...formData,
      zones: formData.zones.includes(zone)
        ? formData.zones.filter(z => z !== zone)
        : [...formData.zones, zone],
    })
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Link href="/sessions" className="inline-flex items-center text-gray-600 hover:text-black mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux séances
          </Link>
          <h1 className="text-4xl font-bold text-black mb-2">Nouvelle séance d'entraînement</h1>
          <p className="text-gray-600">Enregistrez les détails de votre séance</p>
        </div>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Informations de la séance</CardTitle>
            <CardDescription>Remplissez les informations de votre entraînement</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 animate-fade-in">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Type de séance *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full h-10 rounded-lg border border-gray-300 px-4 focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                  >
                    {SESSION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Statut *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-10 rounded-lg border border-gray-300 px-4 focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                  >
                    <option value="PREVUE">Prévue</option>
                    <option value="REALISEE">Réalisée</option>
                    <option value="ANNULEE">Annulée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Date et heure *
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Durée (minutes) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Distance (km)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    placeholder="Ex: 10.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    RPE (1-10) *
                  </label>
                  <div className="space-y-2">
                    <Input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.rpe}
                      onChange={(e) => setFormData({ ...formData, rpe: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1 (Très facile)</span>
                      <span className="text-lg font-bold text-black">{formData.rpe}</span>
                      <span>10 (Maximum)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Lieu
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Stade, Parc, Route..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Météo
                  </label>
                  <select
                    value={formData.weather}
                    onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                    className="w-full h-10 rounded-lg border border-gray-300 px-4 focus:ring-2 focus:ring-black focus:border-black transition-all"
                  >
                    <option value="">Sélectionner</option>
                    {WEATHER_CONDITIONS.map(weather => (
                      <option key={weather.value} value={weather.value}>{weather.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Cadence (pas/min)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.cadence}
                    onChange={(e) => setFormData({ ...formData, cadence: e.target.value })}
                    placeholder="Ex: 180"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    FC moyenne (bpm)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.heartRateAvg}
                    onChange={(e) => setFormData({ ...formData, heartRateAvg: e.target.value })}
                    placeholder="Ex: 150"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    FC max (bpm)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.heartRateMax}
                    onChange={(e) => setFormData({ ...formData, heartRateMax: e.target.value })}
                    placeholder="Ex: 180"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Zones de travail
                </label>
                <div className="flex flex-wrap gap-2">
                  {WORK_ZONES.map(zone => (
                    <button
                      key={zone.value}
                      type="button"
                      onClick={() => toggleZone(zone.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${formData.zones.includes(zone.value)
                          ? 'bg-black text-white border-black shadow-soft'
                          : 'bg-white text-black border-gray-300 hover:border-black'
                        }`}
                    >
                      {zone.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 min-h-[120px] focus:ring-2 focus:ring-black focus:border-black transition-all resize-none"
                  placeholder="Notes sur la séance, sensations, difficultés rencontrées..."
                />
              </div>

              <div className="flex items-center space-x-2 p-4 rounded-lg bg-gray-50">
                <input
                  type="checkbox"
                  id="isKeySession"
                  checked={formData.isKeySession}
                  onChange={(e) => setFormData({ ...formData, isKeySession: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="isKeySession" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Marquer comme séance clé
                </label>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <Button type="submit" disabled={loading} loading={loading} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Enregistrer</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
