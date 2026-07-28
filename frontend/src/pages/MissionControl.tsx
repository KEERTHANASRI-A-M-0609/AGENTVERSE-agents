import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, TrendingUp, TrendingDown, BrainCircuit, BarChart3, Zap } from 'lucide-react'
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

function HealthRing({ value, size = 120 }: { value: number; size?: number }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - value / 100)
  const color = value >= 70 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444'
  const glow = value >= 70 ? 'rgba(16,185,129,0.3)' : value >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${glow})`, transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold leading-none" style={{ fontSize: size * 0.22, color }}>{value}</span>
        <span className="label mt-0.5">health</span>
      </div>
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="progress-track w-full">
      <div className="progress-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
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
    const alerts = demand.stockout_alerts.slice(0, 4)
    const best = analytics.products.best_selling[0]
    const slow = analytics.products.slow_moving[0]
    const top = alerts[0] ?? demand.top_reorder_products[0]
    const synced = lastUpdated ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true }) : 'just now'
    return { health, g, invHealth, conf, alerts, best, slow, top, synced,
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
    <OSShell title="Mission Control" shopName={data?.demand.shop_name ?? SHOP_ID}
      onRefresh={refetch} refreshing={loading} onExport={exportReport}>
      {loading && !data && <LoadingSkeleton rows={6} />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && d && (
        <div className="space-y-8 animate-fadeUp max-w-6xl">

          {/* ── Hero ── */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="label mb-2">{greeting()} · synced {d.synced}</p>
              <h1 className="text-5xl font-bold tracking-tight" style={{ letterSpacing: '-0.04em' }}>
                Mission Control
              </h1>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="dot-live" />
              <span className="text-sm font-semibold" style={{ color: '#10b981' }}>2 agents live</span>
            </div>
          </div>

          {/* ── Hero KPI Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeUp-d1">

            {/* Revenue — hero card */}
            <div className="card p-6 col-span-2 lg:col-span-1 flex flex-col gap-3">
              <span className="label">Revenue today</span>
              <div>
                <div className="kpi-num" style={{ color: '#f1f5f9' }}>{formatINR(d.revenue)}</div>
                <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${d.g >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {d.g >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {d.g >= 0 ? '+' : ''}{d.g.toFixed(1)}%
                </div>
              </div>
              <MiniBar value={Math.abs(d.g)} max={20} color={d.g >= 0 ? '#10b981' : '#ef4444'} />
            </div>

            {/* Health ring */}
            <div className="card p-6 flex flex-col items-center justify-center gap-2">
              <HealthRing value={d.health} size={100} />
            </div>

            {/* Inventory */}
            <div className="card p-6 flex flex-col gap-3">
              <span className="label">Inventory</span>
              <div className="kpi-num-sm" style={{ color: d.invHealth >= 70 ? '#10b981' : '#f59e0b' }}>{d.invHealth}<span className="text-lg font-normal opacity-40">/100</span></div>
              <div className="flex items-center gap-2">
                {d.urgentSkus > 0
                  ? <span className="badge-critical">{d.urgentSkus} need ordering</span>
                  : <span className="badge-healthy">All stocked</span>}
              </div>
              <MiniBar value={d.invHealth} max={100} color={d.invHealth >= 70 ? '#10b981' : '#f59e0b'} />
            </div>

            {/* Confidence */}
            <div className="card p-6 flex flex-col gap-3">
              <span className="label">AI Confidence</span>
              <div className="kpi-num-sm" style={{ color: '#6366f1' }}>{d.conf}<span className="text-lg font-normal opacity-40">%</span></div>
              <div className="flex items-center gap-2">
                <span className="badge-ai">{d.skus} products</span>
              </div>
              <MiniBar value={d.conf} max={100} color="#6366f1" />
            </div>
          </div>

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeUp-d2">

            {/* LEFT: Alerts + Activity */}
            <div className="lg:col-span-2 space-y-6">

              {/* Stockout Alerts */}
              <div className="card overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div className={d.alerts.length > 0 ? 'dot-critical' : 'dot-live'} />
                    <span className="text-sm font-semibold">Stockout Alerts</span>
                  </div>
                  {d.alerts.length > 0 && (
                    <span className="badge-critical">{d.alerts.length}</span>
                  )}
                </div>
                {d.alerts.length === 0 ? (
                  <div className="px-6 py-8 flex flex-col items-center gap-2 text-center">
                    <div className="dot-live mx-auto" />
                    <span className="text-sm font-medium mt-2" style={{ color: '#10b981' }}>All stocked</span>
                    <span className="label">Agents monitoring</span>
                  </div>
                ) : (
                  <div>
                    {d.alerts.map((a) => (
                      <div key={a.product_id} className="px-6 py-4 flex items-center justify-between gap-4"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-3">
                          <div className={a.urgency === 'high' ? 'dot-critical' : 'dot-warn'} />
                          <div>
                            <p className="text-sm font-semibold">{a.product_name}</p>
                            <p className="label mt-0.5">
                              {a.days_until_stockout != null
                                ? a.days_until_stockout <= 1 ? 'Runs out today' : `Runs out in ${a.days_until_stockout} day${a.days_until_stockout !== 1 ? 's' : ''}`
                                : 'Running low — order soon'}
                            </p>
                          </div>
                        </div>
                        <Link to={AGENTS.demand.path}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
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
                      <TrendingUp className="w-4 h-4" style={{ color: '#10b981' }} />
                    </div>
                    <p className="text-base font-bold leading-tight">{d.best.product_name}</p>
                    <div className="kpi-num-sm" style={{ color: '#10b981' }}>{formatINR(d.best.revenue)}</div>
                    <MiniBar value={d.best.units_sold} max={d.best.units_sold * 1.5} color="#10b981" />
                  </div>
                )}
                {d.slow && (
                  <div className="card p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="label">Slow Mover</span>
                      <TrendingDown className="w-4 h-4" style={{ color: '#f59e0b' }} />
                    </div>
                    <p className="text-base font-bold leading-tight">{d.slow.product_name}</p>
                    <div className="kpi-num-sm" style={{ color: '#f59e0b' }}>{d.slow.units_sold}<span className="text-sm font-normal opacity-40"> units</span></div>
                    <MiniBar value={d.slow.units_sold} max={100} color="#f59e0b" />
                  </div>
                )}
              </div>

              {/* Recent Decisions */}
              <div className="card overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-sm font-semibold">Recent Forecasts</span>
                </div>
                <div>
                  {data.demand.recent_predictions.slice(0, 4).map((p) => (
                    <div key={p.request_id} className="px-6 py-3.5 flex items-center justify-between gap-4"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-3">
                        <div className={p.reorder_required ? 'dot-warn' : 'dot-live'} />
                        <span className="text-sm font-medium">{p.product_name ?? p.product_id}</span>
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

            {/* RIGHT: Agent Status + Advisor */}
            <div className="space-y-4">

              {/* Agent Cards */}
              <Link to={AGENTS.demand.path} className="card p-5 flex flex-col gap-4 block transition-all hover:border-indigo-500/30"
                style={{ textDecoration: 'none' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                      <BrainCircuit className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Demand Agent</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="dot-live" style={{ width: 6, height: 6 }} />
                        <span className="label" style={{ color: '#10b981' }}>
                          {d.urgentSkus > 0 ? 'Watching risk' : 'Monitoring'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: 'rgba(148,163,184,0.4)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="label block mb-1">Confidence</span>
                    <span className="text-lg font-bold font-mono" style={{ color: '#818cf8' }}>{d.conf}%</span>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="label block mb-1">Urgent</span>
                    <span className="text-lg font-bold font-mono" style={{ color: d.urgentSkus > 0 ? '#f87171' : '#10b981' }}>{d.urgentSkus}</span>
                  </div>
                </div>
                {d.top && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    <Zap className="w-3 h-3" style={{ color: '#f59e0b' }} />
                    Review {d.top.product_name}
                  </div>
                )}
              </Link>

              <Link to={AGENTS.intelligence.path} className="card p-5 flex flex-col gap-4 block transition-all hover:border-violet-500/30"
                style={{ textDecoration: 'none' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                      <BarChart3 className="w-4 h-4" style={{ color: '#c4b5fd' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">BI Agent</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="dot-live" style={{ width: 6, height: 6 }} />
                        <span className="label" style={{ color: '#10b981' }}>Reporting</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: 'rgba(148,163,184,0.4)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="label block mb-1">Health</span>
                    <span className="text-lg font-bold font-mono" style={{ color: d.health >= 70 ? '#10b981' : d.health >= 50 ? '#f59e0b' : '#ef4444' }}>{d.health}</span>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="label block mb-1">Growth</span>
                    <span className="text-lg font-bold font-mono" style={{ color: d.g >= 0 ? '#10b981' : '#ef4444' }}>{d.g >= 0 ? '+' : ''}{d.g.toFixed(1)}%</span>
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
