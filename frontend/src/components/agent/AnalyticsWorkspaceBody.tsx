import { useState, useMemo } from 'react'
import type { AnalyticsBundle } from '@/hooks/useAnalyticsDashboard'
import type { ProductResponse, BulkForecastItem, DailyRevenuePoint } from '@/types'
import { formatINR } from '@/lib/utils'
import { RevenueTrendChart } from '@/components/analytics/RevenueTrendChart'
import {
  TrendingUp, TrendingDown, Package, Sparkles, Check,
  ArrowUpRight, ArrowDownRight, Minus, AlertTriangle,
  BarChart2, Zap, Target, Activity,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  data: AnalyticsBundle
  products: Record<string, ProductResponse>
  onOpenDrawer: (product: ProductResponse, forecast: BulkForecastItem) => void
  days?: number
}

export function AnalyticsWorkspaceBody({ data, days = 30 }: Props) {
  const [promoStatus, setPromoStatus] = useState<Record<string, boolean>>({})

  const { dashboard, products: prodAnalytics, trends, health, insights } = data
  const kpis = dashboard.kpis
  const g = kpis.revenue_growth_pct
  const h = Math.round(health.health_score)
  const estProfit = Math.round(kpis.todays_revenue * 0.35)

  // Period-aware revenue stats from trends series
  const periodStats = useMemo(() => {
    const series = trends.series as DailyRevenuePoint[]
    if (!series.length) return null
    const revenues = series.map(d => d.revenue)
    const peak = Math.max(...revenues)
    const peakDay = series.find(d => d.revenue === peak)
    const avgDaily = trends.total_revenue / series.length
    const daysWithSales = series.filter(d => d.revenue > 0).length
    const totalOrders = series.reduce((s, d) => s + d.orders, 0)
    const totalUnits = series.reduce((s, d) => s + d.units_sold, 0)
    // Week-over-week: compare last half vs first half
    const mid = Math.floor(series.length / 2)
    const firstHalf = series.slice(0, mid).reduce((s, d) => s + d.revenue, 0)
    const secondHalf = series.slice(mid).reduce((s, d) => s + d.revenue, 0)
    const wow = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0
    return { peak, peakDay, avgDaily, daysWithSales, totalOrders, totalUnits, wow }
  }, [trends])

  // Category breakdown from best sellers
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { revenue: number; units: number }> = {}
    prodAnalytics.best_selling.forEach(p => {
      const cat = p.category || 'Uncategorised'
      if (!map[cat]) map[cat] = { revenue: 0, units: 0 }
      map[cat].revenue += p.revenue
      map[cat].units += p.units_sold
    })
    const total = Object.values(map).reduce((s, v) => s + v.revenue, 0)
    return Object.entries(map)
      .map(([cat, v]) => ({ cat, ...v, pct: total > 0 ? Math.round((v.revenue / total) * 100) : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [prodAnalytics])

  const opportunities = useMemo(() => {
    const list: { id: string; icon: string; title: string; detail: string; action?: string; actionKey?: string; priority: 'high' | 'medium' | 'low' }[] = []
    prodAnalytics.slow_moving.slice(0, 2).forEach(p => {
      list.push({
        id: p.product_id, icon: '📦', priority: 'medium',
        title: `${p.product_name} is underperforming`,
        detail: `${p.units_sold} units sold · ${formatINR(p.revenue)} capital tied up over ${days} days. A targeted discount could accelerate turnover.`,
        action: 'Run promotion', actionKey: p.product_id,
      })
    })
    prodAnalytics.best_selling.slice(0, 1).forEach(p => {
      list.push({
        id: `top-${p.product_id}`, icon: '🔥', priority: 'high',
        title: `${p.product_name} is your top performer`,
        detail: `${p.units_sold} units · ${formatINR(p.revenue)} over ${days} days. Prioritise stock availability to avoid lost sales.`,
      })
    })
    if (g < -5) {
      list.push({
        id: 'revenue-drop', icon: '📉', priority: 'high',
        title: 'Revenue declined vs prior period',
        detail: `Down ${Math.abs(g).toFixed(1)}%. ${insights.recommendations[0] ?? 'Review top-product stock levels.'}`,
      })
    }
    if (periodStats && periodStats.wow > 10) {
      list.push({
        id: 'wow-growth', icon: '📈', priority: 'low',
        title: `Strong momentum in the second half of this period`,
        detail: `Revenue grew ${periodStats.wow.toFixed(1)}% in the latter ${Math.floor(trends.series.length / 2)} days vs the first half. Sustain this with consistent stock.`,
      })
    }
    return list
  }, [prodAnalytics, g, insights, days, periodStats, trends])

  const priorityColors = {
    high:   { bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.15)',   dot: '#ef4444' },
    medium: { bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.15)',  dot: '#f59e0b' },
    low:    { bg: 'rgba(99,102,241,0.07)',  border: 'rgba(99,102,241,0.15)',  dot: '#6366f1' },
  }

  return (
    <div className="space-y-4">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label={`Revenue (${days}d)`} value={formatINR(trends.total_revenue)}
          sub={`${g >= 0 ? '+' : ''}${g.toFixed(1)}% vs prior day`}
          trend={g >= 0 ? 'up' : 'down'} valueColor={g >= 0 ? '#10b981' : '#ef4444'} />
        <MetricCard label="Est. gross profit" value={formatINR(estProfit)}
          sub="~35% margin" trend="neutral" valueColor="#10b981" />
        <MetricCard label={`Orders (${days}d)`}
          value={(periodStats?.totalOrders ?? kpis.total_orders).toString()}
          sub={`${periodStats?.totalUnits ?? kpis.total_products_sold} units sold`}
          trend="neutral" />
        <MetricCard label="Business health" value={`${h}/100`}
          sub={h >= 70 ? 'On track' : h >= 50 ? 'Needs attention' : 'Take action'}
          trend={h >= 70 ? 'up' : h >= 50 ? 'neutral' : 'down'}
          valueColor={h >= 70 ? '#10b981' : h >= 50 ? '#f59e0b' : '#ef4444'} />
      </div>

      {/* ── Period intelligence strip ── */}
      {periodStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <IntelCard icon={<BarChart2 className="w-3.5 h-3.5" />} label="Avg daily revenue"
            value={formatINR(Math.round(periodStats.avgDaily))} color="#6366f1" />
          <IntelCard icon={<Zap className="w-3.5 h-3.5" />} label="Peak day revenue"
            value={formatINR(Math.round(periodStats.peak))}
            sub={periodStats.peakDay ? String(periodStats.peakDay.date) : undefined}
            color="#f59e0b" />
          <IntelCard icon={<Activity className="w-3.5 h-3.5" />} label="Active trading days"
            value={`${periodStats.daysWithSales}/${trends.series.length}`} color="#10b981" />
          <IntelCard icon={<Target className="w-3.5 h-3.5" />} label="Period momentum"
            value={`${periodStats.wow >= 0 ? '+' : ''}${periodStats.wow.toFixed(1)}%`}
            sub="2nd half vs 1st half"
            color={periodStats.wow >= 0 ? '#10b981' : '#ef4444'} />
        </div>
      )}

      {/* ── Revenue trend ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
          <div>
            <p className="text-[12px] font-semibold" style={{ letterSpacing: '-0.01em' }}>Revenue Trend</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
              {days}-day window · {formatINR(trends.total_revenue)} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.45)' }}>Growth</p>
              <p className={`text-[13px] font-bold font-mono ${g >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {g >= 0 ? '+' : ''}{g.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 h-28">
          <RevenueTrendChart series={trends.series} totalRevenue={trends.total_revenue} />
        </div>
      </div>

      {/* ── Health breakdown ── */}
      <div className="card p-4">
        <p className="text-[11px] font-semibold mb-3" style={{ letterSpacing: '-0.01em' }}>Health Score Breakdown</p>
        <div className="space-y-2.5">
          {[
            { label: 'Revenue Growth', value: Math.round(health.breakdown.revenue_growth), color: '#6366f1' },
            { label: 'Sales Consistency', value: Math.round(health.breakdown.sales_consistency), color: '#8b5cf6' },
            { label: 'Product Movement', value: Math.round(health.breakdown.product_movement), color: '#10b981' },
          ].map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>{item.label}</span>
                <span className="text-[11px] font-bold font-mono" style={{ color: item.color }}>{item.value}/100</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: item.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-3 leading-relaxed" style={{ color: 'rgba(148,163,184,0.5)' }}>{health.explanation}</p>
      </div>

      {/* ── Category breakdown ── */}
      {categoryBreakdown.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
            <p className="text-[12px] font-semibold">Category Performance</p>
          </div>
          <div className="p-4 space-y-3">
            {categoryBreakdown.map((cat, i) => {
              const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
              const color = colors[i % colors.length]
              return (
                <div key={cat.cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium">{cat.cat}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{cat.units} units</span>
                      <span className="text-[11px] font-bold font-mono" style={{ color }}>{formatINR(cat.revenue)}</span>
                      <span className="text-[10px] font-semibold w-8 text-right" style={{ color }}>{cat.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Action items ── */}
      {opportunities.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[12px] font-semibold">Recommended Actions</p>
          </div>
          <div>
            {opportunities.map((op, i) => {
              const pc = priorityColors[op.priority]
              return (
                <div key={op.id} className="px-5 py-3.5 flex items-start gap-3"
                  style={{ borderBottom: i < opportunities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span className="text-base shrink-0 mt-0.5">{op.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12px] font-semibold">{op.title}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                        style={{ background: pc.bg, color: pc.dot, border: `1px solid ${pc.border}` }}>
                        {op.priority}
                      </span>
                    </div>
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
              )
            })}
          </div>
        </div>
      )}

      {/* ── Product tables ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-[11px] font-semibold">Top Sellers</p>
            <span className="ml-auto text-[9px] font-medium" style={{ color: 'rgba(148,163,184,0.4)' }}>{days}d window</span>
          </div>
          <div>
            {prodAnalytics.best_selling.slice(0, 5).map((p, i) => (
              <div key={p.product_id} className="data-row gap-3">
                <span className="text-[10px] font-bold w-4 shrink-0" style={{ color: 'rgba(148,163,184,0.3)' }}>{i + 1}</span>
                <span className="flex-1 text-[11px] font-medium truncate">{p.product_name}</span>
                {p.category && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 hidden sm:block"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{p.category}</span>
                )}
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold font-mono text-emerald-500">{formatINR(p.revenue)}</p>
                  <p className="text-[9px]" style={{ color: 'rgba(148,163,184,0.4)' }}>{p.units_sold} units</p>
                </div>
              </div>
            ))}
            {prodAnalytics.best_selling.length === 0 && (
              <p className="px-5 py-4 text-[11px]" style={{ color: 'rgba(148,163,184,0.4)' }}>No sales data yet.</p>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
            <Package className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[11px] font-semibold">Slow Movers</p>
            <span className="ml-auto text-[9px] font-medium" style={{ color: 'rgba(148,163,184,0.4)' }}>{days}d window</span>
          </div>
          <div>
            {prodAnalytics.slow_moving.slice(0, 5).map(p => (
              <div key={p.product_id} className="data-row gap-3">
                <span className="flex-1 text-[11px] font-medium truncate">{p.product_name}</span>
                {p.category && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 hidden sm:block"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{p.category}</span>
                )}
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold font-mono text-amber-500">{p.units_sold} sold</p>
                  <p className="text-[9px]" style={{ color: 'rgba(148,163,184,0.4)' }}>{formatINR(p.revenue)}</p>
                </div>
              </div>
            ))}
            {prodAnalytics.slow_moving.length === 0 && (
              <p className="px-5 py-4 text-[11px]" style={{ color: 'rgba(148,163,184,0.4)' }}>All products moving well.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── AI summary ── */}
      <div className="card p-4" style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.15)' }}>
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1.5">AI Summary · {days}-day period</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(203,213,225,0.8)' }}>{insights.summary}</p>
            {insights.highlights.length > 0 && (
              <div className="mt-2.5 space-y-1">
                {insights.highlights.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: 'rgba(148,163,184,0.65)' }}>
                    <span className="h-1 w-1 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                    {h}
                  </div>
                ))}
              </div>
            )}
            {insights.recommendations.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-violet-400 mb-1.5">Recommendations</p>
                <div className="space-y-1">
                  {insights.recommendations.slice(0, 2).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: 'rgba(148,163,184,0.65)' }}>
                      <span className="h-1 w-1 rounded-full bg-violet-400 shrink-0 mt-1.5" />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
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
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : 'rgba(148,163,184,0.4)'
  return (
    <div className="card p-4">
      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.45)' }}>{label}</p>
      <p className="text-[17px] font-bold font-mono mt-1.5 leading-none" style={{ color: valueColor ?? 'inherit', letterSpacing: '-0.03em' }}>{value}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <TrendIcon className="w-3 h-3 shrink-0" style={{ color: trendColor }} />
        <p className="text-[10px]" style={{ color: trendColor }}>{sub}</p>
      </div>
    </div>
  )
}

function IntelCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="card p-3.5" style={{ borderColor: `${color}18` }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color, opacity: 0.8 }}>{icon}</span>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.45)' }}>{label}</p>
      </div>
      <p className="text-[15px] font-bold font-mono leading-none" style={{ color, letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p className="text-[9px] mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>{sub}</p>}
    </div>
  )
}
