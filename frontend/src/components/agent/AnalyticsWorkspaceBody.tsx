import { useState, useMemo } from 'react'
import type { AnalyticsBundle } from '@/hooks/useAnalyticsDashboard'
import type { ProductResponse, BulkForecastItem } from '@/types'
import { formatINR } from '@/lib/utils'
import { RevenueTrendChart } from '@/components/analytics/RevenueTrendChart'
import {
  TrendingUp, TrendingDown, Package, Sparkles, Check,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'

interface Props {
  data: AnalyticsBundle
  products: Record<string, ProductResponse>
  onOpenDrawer: (product: ProductResponse, forecast: BulkForecastItem) => void
  days?: number
}

export function AnalyticsWorkspaceBody({ data, onOpenDrawer, days = 30 }: Props) {
  const [promoStatus, setPromoStatus] = useState<Record<string, boolean>>({})

  const { dashboard, products: prodAnalytics, trends, health, insights } = data
  const kpis = dashboard.kpis
  const g = kpis.revenue_growth_pct
  const h = Math.round(health.health_score)
  const estProfit = Math.round(kpis.todays_revenue * 0.35)

  const opportunities = useMemo(() => {
    const list: { id: string; icon: string; title: string; detail: string; action?: string; actionKey?: string }[] = []
    prodAnalytics.slow_moving.slice(0, 2).forEach(p => {
      list.push({
        id: p.product_id, icon: '📦',
        title: `${p.product_name} is underperforming`,
        detail: `${p.units_sold} units sold · ${formatINR(p.revenue)} capital tied up. A targeted discount could accelerate turnover.`,
        action: 'Run promotion', actionKey: p.product_id,
      })
    })
    prodAnalytics.best_selling.slice(0, 1).forEach(p => {
      list.push({
        id: `top-${p.product_id}`, icon: '🔥',
        title: `${p.product_name} is your top performer`,
        detail: `${p.units_sold} units · ${formatINR(p.revenue)} revenue. Prioritise stock availability.`,
      })
    })
    if (g < -5) {
      list.push({
        id: 'revenue-drop', icon: '📉',
        title: 'Revenue declined vs prior period',
        detail: `Down ${Math.abs(g).toFixed(1)}%. ${insights.recommendations[0] ?? 'Review top-product stock levels.'}`,
      })
    }
    return list
  }, [prodAnalytics, g, insights])

  return (
    <div className="space-y-4">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Revenue today"
          value={formatINR(kpis.todays_revenue)}
          sub={`${g >= 0 ? '+' : ''}${g.toFixed(1)}% vs yesterday`}
          trend={g >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          label="Est. gross profit"
          value={formatINR(estProfit)}
          sub="~35% margin"
          trend="neutral"
          valueColor="#10b981"
        />
        <MetricCard
          label="Orders today"
          value={kpis.total_orders.toString()}
          sub={`${kpis.total_products_sold} items sold`}
          trend="neutral"
        />
        <MetricCard
          label="Business health"
          value={`${h}/100`}
          sub={h >= 70 ? 'On track' : h >= 50 ? 'Needs attention' : 'Take action'}
          trend={h >= 70 ? 'up' : h >= 50 ? 'neutral' : 'down'}
          valueColor={h >= 70 ? '#10b981' : h >= 50 ? '#f59e0b' : '#ef4444'}
        />
      </div>

      {/* ── Revenue trend ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
          <div>
            <p className="text-[12px] font-semibold" style={{ letterSpacing: '-0.01em' }}>Revenue Trend</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(148,163,184,0.55)' }}>
              {days}-day window · Total {formatINR(trends.total_revenue)}
            </p>
          </div>
          <span className={`text-[12px] font-bold font-mono ${g >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {g >= 0 ? '+' : ''}{g.toFixed(1)}%
          </span>
        </div>
        <div className="px-5 py-4 h-24">
          <RevenueTrendChart series={trends.series} totalRevenue={trends.total_revenue} />
        </div>
      </div>

      {/* ── Action items ── */}
      {opportunities.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
            <p className="text-[12px] font-semibold" style={{ letterSpacing: '-0.01em' }}>Recommended Actions</p>
          </div>
          <div>
            {opportunities.map((op, i) => (
              <div key={op.id} className="px-5 py-3.5 flex items-start gap-3"
                style={{ borderBottom: i < opportunities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span className="text-base shrink-0 mt-0.5">{op.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold">{op.title}</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>{op.detail}</p>
                  {op.action && op.actionKey && (
                    <div className="mt-2">
                      {promoStatus[op.actionKey] ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                          <Check className="w-3 h-3" /> Applied
                        </span>
                      ) : (
                        <button
                          onClick={() => setPromoStatus(p => ({ ...p, [op.actionKey!]: true }))}
                          className="text-[11px] px-3 py-1 rounded-lg font-semibold transition-all"
                          style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                          {op.action}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Product tables ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="card overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-[11px] font-semibold">Top Sellers</p>
          </div>
          <div>
            {prodAnalytics.best_selling.slice(0, 5).map((p, i) => (
              <div key={p.product_id} className="data-row gap-3">
                <span className="text-[10px] font-bold w-4 shrink-0" style={{ color: 'rgba(148,163,184,0.35)' }}>{i + 1}</span>
                <span className="flex-1 text-[11px] font-medium truncate">{p.product_name}</span>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold font-mono text-emerald-500">{formatINR(p.revenue)}</p>
                  <p className="text-[9px]" style={{ color: 'rgba(148,163,184,0.45)' }}>{p.units_sold} units</p>
                </div>
              </div>
            ))}
            {prodAnalytics.best_selling.length === 0 && (
              <p className="px-5 py-4 text-[11px]" style={{ color: 'rgba(148,163,184,0.45)' }}>No sales data yet.</p>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
            <Package className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[11px] font-semibold">Slow Movers</p>
          </div>
          <div>
            {prodAnalytics.slow_moving.slice(0, 5).map(p => (
              <div key={p.product_id} className="data-row gap-3">
                <span className="flex-1 text-[11px] font-medium truncate">{p.product_name}</span>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold font-mono text-amber-500">{p.units_sold} sold</p>
                  <p className="text-[9px]" style={{ color: 'rgba(148,163,184,0.45)' }}>{formatINR(p.revenue)}</p>
                </div>
              </div>
            ))}
            {prodAnalytics.slow_moving.length === 0 && (
              <p className="px-5 py-4 text-[11px]" style={{ color: 'rgba(148,163,184,0.45)' }}>All products moving well.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── AI summary ── */}
      <div className="card p-4" style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.15)' }}>
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1.5">AI Summary</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(203,213,225,0.8)' }}>{insights.summary}</p>
            {insights.recommendations.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {insights.recommendations.slice(0, 2).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    <span className="h-1 w-1 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, trend, valueColor }: {
  label: string; value: string; sub: string
  trend: 'up' | 'down' | 'neutral'; valueColor?: string
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : 'rgba(148,163,184,0.5)'
  return (
    <div className="card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</p>
      <p className="text-[18px] font-bold font-mono mt-1.5 leading-none" style={{ color: valueColor ?? 'inherit', letterSpacing: '-0.03em' }}>{value}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <TrendIcon className="w-3 h-3 shrink-0" style={{ color: trendColor }} />
        <p className="text-[10px]" style={{ color: trendColor }}>{sub}</p>
      </div>
    </div>
  )
}
