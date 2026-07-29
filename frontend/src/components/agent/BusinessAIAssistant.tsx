import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Loader2, Sparkles, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Package, DollarSign, Zap } from 'lucide-react'
import { analyticsApi } from '@/api/analytics'
import { demandApi } from '@/api/demand'
import type { AnalyticsBundle } from '@/hooks/useAnalyticsDashboard'
import type { DashboardResponse } from '@/types'
import { formatINR } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: ReplyBlock[]
}

type ReplyBlock =
  | { type: 'text'; text: string }
  | { type: 'stat'; label: string; value: string; tone?: 'good' | 'bad' | 'warn' | 'neutral' }
  | { type: 'list'; items: string[]; tone?: 'good' | 'bad' | 'warn' | 'neutral' }
  | { type: 'action'; label: string; detail: string; priority: 'high' | 'medium' | 'low' }
  | { type: 'divider' }

interface Props {
  mode: 'demand' | 'analytics'
  shopId: string
  analytics?: AnalyticsBundle | null
  demand?: DashboardResponse | null
  horizon?: number
  inline?: boolean
}

// ── Intent detection ──────────────────────────────────────────────────────────
function detectIntent(q: string): string {
  const t = q.toLowerCase()
  // Stockout / running out — must be first, very common demand question
  if (/run.*out|running out|out.*first|finish.*first|which.*first|stockout|out of stock|empty|zero stock|going to (run|finish)|lose.*money|losing.*sale/.test(t)) return 'stockout'
  if (/reorder|order today|what (to|should i) (buy|order|restock)|replenish|purchase|need to order|should.*order/.test(t)) return 'reorder'
  if (/critical|urgent|emergency|immediate/.test(t)) return 'critical'
  if (/slow mov|not selling|dead stock|idle|stagnant|capital lock|moving slow/.test(t)) return 'slow_movers'
  if (/best sell|top product|top sell|highest|most sold|fast mov|selling (well|fast|most)/.test(t)) return 'best_sellers'
  if (/which product|what product|product.*demand|demand.*increas|demand.*rising|demand.*growing|demand.*up|increas.*demand|rising.*demand|trending|spike|high demand/.test(t)) return 'trending'
  if (/revenue|sales today|how much.*earn|income|turnover|how much.*make|made today/.test(t)) return 'revenue'
  if (/growth|trend|up|down|increas|decreas|compar|yesterday|vs/.test(t)) return 'growth'
  if (/health|score|overall|status|how.*doing|performance/.test(t)) return 'health'
  if (/forecast|predict|next.*day|upcoming|future demand/.test(t)) return 'forecast'
  if (/profit|margin|earn|net/.test(t)) return 'profit'
  if (/risk|danger|threat|warn/.test(t)) return 'risk'
  if (/recommend|suggest|advice|what should|action|step|improve|next/.test(t)) return 'recommend'
  if (/summar|overview|brief|report|today|situation/.test(t)) return 'summary'
  if (/confidence|accurate|model|reliable|trust/.test(t)) return 'confidence'
  if (/category|segment|group|type/.test(t)) return 'category'
  if (/price|cost|cheap|expensive/.test(t)) return 'pricing'
  if (/customer|buyer|who|visit/.test(t)) return 'customer'
  if (/7 day|week|7d|weekly/.test(t)) return 'weekly'
  return 'general'
}

// Parse explicit horizon mentions like "7d", "14d", "30d", "7 days", "30 days"
function parseHorizonFromText(q: string): number | null {
  const t = q.toLowerCase()
  const m = t.match(/\b(7|14|30)\b\s*(d|day|days)?/) || t.match(/\b(7|14|30)d\b/)
  if (m) return Number(m[1] ?? m[0])
  if (/\b(week|weekly)\b/.test(t)) return 7
  if (/\b(month|monthly|30 day|30 days)\b/.test(t)) return 30
  return null
}

// ── Demand reply builder ──────────────────────────────────────────────────────
function buildDemandReply(intent: string, data: DashboardResponse, horizon: number): ReplyBlock[] {
  const portfolio = data.portfolio?.length ? data.portfolio : data.top_reorder_products
  const high   = portfolio.filter(p => p.urgency === 'high')
  const medium = portfolio.filter(p => p.urgency === 'medium')
  const low    = portfolio.filter(p => p.urgency === 'low')
  // Sort by days_until_stockout ascending — soonest first
  const byStockout = [...portfolio]
    .filter(p => p.days_until_stockout != null)
    .sort((a, b) => (a.days_until_stockout ?? 99) - (b.days_until_stockout ?? 99))
  const critical = byStockout.filter(p => (p.days_until_stockout ?? 99) <= 3)
  const conf   = Math.round(data.kpis.avg_confidence_score * 100)
  const health = Math.round(data.kpis.inventory_health_score)

  const daysLabel = (d: number | null) =>
    d == null ? 'unknown' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`

  switch (intent) {
    case 'reorder':
      if (!high.length && !medium.length)
        return [
          { type: 'text', text: `Great news — all ${portfolio.length} products are adequately stocked. No reorders needed right now.` },
          { type: 'stat', label: 'Inventory Health', value: `${health}/100`, tone: 'good' },
        ]
      return [
        { type: 'text', text: `You need to reorder ${high.length + medium.length} product${high.length + medium.length !== 1 ? 's' : ''} in the next ${horizon} days:` },
        { type: 'list', items: [...high, ...medium].slice(0, 6).map(p =>
          `${p.product_name} — order ~${Math.round(p.total_predicted_units * 1.2)} units · runs out ${daysLabel(p.days_until_stockout ?? null)}`
        ), tone: 'bad' },
        ...high.slice(0, 2).map(p => ({
          type: 'action' as const,
          label: `Order ${p.product_name} today`,
          detail: `~${Math.round(p.total_predicted_units * 1.2)} units needed · runs out ${daysLabel(p.days_until_stockout ?? null)}`,
          priority: 'high' as const,
        })),
      ]

    case 'stockout':
    case 'critical': {
      const atRisk = byStockout.filter(p => (p.days_until_stockout ?? 99) <= 7)
      if (!atRisk.length)
        return [
          { type: 'text', text: `No stockout risk in the next 7 days. All ${portfolio.length} products have sufficient stock.` },
          { type: 'stat', label: 'Inventory Health', value: `${health}/100`, tone: 'good' },
        ]
      const first = atRisk[0]
      return [
        { type: 'text', text: `${first.product_name} will run out first — ${daysLabel(first.days_until_stockout ?? null)}. Here's the full risk list:` },
        { type: 'list', items: atRisk.slice(0, 6).map((p, i) =>
          `${i + 1}. ${p.product_name} — runs out ${daysLabel(p.days_until_stockout ?? null)} · urgency: ${p.urgency}`
        ), tone: 'bad' },
        ...atRisk.slice(0, 2).map(p => ({
          type: 'action' as const,
          label: `Order ${p.product_name} now`,
          detail: `Runs out ${daysLabel(p.days_until_stockout ?? null)} — call your supplier today`,
          priority: (p.days_until_stockout ?? 99) <= 3 ? 'high' as const : 'medium' as const,
        })),
      ]
    }

    case 'trending': {
      const rising  = portfolio.filter(p => p.trend_type === 'upward' || p.trend_type === 'seasonal_spike')
        .sort((a, b) => b.total_predicted_units - a.total_predicted_units)
      const falling = portfolio.filter(p => p.trend_type === 'downward')
      const stable  = portfolio.filter(p => p.trend_type === 'stable')
      if (!rising.length)
        return [
          { type: 'text', text: `No products with rising demand right now. ${stable.length} products are stable.` },
          { type: 'stat', label: 'Stable products', value: stable.length.toString(), tone: 'neutral' },
        ]
      return [
        { type: 'text', text: `${rising.length} product${rising.length !== 1 ? 's are' : ' is'} seeing rising demand:` },
        { type: 'list', items: rising.slice(0, 5).map(p =>
          `${p.product_name} — ${Math.round(p.total_predicted_units)} units forecast · ${p.trend_type === 'seasonal_spike' ? '🔥 Seasonal spike' : '↑ Upward trend'}`
        ), tone: 'warn' },
        ...rising.slice(0, 2).map(p => ({
          type: 'action' as const,
          label: `Stock up ${p.product_name}`,
          detail: `Forecast: ${Math.round(p.total_predicted_units)} units · ensure supply before demand peaks`,
          priority: 'medium' as const,
        })),
        ...(falling.length ? [{ type: 'stat' as const, label: 'Declining products', value: `${falling.map(p => p.product_name).slice(0, 2).join(', ')}${falling.length > 2 ? ` +${falling.length - 2} more` : ''}`, tone: 'bad' as const }] : []),
      ]
    }

    case 'best_sellers': {
      const top = [...portfolio].sort((a, b) => b.total_predicted_units - a.total_predicted_units)
      return [
        { type: 'text', text: `Top selling products by forecast demand (next ${horizon} days):` },
        { type: 'list', items: top.slice(0, 5).map((p, i) =>
          `${i + 1}. ${p.product_name} — ${Math.round(p.total_predicted_units)} units · ${p.trend_type === 'upward' ? '↑ rising' : p.trend_type === 'seasonal_spike' ? '🔥 spike' : '→ stable'}`
        ), tone: 'good' },
        { type: 'action', label: `Keep ${top[0].product_name} well stocked`, detail: 'Highest demand product — avoid stockout at all costs', priority: 'high' },
      ]
    }

    case 'slow_movers': {
      const slow = [...portfolio]
        .filter(p => p.trend_type === 'downward' || p.urgency === 'low')
        .sort((a, b) => a.total_predicted_units - b.total_predicted_units)
      if (!slow.length)
        return [{ type: 'text', text: 'No slow-moving products detected. All products have reasonable demand.' }]
      return [
        { type: 'text', text: `${slow.length} product${slow.length !== 1 ? 's are' : ' is'} moving slowly:` },
        { type: 'list', items: slow.slice(0, 5).map(p =>
          `${p.product_name} — only ${Math.round(p.total_predicted_units)} units forecast · ${p.trend_type === 'downward' ? '↓ declining' : 'low demand'}`
        ), tone: 'warn' },
        ...slow.slice(0, 1).map(p => ({
          type: 'action' as const,
          label: `Reduce orders for ${p.product_name}`,
          detail: 'Demand is low — avoid overstocking to free up capital',
          priority: 'low' as const,
        })),
      ]
    }

    case 'forecast':
      return [
        { type: 'stat', label: `Total demand (${horizon}d)`, value: `${Math.round(data.kpis.total_predicted_demand_7d)} units`, tone: 'neutral' },
        { type: 'stat', label: 'Model confidence', value: `${conf}%`, tone: conf >= 75 ? 'good' : conf >= 55 ? 'warn' : 'bad' },
        { type: 'text', text: data.executive_brief },
        ...(byStockout.length ? [{ type: 'text' as const, text: `Next to run out: ${byStockout[0].product_name} (${daysLabel(byStockout[0].days_until_stockout ?? null)})` }] : []),
        { type: 'list', items: portfolio.filter(p => p.trend_type === 'upward' || p.trend_type === 'seasonal_spike').slice(0, 3).map(p =>
          `${p.product_name}: rising demand — ${Math.round(p.total_predicted_units)} units forecast`
        ), tone: 'warn' },
      ]

    case 'risk':
      return [
        { type: 'text', text: critical.length > 0
          ? `${critical.length} product${critical.length !== 1 ? 's are' : ' is'} critically low — act today:`
          : high.length > 0 ? `${high.length} product${high.length !== 1 ? 's need' : ' needs'} ordering this week:` : 'No critical risk right now.' },
        { type: 'list', items: [...critical, ...high].slice(0, 5).map(p =>
          `${p.product_name} — runs out ${daysLabel(p.days_until_stockout ?? null)}`
        ), tone: 'bad' },
        { type: 'stat', label: 'High urgency', value: high.length.toString(), tone: high.length > 0 ? 'bad' : 'good' },
        { type: 'stat', label: 'Medium urgency', value: medium.length.toString(), tone: medium.length > 0 ? 'warn' : 'good' },
        { type: 'stat', label: 'Well stocked', value: low.length.toString(), tone: 'good' },
      ]

    case 'confidence':
      return [
        { type: 'stat', label: 'Forecast confidence', value: `${conf}%`, tone: conf >= 75 ? 'good' : conf >= 55 ? 'warn' : 'bad' },
        { type: 'text', text: conf >= 75
          ? 'Model is well-calibrated. Forecasts are reliable for ordering decisions.'
          : conf >= 55 ? 'Moderate confidence. Use forecasts as guidance but add a 15% safety buffer.'
          : 'Low confidence. Limited sales history. Add a 25% safety buffer to all orders.' },
        { type: 'stat', label: 'Reorder coverage', value: `${data.kpis.reorder_coverage_pct}%`, tone: data.kpis.reorder_coverage_pct >= 80 ? 'good' : 'warn' },
      ]

    case 'recommend': {
      const actions: ReplyBlock[] = [{ type: 'text', text: "Here's what to do right now:" }]
      if (critical.length) actions.push({ type: 'action', label: `Order ${critical[0].product_name} today`, detail: `Runs out ${daysLabel(critical[0].days_until_stockout ?? null)} — call your supplier now`, priority: 'high' })
      if (high.length > (critical.length ? 1 : 0)) {
        const rest = high.filter(p => !critical.find(c => c.product_id === p.product_id))
        if (rest.length) actions.push({ type: 'action', label: `Order ${rest.map(p => p.product_name).slice(0, 2).join(' & ')} this week`, detail: rest.slice(0, 3).map(p => `${p.product_name} (${daysLabel(p.days_until_stockout ?? null)})`).join(', '), priority: 'high' })
      }
      if (medium.length) actions.push({ type: 'action', label: `Plan orders for ${medium.slice(0, 2).map(p => p.product_name).join(' & ')}`, detail: 'Within the next 5–7 days', priority: 'medium' })
      const slowDown = portfolio.filter(p => p.urgency === 'low' && p.trend_type === 'downward')
      if (slowDown.length) actions.push({ type: 'action', label: `Reduce orders for ${slowDown[0].product_name}`, detail: 'Demand is declining — avoid overstocking', priority: 'low' })
      return actions
    }

    case 'summary':
    case 'general':
    default: {
      const firstOut = byStockout[0]
      return [
        { type: 'stat', label: 'Inventory health', value: `${health}/100`, tone: health >= 70 ? 'good' : health >= 50 ? 'warn' : 'bad' },
        { type: 'stat', label: 'Forecast confidence', value: `${conf}%`, tone: conf >= 70 ? 'good' : 'warn' },
        { type: 'stat', label: `Demand (${horizon}d)`, value: `${Math.round(data.kpis.total_predicted_demand_7d)} units`, tone: 'neutral' },
        { type: 'text', text: data.executive_brief },
        ...(firstOut ? [{ type: 'text' as const, text: `⚠ Next to run out: ${firstOut.product_name} — ${daysLabel(firstOut.days_until_stockout ?? null)}` }] : []),
        ...(high.length ? [{ type: 'action' as const, label: `Order ${high[0].product_name} today`, detail: `Runs out ${daysLabel(high[0].days_until_stockout ?? null)}`, priority: 'high' as const }] : []),
      ]
    }
  }
}

// ── Analytics reply builder ───────────────────────────────────────────────────
function buildAnalyticsReply(intent: string, bundle: AnalyticsBundle, horizon = 7): ReplyBlock[] {
  const { dashboard, products, health, insights, trends } = bundle
  const kpis = dashboard.kpis
  const g = kpis.revenue_growth_pct
  const h = Math.round(health.health_score)

  switch (intent) {
    case 'revenue':
    case 'weekly':
      return [
        { type: 'stat', label: "Today's revenue", value: formatINR(kpis.todays_revenue), tone: g >= 0 ? 'good' : 'bad' },
        { type: 'stat', label: 'vs yesterday', value: `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`, tone: g >= 0 ? 'good' : 'bad' },
        { type: 'stat', label: `${horizon}-day total`, value: formatINR(trends.total_revenue), tone: 'neutral' },
        { type: 'stat', label: 'Orders today', value: kpis.total_orders.toString(), tone: 'neutral' },
        { type: 'text', text: insights.summary },
      ]

    case 'growth':
      return [
        { type: 'stat', label: 'Revenue growth', value: `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`, tone: g >= 5 ? 'good' : g >= 0 ? 'warn' : 'bad' },
        { type: 'text', text: g >= 0 ? `Revenue is growing. ${insights.highlights[0] ?? ''}` : `Revenue declined ${Math.abs(g).toFixed(1)}% vs yesterday. ${insights.recommendations[0] ?? ''}` },
        { type: 'stat', label: 'Revenue consistency', value: `${Math.round(health.breakdown.sales_consistency)}%`, tone: health.breakdown.sales_consistency >= 60 ? 'good' : 'warn' },
      ]

    case 'health':
      return [
        { type: 'stat', label: 'Business health', value: `${h}/100`, tone: h >= 70 ? 'good' : h >= 50 ? 'warn' : 'bad' },
        { type: 'stat', label: 'Revenue growth score', value: `${Math.round(health.breakdown.revenue_growth)}%`, tone: health.breakdown.revenue_growth >= 50 ? 'good' : 'warn' },
        { type: 'stat', label: 'Sales consistency', value: `${Math.round(health.breakdown.sales_consistency)}%`, tone: health.breakdown.sales_consistency >= 60 ? 'good' : 'warn' },
        { type: 'stat', label: 'Product movement', value: `${Math.round(health.breakdown.product_movement)}%`, tone: health.breakdown.product_movement >= 60 ? 'good' : 'warn' },
        { type: 'text', text: health.explanation },
      ]

    case 'best_sellers':
      if (!products.best_selling.length) return [{ type: 'text', text: 'No sales data available for this period.' }]
      return [
        { type: 'text', text: 'Top performing products (last 30 days):' },
        { type: 'list', items: products.best_selling.map((p, i) => `${i + 1}. ${p.product_name} — ${formatINR(p.revenue)} · ${p.units_sold} units`), tone: 'good' },
        { type: 'action', label: `Keep ${products.best_selling[0].product_name} well-stocked`, detail: 'Top revenue contributor — avoid stockout', priority: 'high' },
      ]

    case 'slow_movers':
      if (!products.slow_moving.length) return [{ type: 'text', text: 'No slow movers detected in the current period.' }]
      return [
        { type: 'text', text: 'Products with low sales velocity (last 30 days):' },
        { type: 'list', items: products.slow_moving.map(p => `${p.product_name} — ${p.units_sold} units · ${formatINR(p.revenue)}`), tone: 'warn' },
        ...products.slow_moving.slice(0, 2).map(p => ({ type: 'action' as const, label: `Promote ${p.product_name}`, detail: 'Run 10–15% discount or bundle offer to clear stock', priority: 'medium' as const })),
      ]

    case 'profit':
      const estProfit = Math.round(kpis.todays_revenue * 0.35)
      return [
        { type: 'stat', label: 'Est. gross profit today', value: formatINR(estProfit), tone: g >= 0 ? 'good' : 'warn' },
        { type: 'stat', label: 'Margin estimate', value: '~35%', tone: 'neutral' },
        { type: 'text', text: 'Margin estimate based on typical retail cost structure. Actual margin depends on your supplier costs.' },
      ]

    case 'recommend':
      return [
        { type: 'text', text: 'Priority actions for your business right now:' },
        ...insights.recommendations.slice(0, 4).map((r, i) => ({
          type: 'action' as const,
          label: r.split('.')[0],
          detail: r.split('.').slice(1).join('.').trim() || r,
          priority: (i === 0 ? 'high' : i === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        })),
      ]

    case 'category':
      const cats = [...new Set(products.best_selling.map(p => p.category).filter(Boolean))]
      return [
        { type: 'text', text: 'Category performance (by revenue):' },
        { type: 'list', items: cats.length ? cats.map(c => `${c}: ${products.best_selling.filter(p => p.category === c).reduce((s, p) => s + p.revenue, 0).toFixed(0)} revenue`) : ['Category data not available'], tone: 'neutral' },
      ]

    case 'summary':
    case 'general':
    default:
      return [
        { type: 'stat', label: 'Health', value: `${h}/100`, tone: h >= 70 ? 'good' : h >= 50 ? 'warn' : 'bad' },
        { type: 'stat', label: 'Revenue today', value: formatINR(kpis.todays_revenue), tone: g >= 0 ? 'good' : 'bad' },
        { type: 'stat', label: 'Growth', value: `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`, tone: g >= 0 ? 'good' : 'bad' },
        { type: 'text', text: insights.summary },
        { type: 'divider' },
        { type: 'list', items: insights.recommendations.slice(0, 2), tone: 'warn' },
      ]
  }
}

// ── Render a reply block ──────────────────────────────────────────────────────
function Block({ b }: { b: ReplyBlock }) {
  if (b.type === 'text') return (
    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(203,213,225,0.8)' }}>{b.text}</p>
  )

  if (b.type === 'divider') return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
  )

  if (b.type === 'stat') {
    const colorMap = {
      good:    '#10b981',
      bad:     '#ef4444',
      warn:    '#f59e0b',
      neutral: '#e2e8f0',
    }
    const c = colorMap[b.tone ?? 'neutral']
    return (
      <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[10px] font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>{b.label}</span>
        <span className="text-[11px] font-bold font-mono" style={{ color: c }}>{b.value}</span>
      </div>
    )
  }

  if (b.type === 'list') {
    const dotColor = b.tone === 'bad' ? '#ef4444' : b.tone === 'warn' ? '#f59e0b' : b.tone === 'good' ? '#10b981' : 'rgba(148,163,184,0.5)'
    return (
      <ul className="space-y-1">
        {b.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: 'rgba(203,213,225,0.75)' }}>
            <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: dotColor }} />
            {item}
          </li>
        ))}
      </ul>
    )
  }

  if (b.type === 'action') {
    const cfg = {
      high:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)',   icon: AlertTriangle,  iconColor: '#ef4444' },
      medium: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.18)',  icon: Zap,            iconColor: '#f59e0b' },
      low:    { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.07)', icon: CheckCircle2,   iconColor: 'rgba(148,163,184,0.5)' },
    }[b.priority]
    const Icon = cfg.icon
    return (
      <div className="rounded-lg px-2.5 py-2" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
        <div className="flex items-start gap-2">
          <Icon className="w-3 h-3 mt-0.5 shrink-0" style={{ color: cfg.iconColor }} />
          <div>
            <p className="text-[11px] font-semibold" style={{ color: '#e2e8f0' }}>{b.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>{b.detail}</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

const SUGGESTIONS = {
  demand: [
    'What is running out first?',
    'What do I need to order today?',
    'Which products are selling fast?',
    'What should I do right now?',
  ],
  analytics: [
    'How much did I make today?',
    'What is not selling?',
    'How is my business doing?',
    'What should I do right now?',
  ],
}

export function BusinessAIAssistant({ mode, shopId, analytics, demand, horizon = 7, inline: _inline }: Props) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'init',
    role: 'assistant',
    content: [{ type: 'text', text: mode === 'demand' ? "Hi! Ask me what to order today, what's running low, or what you might lose money on." : "Hi! Ask me how much you made today, what's not selling, or what to do to grow your business." }],
  }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const ask = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || busy) return
    setMessages(p => [...p, { id: `u${Date.now()}`, role: 'user', content: [{ type: 'text', text: trimmed }] }])
    setInput('')
    setBusy(true)
    await new Promise(r => setTimeout(r, 280))
    try {
        const intent = detectIntent(trimmed)
        const requestedHorizon = parseHorizonFromText(trimmed) ?? horizon
        let blocks: ReplyBlock[]
        if (mode === 'analytics') {
          if (analytics) {
            // Reuse existing bundle — avoid redundant API calls on every message
            const bundle: AnalyticsBundle = requestedHorizon !== horizon
              ? { ...analytics, trends: await analyticsApi.getTrends(shopId, requestedHorizon) }
              : analytics
            blocks = buildAnalyticsReply(intent, bundle, requestedHorizon)
          } else {
            const [dashboard, products, trends, health, insights] = await Promise.all([
              analyticsApi.getDashboard(shopId),
              analyticsApi.getProducts(shopId, requestedHorizon),
              analyticsApi.getTrends(shopId, requestedHorizon),
              analyticsApi.getHealth(shopId, requestedHorizon),
              analyticsApi.getInsights(shopId, requestedHorizon),
            ])
            blocks = buildAnalyticsReply(intent, { dashboard, products, trends, health, insights }, requestedHorizon)
          }
        } else {
          const dash = demand ?? await demandApi.getDashboard(shopId, requestedHorizon)
          blocks = buildDemandReply(intent, dash, requestedHorizon)
        }
      setMessages(p => [...p, { id: `a${Date.now()}`, role: 'assistant', content: blocks }])
    } catch {
      setMessages(p => [...p, { id: `e${Date.now()}`, role: 'assistant', content: [{ type: 'text', text: 'Could not reach the AI engine. Please try again.' }] }])
    } finally {
      setBusy(false)
    }
  }

  const accentColor = mode === 'demand' ? '#6366f1' : '#8b5cf6'

  return (
    <div className="flex flex-col overflow-hidden h-full"
      style={{ background: 'rgba(5,8,15,0.6)' }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
        <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}30` }}>
          <Sparkles className="w-3 h-3" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-none" style={{ color: '#e2e8f0' }}>
            {mode === 'demand' ? 'Demand Co-Pilot' : 'BI Co-Pilot'}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }}>Powered by ShopMind AI</p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      </div>

      {/* Quick suggestions */}
      <div className="px-3 pt-2.5 pb-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex flex-wrap gap-1">
          {SUGGESTIONS[mode].map(s => (
            <button key={s} disabled={busy} onClick={() => void ask(s)}
              className="text-[10px] px-2 py-1 rounded-md font-medium transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(148,163,184,0.7)',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] rounded-xl px-3 py-2 text-[11px] font-medium"
                style={{ background: accentColor, color: '#fff' }}>
                {(m.content[0] as { type: 'text'; text: string }).text}
              </div>
            ) : (
              <div className="max-w-[95%] space-y-1.5 w-full">
                {m.content.map((b, i) => <Block key={i} b={b} />)}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" style={{ color: accentColor }} />
            <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>Analysing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void ask(input) }}
        className="p-2.5 flex gap-2 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <input value={input} onChange={e => setInput(e.target.value)} disabled={busy}
          placeholder="Ask anything…"
          className="flex-1 text-[11px] rounded-lg px-3 py-2 outline-none disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#e2e8f0',
          }} />
        <button type="submit" disabled={busy || !input.trim()}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: accentColor }}>
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
    </div>
  )
}
