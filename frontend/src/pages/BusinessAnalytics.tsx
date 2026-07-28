import { useState, useEffect } from 'react'
import { useAnalyticsDashboard } from '@/hooks/useAnalyticsDashboard'
import { AgentShell, MONTH_FILTERS, type MonthFilter } from '@/components/agent/AgentShell'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { BusinessAIAssistant } from '@/components/agent/BusinessAIAssistant'
import { AnalyticsWorkspaceBody } from '@/components/agent/AnalyticsWorkspaceBody'
import { ProductDrawer } from '@/components/agent/ProductDrawer'
import { productsApi } from '@/api/products'
import type { ProductResponse, BulkForecastItem } from '@/types'
import {
  BarChart3, TrendingUp, TrendingDown, Activity, ShieldCheck,
  MessageSquare, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { formatINR } from '@/lib/utils'

const SHOP_ID = 'shop_001'

export default function BusinessAnalytics() {
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('this_month')
  const days = MONTH_FILTERS.find(f => f.value === monthFilter)?.days ?? 30
  const { data, loading, error, refetch } = useAnalyticsDashboard(SHOP_ID, days)

  const [products, setProducts] = useState<Record<string, ProductResponse>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null)
  const [selectedForecast, setSelectedForecast] = useState<BulkForecastItem | null>(null)
  const [copilotOpen, setCopilotOpen] = useState(true)

  useEffect(() => {
    productsApi.list(SHOP_ID).then(r =>
      setProducts(r.products.reduce((a, p) => ({ ...a, [p.id]: p }), {} as Record<string, ProductResponse>))
    ).catch(() => {})
  }, [])

  const openDrawer = (prod: ProductResponse, item: BulkForecastItem) => {
    setSelectedProduct(prod); setSelectedForecast(item); setDrawerOpen(true)
  }

  const handleExport = () => {
    if (!data) return
    const { dashboard, health, insights, products: prods, trends } = data
    const lines = [
      'ShopMind BI Report',
      `Shop,${SHOP_ID}`, `Period,${days} days`, `As of,${dashboard.as_of}`,
      `Health Score,${Math.round(health.health_score)}`,
      `Revenue,${formatINR(dashboard.kpis.todays_revenue)}`,
      `Growth %,${dashboard.kpis.revenue_growth_pct.toFixed(1)}`,
      `Period Revenue,${formatINR(trends.total_revenue)}`,
      '', 'Recommendations', ...insights.recommendations,
      '', 'Best Sellers', ...prods.best_selling.map(p => `${p.product_name},${p.units_sold},${p.revenue}`),
      '', 'Slow Movers', ...prods.slow_moving.map(p => `${p.product_name},${p.units_sold},${p.revenue}`),
    ]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    a.download = `bi_report_${SHOP_ID}_${days}d.csv`
    a.click()
  }

  const h = Math.round(data?.health.health_score ?? 0)
  const g = data?.dashboard.kpis.revenue_growth_pct ?? 0
  const revenue = data?.dashboard.kpis.todays_revenue ?? 0
  const orders = data?.dashboard.kpis.total_orders ?? 0

  return (
    <AgentShell
      agent="analytics"
      shopName={data?.dashboard.shop_name ?? SHOP_ID}
      onRefresh={refetch}
      refreshing={loading}
      onExport={handleExport}
      monthFilter={monthFilter}
      onMonthFilterChange={setMonthFilter}
    >
      {loading && !data && <div className="p-6"><LoadingSkeleton rows={6} /></div>}
      {error && <div className="p-6"><ErrorState message={error} onRetry={refetch} /></div>}

      {data && (
        <div className="flex flex-col min-h-[calc(100vh-52px)]">

          {/* ── Page header ── */}
          <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">

              {/* Title block */}
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', boxShadow: '0 0 16px rgba(139,92,246,0.25)' }}>
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold" style={{ color: 'inherit', letterSpacing: '-0.01em' }}>
                      Business Intelligence
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider"
                      style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    {(data.products.best_selling.length + data.products.slow_moving.length)} products ·{' '}
                    {MONTH_FILTERS.find(f => f.value === monthFilter)?.label}
                  </p>
                </div>
              </div>

              {/* KPI strip */}
              <div className="flex items-center gap-2 flex-wrap">
                <KPIChip
                  icon={<Activity className="w-3 h-3" />}
                  label="Health"
                  value={`${h}/100`}
                  tone={h >= 70 ? 'good' : h >= 50 ? 'warn' : 'bad'}
                />
                <KPIChip
                  icon={g >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  label="Revenue"
                  value={formatINR(revenue)}
                  sub={`${g >= 0 ? '+' : ''}${g.toFixed(1)}%`}
                  tone={g >= 0 ? 'good' : 'bad'}
                />
                <KPIChip
                  icon={<ShieldCheck className="w-3 h-3" />}
                  label="Orders"
                  value={orders.toString()}
                  tone="neutral"
                />
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex flex-1 min-h-0">

            {/* Workspace */}
            <div className="flex-1 overflow-y-auto p-5 min-w-0">
              <AnalyticsWorkspaceBody
                data={data}
                products={products}
                onOpenDrawer={openDrawer}
                days={days}
              />
            </div>

            {/* Co-pilot panel */}
            <div className="shrink-0 flex flex-col transition-all duration-300"
              style={{
                width: copilotOpen ? 320 : 40,
                borderLeft: '1px solid rgba(255,255,255,0.055)',
              }}>

              {/* Toggle */}
              <button
                onClick={() => setCopilotOpen(v => !v)}
                className="h-[52px] flex items-center gap-2 px-3 w-full shrink-0 transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: '#8b5cf6' }} />
                {copilotOpen && (
                  <span className="text-[11px] font-semibold flex-1 text-left" style={{ color: 'rgba(148,163,184,0.8)' }}>
                    BI Co-Pilot
                  </span>
                )}
                {copilotOpen
                  ? <ChevronRight className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.4)' }} />
                  : <ChevronLeft className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.4)' }} />
                }
              </button>

              {copilotOpen && (
                <div className="flex-1 overflow-hidden">
                  <BusinessAIAssistant
                    mode="analytics"
                    shopId={SHOP_ID}
                    analytics={data}
                    horizon={days}
                    inline
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ProductDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={selectedProduct}
        forecast={selectedForecast}
        onReorderAction={async () => {}}
      />
    </AgentShell>
  )
}

function KPIChip({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string; sub?: string
  tone: 'good' | 'bad' | 'warn' | 'neutral'
}) {
  const colors = {
    good:    { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.18)',  text: '#10b981' },
    bad:     { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)',   text: '#ef4444' },
    warn:    { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.18)',  text: '#f59e0b' },
    neutral: { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.18)', text: '#818cf8' },
  }
  const c = colors[tone]
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <span style={{ color: c.text }}>{icon}</span>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: c.text, opacity: 0.7 }}>{label}</p>
        <p className="text-[11px] font-bold font-mono leading-none mt-0.5" style={{ color: c.text }}>{value}</p>
      </div>
      {sub && <span className="text-[10px] font-semibold ml-0.5" style={{ color: c.text }}>{sub}</span>}
    </div>
  )
}
