import { useState, useRef, useEffect, FormEvent } from 'react'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import { analyticsApi } from '@/api/analytics'
import type { AnalyticsBundle } from '@/hooks/useAnalyticsDashboard'
import { formatINR } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTIONS = [
  'Why did revenue decrease?',
  'Which products need attention?',
  "Summarize today's business.",
]

interface Props {
  shopId: string
  bundle: AnalyticsBundle | null
}

function buildReply(question: string, bundle: AnalyticsBundle): string {
  const q = question.toLowerCase()
  const { dashboard, products, trends, health, insights } = bundle
  const kpis = dashboard.kpis

  if (q.includes('revenue') && (q.includes('decrease') || q.includes('down') || q.includes('drop'))) {
    if (kpis.revenue_growth_pct >= 0) {
      return (
        `Revenue is up ${kpis.revenue_growth_pct.toFixed(1)}% vs yesterday ` +
        `(${formatINR(kpis.todays_revenue)}). There is no decrease today.\n\n` +
        `${insights.summary}`
      )
    }
    return (
      `Revenue declined ${Math.abs(kpis.revenue_growth_pct).toFixed(1)}% vs yesterday ` +
      `(now ${formatINR(kpis.todays_revenue)}).\n\n` +
      `7-day total: ${formatINR(trends.total_revenue)}. ` +
      `Health score ${Math.round(health.health_score)}/100 — ${health.explanation}\n\n` +
      (insights.recommendations[0] ? `Suggestion: ${insights.recommendations[0]}` : '')
    )
  }

  if (q.includes('attention') || q.includes('slow') || q.includes('which product')) {
    const slow = products.slow_moving.slice(0, 3)
    const best = products.best_selling.slice(0, 2)
    const slowLines = slow.length
      ? slow.map((p, i) => `${i + 1}. ${p.product_name} — ${p.units_sold} units`).join('\n')
      : 'No slow movers identified.'
    const bestLines = best.length
      ? best.map((p) => `${p.product_name} (${p.units_sold} units)`).join(', ')
      : 'n/a'
    return (
      `Products that need attention (slow movers):\n${slowLines}\n\n` +
      `Strong performers: ${bestLines}.\n\n` +
      (insights.recommendations.find((r) => r.toLowerCase().includes('slow')) ??
        insights.recommendations[0] ??
        '')
    )
  }

  if (q.includes('summarize') || q.includes('summary') || q.includes('today')) {
    const highlights = insights.highlights.slice(0, 3).map((h) => `• ${h}`).join('\n')
    return `${insights.summary}\n\n${highlights}`
  }

  // Generic fallback from backend insights payload
  return (
    `${insights.summary}\n\n` +
    `Key points:\n${insights.highlights.slice(0, 3).map((h) => `• ${h}`).join('\n')}\n\n` +
    `Health score: ${Math.round(insights.health_score)}/100.\n` +
    `(Full AI chat will use Gemini later — answers today are built from analytics APIs.)`
  )
}

export function AIBusinessAssistant({ shopId, bundle }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask about revenue, products, or today’s performance. Answers use live analytics APIs (LLM coming later).',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const ask = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || busy) return

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
    ])
    setInput('')
    setBusy(true)

    try {
      // Refresh insights from backend so replies stay connected to APIs
      const insights = await analyticsApi.getInsights(shopId)
      const liveBundle: AnalyticsBundle = bundle
        ? { ...bundle, insights }
        : {
            dashboard: await analyticsApi.getDashboard(shopId),
            products: await analyticsApi.getProducts(shopId),
            trends: await analyticsApi.getTrends(shopId, 7),
            health: await analyticsApi.getHealth(shopId),
            insights,
          }

      const reply = buildReply(trimmed, liveBundle)
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: reply },
      ])
    } catch (e: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: e instanceof Error ? e.message : 'Could not reach analytics API.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void ask(input)
  }

  return (
    <div className="panel p-5 flex flex-col h-[380px]">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <MessageSquare className="w-4 h-4 text-brand-600" />
        <h3 className="font-display text-base text-ink-900 dark:text-white">AI business assistant</h3>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => void ask(s)}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-ink-100 dark:border-white/10 text-ink-600 dark:text-gray-300 hover:bg-ink-50 dark:hover:bg-white/5 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm leading-relaxed whitespace-pre-wrap rounded-xl px-3 py-2 max-w-[95%] ${
              m.role === 'user'
                ? 'ml-auto bg-brand-600 text-white'
                : 'bg-ink-50 dark:bg-black/25 text-ink-700 dark:text-gray-300'
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-ink-500 px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Checking analytics…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your shop…"
          disabled={busy}
          className="flex-1 text-sm rounded-xl border border-ink-100 dark:border-white/10 bg-white dark:bg-ink-900 px-3 py-2 outline-none focus:border-brand-600 text-ink-800 dark:text-gray-200 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="p-2.5 rounded-xl bg-brand-600 text-white disabled:opacity-50 hover:bg-brand-700"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
