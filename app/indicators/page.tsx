'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { format } from 'date-fns'
import Link from 'next/link'
import { Plus, Heart, Weight, Moon, AlertCircle, Activity } from 'lucide-react'

interface Indicator {
  id: string
  date: string
  restingHR: number | null
  vma: number | null
  vo2max: number | null
  weight: number | null
  sleepHours: number | null
  sleepQuality: number | null
  fatigue: number | null
  injury: string | null
  injuryStatus: string | null
}

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 16),
    restingHR: '',
    vma: '',
    vo2max: '',
    weight: '',
    sleepHours: '',
    sleepQuality: '',
    fatigue: '',
    injury: '',
    injuryStatus: '',
  })

  useEffect(() => {
    fetch('/api/indicators')
      .then(res => res.json())
      .then(data => {
        setIndicators(data.indicators || [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload: any = {
        date: new Date(formData.date).toISOString(),
      }

      if (formData.restingHR) payload.restingHR = Number(formData.restingHR)
      if (formData.vma) payload.vma = Number(formData.vma)
      if (formData.vo2max) payload.vo2max = Number(formData.vo2max)
      if (formData.weight) payload.weight = Number(formData.weight)
      if (formData.sleepHours) payload.sleepHours = Number(formData.sleepHours)
      if (formData.sleepQuality) payload.sleepQuality = Number(formData.sleepQuality)
      if (formData.fatigue) payload.fatigue = Number(formData.fatigue)
      if (formData.injury) payload.injury = formData.injury
      if (formData.injuryStatus) payload.injuryStatus = formData.injuryStatus

      const response = await fetch('/api/indicators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setIndicators([data.indicator, ...indicators])
        setShowForm(false)
        setFormData({
          date: new Date().toISOString().slice(0, 16),
          restingHR: '',
          vma: '',
          vo2max: '',
          weight: '',
          sleepHours: '',
          sleepQuality: '',
          fatigue: '',
          injury: '',
          injuryStatus: '',
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Indicateurs physiologiques</h1>
            <p className="text-gray-600">Suivez votre condition physique</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>{showForm ? 'Annuler' : 'Ajouter un indicateur'}</span>
          </Button>
        </div>

        {showForm && (
          <Card className="shadow-medium animate-slide-up">
            <CardHeader>
              <CardTitle>Nouvel indicateur</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Date *
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <Heart className="h-4 w-4 inline mr-1" />
                      FC repos (bpm)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.restingHR}
                      onChange={(e) => setFormData({ ...formData, restingHR: e.target.value })}
                      placeholder="Ex: 50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <Activity className="h-4 w-4 inline mr-1" />
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
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      VO2max estimée
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.vo2max}
                      onChange={(e) => setFormData({ ...formData, vo2max: e.target.value })}
                      placeholder="Ex: 55"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <Weight className="h-4 w-4 inline mr-1" />
                      Poids (kg)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="Ex: 70.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <Moon className="h-4 w-4 inline mr-1" />
                      Heures de sommeil
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="24"
                      value={formData.sleepHours}
                      onChange={(e) => setFormData({ ...formData, sleepHours: e.target.value })}
                      placeholder="Ex: 8"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Qualité sommeil (1-10)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.sleepQuality}
                      onChange={(e) => setFormData({ ...formData, sleepQuality: e.target.value })}
                      placeholder="Ex: 7"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Fatigue (1-10)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.fatigue}
                      onChange={(e) => setFormData({ ...formData, fatigue: e.target.value })}
                      placeholder="Ex: 5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Blessure
                  </label>
                  <Input
                    value={formData.injury}
                    onChange={(e) => setFormData({ ...formData, injury: e.target.value })}
                    placeholder="Description de la blessure"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Statut blessure
                  </label>
                  <Input
                    value={formData.injuryStatus}
                    onChange={(e) => setFormData({ ...formData, injuryStatus: e.target.value })}
                    placeholder="Ex: active, guérie, en rééducation"
                  />
                </div>

                <Button type="submit" className="w-full">Enregistrer</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : indicators.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Aucun indicateur enregistré</h3>
              <p className="text-gray-600">Commencez à suivre votre condition physique.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {indicators.map(indicator => (
              <Card key={indicator.id} className="hover:shadow-medium transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-black">
                      {format(new Date(indicator.date), 'PPP')}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {indicator.restingHR && (
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          FC repos
                        </p>
                        <p className="text-lg font-bold text-black">{indicator.restingHR} bpm</p>
                      </div>
                    )}
                    {indicator.vma && (
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          VMA
                        </p>
                        <p className="text-lg font-bold text-black">{indicator.vma} km/h</p>
                      </div>
                    )}
                    {indicator.vo2max && (
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-600 mb-1">VO2max</p>
                        <p className="text-lg font-bold text-black">{indicator.vo2max}</p>
                      </div>
                    )}
                    {indicator.weight && (
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <Weight className="h-3 w-3" />
                          Poids
                        </p>
                        <p className="text-lg font-bold text-black">{indicator.weight} kg</p>
                      </div>
                    )}
                    {indicator.sleepHours && (
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <Moon className="h-3 w-3" />
                          Sommeil
                        </p>
                        <p className="text-lg font-bold text-black">{indicator.sleepHours}h</p>
                      </div>
                    )}
                    {indicator.sleepQuality && (
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-600 mb-1">Qualité sommeil</p>
                        <p className="text-lg font-bold text-black">{indicator.sleepQuality}/10</p>
                      </div>
                    )}
                    {indicator.fatigue && (
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-600 mb-1">Fatigue</p>
                        <p className="text-lg font-bold text-black">{indicator.fatigue}/10</p>
                      </div>
                    )}
                  </div>
                  {indicator.injury && (
                    <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Blessure: {indicator.injury}
                      </p>
                      {indicator.injuryStatus && (
                        <p className="text-xs text-yellow-700 mt-1">Statut: {indicator.injuryStatus}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
