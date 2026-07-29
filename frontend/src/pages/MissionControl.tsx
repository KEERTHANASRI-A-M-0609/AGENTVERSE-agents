import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowRight, TrendingUp, TrendingDown, BrainCircuit, BarChart3,
  Zap, Package, ShoppingCart, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react'
import { useMissionControl } from '@/hooks/useMissionControl'
import { OSShell } from '@/components/os/OSShell'
import { BusinessAdvisor } from '@/components/os/BusinessAdvisor'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { AGENTS, SHOP_ID } from '@/lib/agents'
import { formatINR } from '@/lib/utils'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="progress-track w-full">
      <div className="progress-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  )
}

function KPICard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="kpi-num-sm" style={{ color: 'var(--text-1)' }}>{value}</div>
      {sub && <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{sub}</p>}
    </div>
  )
}

export default function MissionControl() {
  const { data, loading, error, lastUpdated, refetch } = useMissionControl()

  const d = useMemo(() => {
    if (!data) return null
    const { demand, analytics } = data
    const health = Math.round(analytics.health.health_score)
    const g = analytics.dashboard.kpis.revenue_growth_pct
    const invHealth = Math.round(demand.kpis.inventory_health_score)
    const conf = Math.round(demand.kpis.avg_confidence_score * 100)
    const alerts = demand.stockout_alerts.slice(0, 5)
    const best = analytics.products.best_selling[0]
    const slow = analytics.products.slow_moving[0]
    const top = alerts[0] ?? demand.top_reorder_products[0]
    const synced = lastUpdated ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true }) : 'just now'
    return {
      health, g, invHealth, conf, alerts, best, slow, top, synced,
      revenue: analytics.dashboard.kpis.todays_revenue,
      orders: analytics.dashboard.kpis.total_orders,
      skus: demand.kpis.total_products,
      urgentSkus: demand.kpis.high_urgency_products,
    }
  }, [data, lastUpdated])

  const exportReport = () => {
    if (!data || !d) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([`ShopMind Report\nRevenue: ${d.revenue}\nHealth: ${d.health}/100`], { type: 'text/plain' }))
    a.download = `shopmind_${SHOP_ID}.txt`; a.click()
  }

  return (
    <OSShell title="Dashboard" shopName={data?.demand.shop_name ?? SHOP_ID}
      onRefresh={refetch} refreshing={loading} onExport={exportReport}>
      {loading && !data && <LoadingSkeleton rows={6} />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && d && (
        <div className="space-y-6 animate-fadeUp max-w-6xl">

          {/* ── User greeting ── */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="label mb-1">{greeting()} · synced {d.synced}</p>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
                Welcome back, <span style={{ color: 'var(--blue)' }}>Admin</span>
              </h1>
              <p className="text-[13px] mt-1" style={{ color: 'var(--text-2)' }}>
                Here's what needs your attention today across {d.skus} products.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: 'var(--green-lt)', border: '1px solid var(--green-bd)' }}>
              <div className="dot-live" />
              <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>2 agents live</span>
            </div>
          </div>

          {/* ── Attention banner (if urgent) ── */}
          {d.urgentSkus > 0 && (
            <div className="rounded-lg p-4 flex items-center gap-3"
              style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--red)' }} />
              <p className="text-[13px] font-semibold" style={{ color: 'var(--red)' }}>
                {d.urgentSkus} product{d.urgentSkus !== 1 ? 's' : ''} need immediate restocking — review the Demand Agent now.
              </p>
              <Link to={AGENTS.demand.path}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold shrink-0"
                style={{ background: 'var(--red)', color: '#fff' }}>
                Review <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeUp-d1">
            <KPICard label="Revenue Today" value={formatINR(d.revenue)}
              sub={`${d.g >= 0 ? '+' : ''}${d.g.toFixed(1)}% vs yesterday`}
              color={d.g >= 0 ? 'var(--green)' : 'var(--red)'}
              icon={d.g >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} />
            <KPICard label="Business Health" value={`${d.health}/100`}
              sub={d.health >= 70 ? 'Performing well' : d.health >= 50 ? 'Needs attention' : 'Action required'}
              color={d.health >= 70 ? 'var(--green)' : d.health >= 50 ? 'var(--amber)' : 'var(--red)'}
              icon={<CheckCircle2 className="w-4 h-4" />} />
            <KPICard label="Total Orders" value={d.orders.toString()}
              sub={`${d.skus} products tracked`}
              color="var(--blue)"
              icon={<ShoppingCart className="w-4 h-4" />} />
            <KPICard label="Urgent Reorders" value={d.urgentSkus.toString()}
              sub={d.urgentSkus === 0 ? 'All stocked' : 'Need ordering'}
              color={d.urgentSkus > 0 ? 'var(--red)' : 'var(--green)'}
              icon={<Package className="w-4 h-4" />} />
          </div>

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fadeUp-d2">

            {/* LEFT: Alerts + Product signals */}
            <div className="lg:col-span-2 space-y-5">

              {/* Stockout Alerts */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <div className={d.alerts.length > 0 ? 'dot-critical' : 'dot-live'} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Stockout Alerts</span>
                  </div>
                  {d.alerts.length > 0
                    ? <span className="badge-critical">{d.alerts.length} urgent</span>
                    : <span className="badge-healthy">All clear</span>}
                </div>
                {d.alerts.length === 0 ? (
                  <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
                    <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--green)' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--green)' }}>All products well stocked</span>
                    <span className="label">Agents monitoring continuously</span>
                  </div>
                ) : (
                  <div>
                    {d.alerts.map((a) => (
                      <div key={a.product_id} className="px-5 py-3.5 flex items-center justify-between gap-4"
                        style={{ borderBottom: '1px solid var(--border-2)' }}>
                        <div className="flex items-center gap-3">
                          <div className={a.urgency === 'high' ? 'dot-critical' : 'dot-warn'} />
                          <div>
                            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{a.product_name}</p>
                            <p className="label mt-0.5">
                              {a.days_until_stockout != null
                                ? a.days_until_stockout <= 1 ? 'Runs out today'
                                : `Runs out in ${a.days_until_stockout} day${a.days_until_stockout !== 1 ? 's' : ''}`
                                : 'Running low — order soon'}
                            </p>
                          </div>
                        </div>
                        <Link to={AGENTS.demand.path}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                          style={{ background: 'var(--red-lt)', color: 'var(--red)', border: '1px solid var(--red-bd)' }}>
                          Restock <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Signals */}
              <div className="grid grid-cols-2 gap-4">
                {d.best && (
                  <div className="card p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="label">Top Seller</span>
                      <TrendingUp className="w-4 h-4" style={{ color: 'var(--green)' }} />
                    </div>
                    <p className="text-[14px] font-bold leading-tight" style={{ color: 'var(--text-1)' }}>{d.best.product_name}</p>
                    <div className="kpi-num-sm" style={{ color: 'var(--green)' }}>{formatINR(d.best.revenue)}</div>
                    <MiniBar value={d.best.units_sold} max={d.best.units_sold * 1.5} color="var(--green)" />
                  </div>
                )}
                {d.slow && (
                  <div className="card p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="label">Slow Mover</span>
                      <TrendingDown className="w-4 h-4" style={{ color: 'var(--amber)' }} />
                    </div>
                    <p className="text-[14px] font-bold leading-tight" style={{ color: 'var(--text-1)' }}>{d.slow.product_name}</p>
                    <div className="kpi-num-sm" style={{ color: 'var(--amber)' }}>{d.slow.units_sold}<span className="text-sm font-normal" style={{ color: 'var(--text-3)' }}> units</span></div>
                    <MiniBar value={d.slow.units_sold} max={100} color="var(--amber)" />
                  </div>
                )}
              </div>

              {/* Recent Forecasts */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Recent Forecasts</span>
                </div>
                <div>
                  {data.demand.recent_predictions.slice(0, 5).map((p) => (
                    <div key={p.request_id} className="px-5 py-3 flex items-center justify-between gap-4"
                      style={{ borderBottom: '1px solid var(--border-2)' }}>
                      <div className="flex items-center gap-3">
                        <div className={p.reorder_required ? 'dot-warn' : 'dot-live'} />
                        <span className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>{p.product_name ?? p.product_id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={p.reorder_required ? 'badge-attention' : 'badge-healthy'}>
                          {p.reorder_required ? 'Order needed' : 'Stocked'}
                        </span>
                        <span className="label">{Math.round(p.total_predicted_units)} units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Agent cards + Advisor */}
            <div className="space-y-4">

              {/* Demand Agent card */}
              <Link to={AGENTS.demand.path}
                className="card p-5 flex flex-col gap-4 block transition-all"
                style={{ textDecoration: 'none' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-bd)' }}>
                      <BrainCircuit className="w-4 h-4" style={{ color: 'var(--blue)' }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Demand Agent</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="dot-live" style={{ width: 6, height: 6 }} />
                        <span className="label" style={{ color: 'var(--green)' }}>
                          {d.urgentSkus > 0 ? 'Watching risk' : 'Monitoring'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="label block mb-1">Confidence</span>
                    <span className="text-[18px] font-bold" style={{ color: 'var(--blue)' }}>{d.conf}%</span>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="label block mb-1">Urgent</span>
                    <span className="text-[18px] font-bold" style={{ color: d.urgentSkus > 0 ? 'var(--red)' : 'var(--green)' }}>{d.urgentSkus}</span>
                  </div>
                </div>
                {d.top && (
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
                    <Zap className="w-3 h-3" style={{ color: 'var(--amber)' }} />
                    Review {d.top.product_name}
                  </div>
                )}
              </Link>

              {/* BI Agent card */}
              <Link to={AGENTS.intelligence.path}
                className="card p-5 flex flex-col gap-4 block transition-all"
                style={{ textDecoration: 'none' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-bd)' }}>
                      <BarChart3 className="w-4 h-4" style={{ color: 'var(--blue)' }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>BI Agent</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="dot-live" style={{ width: 6, height: 6 }} />
                        <span className="label" style={{ color: 'var(--green)' }}>Reporting</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="label block mb-1">Health</span>
                    <span className="text-[18px] font-bold"
                      style={{ color: d.health >= 70 ? 'var(--green)' : d.health >= 50 ? 'var(--amber)' : 'var(--red)' }}>
                      {d.health}
                    </span>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="label block mb-1">Growth</span>
                    <span className="text-[18px] font-bold"
                      style={{ color: d.g >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {d.g >= 0 ? '+' : ''}{d.g.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Link>

              {/* Business Advisor */}
              <BusinessAdvisor demand={data.demand} analytics={data.analytics} compact />
            </div>
          </div>
        </div>
      )}
    </OSShell>
  )
}
