import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import type { AnalyticsBundle } from '@/hooks/useAnalyticsDashboard'
import type { DashboardResponse } from '@/types'
import { formatINR } from '@/lib/utils'

interface Step {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  why: string
  impact: string
}

function buildDemandSteps(data: DashboardResponse, horizon: number): Step[] {
  const portfolio = data.portfolio?.length ? data.portfolio : data.top_reorder_products
  const steps: Step[] = []

  // Critical stockouts first
  portfolio
    .filter(p => p.urgency === 'high' && (p.days_until_stockout ?? 99) <= 3)
    .slice(0, 2)
    .forEach(p => steps.push({
      id: `so-${p.product_id}`,
      priority: 'critical',
      title: `Emergency reorder: ${p.product_name}`,
      why: `Only ${p.days_until_stockout ?? '<1'} day(s) of stock left. Stockout will cause direct revenue loss.`,
      impact: `Prevents lost sales on a high-demand SKU`,
    }))

  // High urgency reorders
  portfolio
    .filter(p => p.urgency === 'high' && (p.days_until_stockout ?? 99) > 3)
    .slice(0, 2)
    .forEach(p => steps.push({
      id: `hi-${p.product_id}`,
      priority: 'high',
      title: `Reorder ${p.product_name} this week`,
      why: `Forecast: ${Math.round(p.total_predicted_units)} units over ${horizon} days. Current stock won't cover demand.`,
      impact: `Maintains sales continuity and avoids emergency orders`,
    }))

  // Rising demand — increase order
  portfolio
    .filter(p => p.trend_type === 'upward' || p.trend_type === 'seasonal_spike')
    .slice(0, 1)
    .forEach(p => steps.push({
      id: `up-${p.product_id}`,
      priority: 'medium',
      title: `Increase order size for ${p.product_name}`,
      why: `Demand is trending upward. Standard reorder quantity may fall short.`,
      impact: `Avoids mid-cycle stockout on a growing SKU`,
    }))

  // Declining demand — reduce order
  portfolio
    .filter(p => p.trend_type === 'downward' && p.urgency === 'low')
    .slice(0, 1)
    .forEach(p => steps.push({
      id: `dn-${p.product_id}`,
      priority: 'low',
      title: `Reduce next order for ${p.product_name}`,
      why: `Demand is declining. Over-ordering will lock capital in slow-moving stock.`,
      impact: `Frees working capital for higher-velocity SKUs`,
    }))

  if (!steps.length) steps.push({
    id: 'ok',
    priority: 'low',
    title: 'Inventory is well-positioned',
    why: `No critical or high-urgency SKUs detected for the ${horizon}-day horizon.`,
    impact: 'Continue monitoring — review again in 2 days',
  })

  return steps
}

function buildAnalyticsSteps(bundle: AnalyticsBundle): Step[] {
  const { dashboard, products, health, insights } = bundle
  const kpis = dashboard.kpis
  const g = kpis.revenue_growth_pct
  const steps: Step[] = []

  // Revenue decline
  if (g < -5) steps.push({
    id: 'rev-decline',
    priority: 'critical',
    title: 'Investigate revenue decline immediately',
    why: `Revenue dropped ${Math.abs(g).toFixed(1)}% vs yesterday. Check for stockouts, pricing issues, or demand shifts.`,
    impact: 'Recovering even 50% of the decline adds significant daily revenue',
  })

  // Best seller stock
  if (products.best_selling[0]) {
    const top = products.best_selling[0]
    steps.push({
      id: `bs-${top.product_id}`,
      priority: g < 0 ? 'high' : 'medium',
      title: `Ensure ${top.product_name} stays in stock`,
      why: `Top revenue contributor at ${formatINR(top.revenue)} (${top.units_sold} units). A stockout here directly hurts your bottom line.`,
      impact: `Protects your #1 revenue source`,
    })
  }

  // Slow movers — promote
  products.slow_moving.slice(0, 2).forEach(p => {
    if (p.units_sold <= 2) steps.push({
      id: `sm-${p.product_id}`,
      priority: 'medium',
      title: `Run a promotion on ${p.product_name}`,
      why: `Only ${p.units_sold} units sold in 30 days. Capital is locked in idle inventory.`,
      impact: `Recovers ${formatINR(p.revenue > 0 ? p.revenue * 3 : 500)} in potential revenue`,
    })
  })

  // Health score improvement
  if (health.breakdown.sales_consistency < 50) steps.push({
    id: 'consistency',
    priority: 'medium',
    title: 'Smooth out daily sales volatility',
    why: `Sales consistency score is ${Math.round(health.breakdown.sales_consistency)}%. High volatility makes forecasting harder and increases stockout risk.`,
    impact: 'Improves forecast accuracy and reduces emergency reorders',
  })

  if (health.breakdown.product_movement < 50) steps.push({
    id: 'movement',
    priority: 'low',
    title: 'Activate more SKUs in your assortment',
    why: `Product movement score is ${Math.round(health.breakdown.product_movement)}%. Too few products are contributing to sales.`,
    impact: 'Broader assortment reduces dependency on single SKUs',
  })

  // From AI insights
  insights.recommendations.slice(0, 1).forEach((r, i) => {
    if (!steps.find(s => s.why.includes(r.slice(0, 20)))) {
      steps.push({ id: `ins-${i}`, priority: 'low', title: r.split('.')[0], why: r, impact: 'Improves overall business health score' })
    }
  })

  return steps.slice(0, 5)
}

const PRIORITY_STYLE = {
  critical: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20', bg: 'bg-red-50 dark:bg-red-500/5' },
  high: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', bg: 'bg-amber-50 dark:bg-amber-500/5' },
  medium: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/10', bg: '' },
  low: { dot: 'bg-gray-400', text: 'text-gray-500', border: 'border-gray-100 dark:border-white/5', bg: '' },
}

interface Props {
  mode: 'demand' | 'analytics'
  demand?: DashboardResponse | null
  analytics?: AnalyticsBundle | null
  horizon?: number
}

export function ActionPlan({ mode, demand, analytics, horizon = 7 }: Props) {
  const [done, setDone] = useState<Set<string>>(new Set())

  const steps = mode === 'demand' && demand
    ? buildDemandSteps(demand, horizon)
    : mode === 'analytics' && analytics
    ? buildAnalyticsSteps(analytics)
    : []

  const toggle = (id: string) => setDone(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  if (!steps.length) return null

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const s = PRIORITY_STYLE[step.priority]
        const isDone = done.has(step.id)
        return (
          <div key={step.id}
            className={`rounded border px-3 py-2.5 transition-opacity ${s.border} ${s.bg} ${isDone ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-2.5">
              <button onClick={() => toggle(step.id)} className="mt-0.5 shrink-0">
                {isDone
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <Circle className="w-4 h-4 text-gray-300 dark:text-white/20" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${s.text}`}>
                    {i + 1}. {step.priority}
                  </span>
                </div>
                <p className={`text-xs font-semibold mt-0.5 ${isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                  {step.title}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{step.why}</p>
                <p className={`text-[10px] font-semibold mt-1 ${s.text}`}>→ {step.impact}</p>
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-[9px] text-gray-400 text-center pt-1">Click the circle to mark a step as done</p>
    </div>
  )
}
