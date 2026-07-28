import { useEffect, useRef, useState, FormEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { analyticsApi } from '@/api/analytics'
import { demandApi } from '@/api/demand'
import type { AnalyticsBundle } from '@/hooks/useAnalyticsDashboard'
import type { DashboardResponse } from '@/types'
import { formatINR } from '@/lib/utils'
import { SHOP_ID } from '@/lib/agents'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTIONS = [
  'Why did revenue decrease today?',
  'Which products should I reorder?',
  "Summarize today's business.",
  'What is the biggest business risk?',
  'What should I focus on tomorrow?',
  'Generate weekly report.',
]

interface Props {
  shopId?: string
  demand?: DashboardResponse | null
  analytics?: AnalyticsBundle | null
  seedQuestion?: string | null
  onSeedConsumed?: () => void
  compact?: boolean
}

function answer(
  q: string,
  demand: DashboardResponse | null | undefined,
  analytics: AnalyticsBundle | null | undefined,
): string {
  const lower = q.toLowerCase()

  if (lower.includes('weekly report') || lower.includes('generate weekly')) {
    const parts = [
      'Weekly ShopMind report',
      analytics ? `• Health ${Math.round(analytics.health.health_score)}/100` : null,
      analytics
        ? `• Revenue ${formatINR(analytics.dashboard.kpis.todays_revenue)} (${analytics.dashboard.kpis.revenue_growth_pct >= 0 ? '+' : ''}${analytics.dashboard.kpis.revenue_growth_pct.toFixed(1)}%)`
        : null,
      analytics ? `• 7-day revenue ${formatINR(analytics.trends.total_revenue)}` : null,
      demand ? `• Inventory health ${Math.round(demand.kpis.inventory_health_score)}/100 · ${demand.kpis.high_urgency_products} urgent SKUs` : null,
      analytics?.insights.summary,
      ...(analytics?.insights.recommendations.slice(0, 3).map((r) => `• ${r}`) ?? []),
    ]
    return parts.filter(Boolean).join('\n')
  }

  if (lower.includes('risk')) {
    const risks: string[] = []
    if (demand?.stockout_alerts[0]) {
      risks.push(`Stockout risk on ${demand.stockout_alerts[0].product_name}`)
    }
    if (analytics && analytics.dashboard.kpis.revenue_growth_pct < 0) {
      risks.push(`Revenue down ${Math.abs(analytics.dashboard.kpis.revenue_growth_pct).toFixed(1)}% day-over-day`)
    }
    if (analytics?.products.slow_moving[0]) {
      risks.push(`Slow mover: ${analytics.products.slow_moving[0].product_name}`)
    }
    return risks.length
      ? `Biggest risks right now:\n${risks.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
      : 'No critical risks flagged in the current agent pass.'
  }

  if (lower.includes('focus') || lower.includes('tomorrow')) {
    const focus = [
      demand?.top_reorder_products[0]
        ? `Confirm restock for ${demand.top_reorder_products[0].product_name}`
        : null,
      analytics?.insights.recommendations[0],
      'Review agent collaboration on Mission Control before opening.',
    ].filter(Boolean)
    return `Focus for tomorrow:\n${focus.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
  }

  if (lower.includes('reorder') || lower.includes('which product')) {
    if (!demand) return 'Open the Demand Agent workspace for live reorder priorities.'
    const list = (demand.stockout_alerts.length ? demand.stockout_alerts : demand.top_reorder_products)
      .slice(0, 4)
      .map((p, i) => `${i + 1}. ${p.product_name} — ${Math.round(p.total_predicted_units)} units predicted`)
      .join('\n')
    return `Reorder priorities:\n${list || 'No urgent reorders.'}`
  }

  if (lower.includes('revenue') && (lower.includes('decrease') || lower.includes('down') || lower.includes('drop'))) {
    if (!analytics) return 'Analytics Agent has not returned revenue context yet.'
    const g = analytics.dashboard.kpis.revenue_growth_pct
    if (g >= 0) {
      return `Revenue did not decrease — it is up ${g.toFixed(1)}% (${formatINR(analytics.dashboard.kpis.todays_revenue)}).\n\n${analytics.insights.summary}`
    }
    return `Revenue declined ${Math.abs(g).toFixed(1)}%.\n\n${analytics.insights.summary}\n\n${analytics.insights.recommendations[0] ?? ''}`
  }

  if (lower.includes('summarize') || lower.includes('today')) {
    return [
      analytics?.insights.summary,
      demand?.executive_brief,
      analytics?.insights.highlights.slice(0, 3).map((h) => `• ${h}`).join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  return (
    analytics?.insights.summary ||
    demand?.executive_brief ||
    'I can only answer from live ShopMind agent data. Try a suggested question.'
  )
}

export function BusinessAdvisor({
  shopId = SHOP_ID,
  demand,
  analytics,
  seedQuestion,
  onSeedConsumed,
  compact,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'I am your Business Advisor. I only answer from live ShopMind agent data — forecasts, health, and executive insights.',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (seedQuestion) {
      void ask(seedQuestion)
      onSeedConsumed?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuestion])

  const ask = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || busy) return
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed }])
    setInput('')
    setBusy(true)
    try {
      let liveDemand = demand
      let liveAnalytics = analytics
      if (!liveDemand) liveDemand = await demandApi.getDashboard(shopId, 7)
      if (!liveAnalytics) {
        const [dashboard, products, trends, health, insights] = await Promise.all([
          analyticsApi.getDashboard(shopId),
          analyticsApi.getProducts(shopId),
          analyticsApi.getTrends(shopId, 7),
          analyticsApi.getHealth(shopId),
          analyticsApi.getInsights(shopId),
        ])
        liveAnalytics = { dashboard, products, trends, health, insights }
      } else {
        const insights = await analyticsApi.getInsights(shopId)
        liveAnalytics = { ...liveAnalytics, insights }
      }
      const reply = answer(trimmed, liveDemand, liveAnalytics)
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: reply }])
    } catch (e: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: e instanceof Error ? e.message : 'Advisor could not reach agent APIs.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`panel flex flex-col ${compact ? 'h-[380px]' : 'h-[460px]'}`}>
      <div className="px-5 py-4 border-b border-ink-100 dark:border-white/8">
        <h3 className="text-sm font-semibold">Business Advisor</h3>
        <p className="text-xs text-ink-500 mt-0.5">Grounded in Demand + Intelligence agents</p>
      </div>

      <div className="px-4 pt-3 flex flex-wrap gap-1.5">
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

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm leading-relaxed whitespace-pre-wrap rounded-xl px-3 py-2 max-w-[92%] ${
              m.role === 'user'
                ? 'ml-auto bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                : 'bg-ink-50 dark:bg-white/[0.04] text-ink-700 dark:text-gray-300'
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Advising from live agents…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void ask(input)
        }}
        className="p-3 border-t border-ink-100 dark:border-white/8 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a business question…"
          disabled={busy}
          className="flex-1 text-sm rounded-lg border border-ink-100 dark:border-white/10 bg-white dark:bg-transparent px-3 py-2 outline-none focus:border-intel disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="p-2.5 rounded-lg bg-ink-900 text-white dark:bg-white dark:text-ink-900 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </section>
  )
}
