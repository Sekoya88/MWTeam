'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MessageCircle, Send, Loader2, BookOpen, RefreshCw } from 'lucide-react'

interface RagSource {
  id: string
  titre: string
  source_type: string
  similarity?: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: RagSource[]
}

export default function AssistantRAGPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [indexStatus, setIndexStatus] = useState<{ totalChunks?: number; plans?: number; sessions?: number; notes?: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => scrollToBottom(), [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur requête')
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Erreur: ${err instanceof Error ? err.message : 'Requête RAG impossible'}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleReindex = async () => {
    if (indexing) return
    setIndexing(true)
    setIndexStatus(null)
    try {
      const res = await fetch('/api/admin/rag/index', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur indexation')
      setIndexStatus({
        totalChunks: data.totalChunks,
        plans: data.plans,
        sessions: data.sessions,
        notes: data.notes,
      })
    } catch (err) {
      setIndexStatus({})
    } finally {
      setIndexing(false)
    }
  }

  if (!session || (session.user.role !== 'COACH' && session.user.role !== 'ADMIN')) {
    return (
      <Layout>
        <Card className="py-16">
          <CardContent className="text-center">
            <p className="text-gray-600">Accès réservé aux coachs</p>
          </CardContent>
        </Card>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black flex items-center gap-2">
              <MessageCircle className="h-8 w-8" />
              Assistant RAG
            </h1>
            <CardDescription className="mt-1">
              Posez des questions sur vos plans, séances et notes. Les réponses s&apos;appuient sur les documents indexés avec citations.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReindex}
            disabled={indexing}
            className="flex items-center gap-2 shrink-0"
          >
            {indexing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {indexing ? 'Indexation…' : 'Réindexer le corpus'}
          </Button>
        </div>

        {indexStatus && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="py-3 text-sm text-gray-600">
              Dernière indexation : {indexStatus.totalChunks ?? 0} chunks
              {indexStatus.plans != null && ` (${indexStatus.plans} plans, ${indexStatus.sessions ?? 0} séances, ${indexStatus.notes ?? 0} notes)`}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Chat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="min-h-[320px] max-h-[50vh] overflow-y-auto space-y-4 pr-2">
              {messages.length === 0 && (
                <p className="text-gray-500 text-sm py-4">
                  Exemples : &quot;Quel volume cette semaine pour [athlète] ?&quot;, &quot;Résume les séances seuil du mois&quot;, &quot;Notes sur la récupération&quot;
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                      m.role === 'user'
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" /> Sources
                        </p>
                        <ul className="text-xs text-gray-600 space-y-0.5">
                          {m.sources.map((s, j) => (
                            <li key={j}>
                              {s.titre} <span className="text-gray-400">({s.source_type})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-2.5 bg-gray-100 flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Recherche et génération…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Votre question…"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                disabled={loading}
                maxLength={2000}
              />
              <Button type="submit" disabled={loading || !input.trim()} size="md" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
