'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatDuration, formatPace, formatTime } from '@/lib/utils'
import { format } from 'date-fns'
import { Plus, Trophy, Clock, Target } from 'lucide-react'

interface Performance {
  id: string
  type: string
  distance: number | null
  time: number | null
  date: string
  notes: string | null
  isPersonalRecord: boolean
}

export default function PerformancesPage() {
  const [performances, setPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'chrono',
    distance: '',
    time: '',
    date: new Date().toISOString().slice(0, 16),
    notes: '',
    isPersonalRecord: false,
  })

  useEffect(() => {
    fetch('/api/performances')
      .then(res => res.json())
      .then(data => {
        setPerformances(data.performances || [])
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
      const timeInSeconds = formData.time
        .split(':')
        .reverse()
        .reduce((acc, val, idx) => acc + parseInt(val) * Math.pow(60, idx), 0)

      const payload: any = {
        type: formData.type,
        date: new Date(formData.date).toISOString(),
        isPersonalRecord: formData.isPersonalRecord,
      }

      if (formData.distance) payload.distance = Number(formData.distance)
      if (timeInSeconds > 0) payload.time = timeInSeconds
      if (formData.notes) payload.notes = formData.notes

      const response = await fetch('/api/performances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setPerformances([data.performance, ...performances])
        setShowForm(false)
        setFormData({
          type: 'chrono',
          distance: '',
          time: '',
          date: new Date().toISOString().slice(0, 16),
          notes: '',
          isPersonalRecord: false,
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
            <h1 className="text-4xl font-bold text-black mb-2">Performances</h1>
            <p className="text-gray-600">Suivez vos chronos et records personnels</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>{showForm ? 'Annuler' : 'Ajouter une performance'}</span>
          </Button>
        </div>

        {showForm && (
          <Card className="shadow-medium animate-slide-up">
            <CardHeader>
              <CardTitle>Nouvelle performance</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full h-10 rounded-lg border border-gray-300 px-4 focus:ring-2 focus:ring-black focus:border-black transition-all"
                    >
                      <option value="chrono">Chrono</option>
                      <option value="test_vma">Test VMA</option>
                      <option value="competition">Compétition</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

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
                      placeholder="Ex: 10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Temps (MM:SS ou HH:MM:SS)
                    </label>
                    <Input
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      placeholder="Ex: 35:30 ou 1:15:30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 min-h-[100px] focus:ring-2 focus:ring-black focus:border-black transition-all resize-none"
                    placeholder="Conditions, sensations..."
                  />
                </div>

                <div className="flex items-center space-x-2 p-4 rounded-lg bg-gray-50">
                  <input
                    type="checkbox"
                    id="isPersonalRecord"
                    checked={formData.isPersonalRecord}
                    onChange={(e) => setFormData({ ...formData, isPersonalRecord: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="isPersonalRecord" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Record personnel
                  </label>
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
        ) : performances.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Aucune performance enregistrée</h3>
              <p className="text-gray-600">Commencez à suivre vos chronos et records.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {performances.map(perf => (
              <Card key={perf.id} className={`hover:shadow-medium transition-all ${perf.isPersonalRecord ? 'border-2 border-yellow-300 bg-yellow-50/30' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-black capitalize">
                          {perf.type.replace('_', ' ')}
                        </h3>
                        {perf.isPersonalRecord && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            Record personnel
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-4 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(perf.date), 'PPP')}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {perf.distance && (
                          <div className="p-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Distance
                            </p>
                            <p className="text-lg font-bold text-black">{perf.distance} km</p>
                          </div>
                        )}
                        {perf.time && (
                          <div className="p-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-gray-600 mb-1">Temps</p>
                            <p className="text-lg font-bold text-black">{formatTime(perf.time)}</p>
                          </div>
                        )}
                        {perf.distance && perf.time && (
                          <div className="p-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-gray-600 mb-1">Allure</p>
                            <p className="text-lg font-bold text-black">
                              {formatPace((perf.time / 60) / perf.distance)}
                            </p>
                          </div>
                        )}
                      </div>
                      {perf.notes && (
                        <div className="mt-4 p-4 rounded-lg bg-gray-50 border-l-4 border-black">
                          <p className="text-sm text-gray-700 italic">{perf.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
