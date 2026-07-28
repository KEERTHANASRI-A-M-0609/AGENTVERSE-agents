import { useState, useMemo, useEffect } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { useDemandForecast } from '@/hooks/useDemandForecast'
import { AgentShell } from '@/components/agent/AgentShell'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { productsApi } from '@/api/products'
import { demandApi } from '@/api/demand'
import { ProductDrawer } from '@/components/agent/ProductDrawer'
import { BusinessAIAssistant } from '@/components/agent/BusinessAIAssistant'
import { DemandWorkspaceBody } from '@/components/agent/DemandWorkspaceBody'
import type { ProductResponse, BulkForecastItem } from '@/types'
import { BrainCircuit } from 'lucide-react'

const SHOP_ID = 'shop_001'
const HORIZONS = [7, 14, 30] as const

export default function Dashboard() {
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(7)
  const { data, loading, error, refetch } = useDashboard(SHOP_ID, horizon)
  const { data: prediction, predict } = useDemandForecast()

  const [products, setProducts] = useState<Record<string, ProductResponse>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null)
  const [selectedForecast, setSelectedForecast] = useState<BulkForecastItem | null>(null)

  useEffect(() => {
    productsApi.list(SHOP_ID).then(r =>
      setProducts(r.products.reduce((a, p) => ({ ...a, [p.id]: p }), {} as Record<string, ProductResponse>))
    ).catch(() => {})
  }, [])

  const openDrawer = (prod: ProductResponse, item: BulkForecastItem) => {
    setSelectedProduct(prod)
    setSelectedForecast(item)
    setDrawerOpen(true)
    void predict(SHOP_ID, item.product_id, horizon)
  }

  const getReqId = (productId: string) =>
    data?.recent_predictions.find(p => p.product_id === productId)?.request_id

  const handleExport = () => {
    if (!data) return
    const portfolio = data.portfolio?.length ? data.portfolio : data.top_reorder_products
    const rows = portfolio.map(f =>
      [f.product_id, `"${f.product_name}"`, Math.round(f.total_predicted_units), f.confidence_score.toFixed(2), f.trend_type, f.urgency, f.days_until_stockout ?? ''].join(',')
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([['sku,product,predicted_units,confidence,trend,urgency,days_until_stockout', ...rows].join('\n')], { type: 'text/csv' }))
    a.download = `demand_${SHOP_ID}_${horizon}d.csv`
    a.click()
  }

  const riskSummary = useMemo(() => {
    if (!data) return null
    const portfolio = data.portfolio?.length ? data.portfolio : data.top_reorder_products
    const critical = portfolio.filter(i => i.urgency === 'high' && (i.days_until_stockout ?? 99) <= 3).length
    const high = portfolio.filter(i => i.urgency === 'high' && (i.days_until_stockout ?? 99) > 3).length
    return { critical, high, total: portfolio.length }
  }, [data])

  return (
    <AgentShell
      agent="demand"
      shopName={data?.shop_name ?? SHOP_ID}
      onRefresh={refetch}
      refreshing={loading}
      onExport={handleExport}
      horizonControls={
        <div className="flex rounded border border-gray-200 dark:border-white/10 p-0.5 bg-gray-50 dark:bg-black/20">
          {HORIZONS.map(h => (
            <button key={h} onClick={() => setHorizon(h)}
              className={`px-2.5 py-1 text-xs font-mono rounded-sm transition-all ${horizon === h ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}>
              {h}d
            </button>
          ))}
        </div>
      }
    >
      {loading && !data && <LoadingSkeleton rows={6} />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <div className="space-y-5">

          {/* ── Agent Status Bar ── */}
          <div className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Demand Prediction Agent</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                Checked {riskSummary?.total ?? 0} products over {horizon} days ·{' '}
                {riskSummary?.critical ? `${riskSummary.critical} product${riskSummary.critical !== 1 ? 's' : ''} running out very soon — order today` :
                 riskSummary?.high ? `${riskSummary.high} product${riskSummary.high !== 1 ? 's' : ''} need ordering this week` :
                 'All products are well stocked'}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-indigo-500 shrink-0 hidden sm:block bg-indigo-100 dark:bg-indigo-500/20 px-3 py-1 rounded-full">{horizon}-day forecast</span>
          </div>

          {/* ── Two-column: AI Co-Pilot + Workspace ── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

            {/* LEFT — AI Co-Pilot */}
            <div className="xl:col-span-2">
              <BusinessAIAssistant mode="demand" shopId={SHOP_ID} demand={data} horizon={horizon} />
            </div>

            {/* RIGHT — Agent Workspace */}
            <div className="xl:col-span-3">
              <DemandWorkspaceBody
                data={data}
                products={products}
                onSelect={() => {}}
                onOpenDrawer={openDrawer}
                onReorderAction={async (productId, action, qty) => {
                  const reqId = getReqId(productId)
                  if (reqId) await demandApi.recommendationAction(reqId, action, qty)
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ProductDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={selectedProduct}
        forecast={selectedForecast}
        dailyPredictions={prediction?.forecast?.daily_predictions}
        requestId={prediction?.request_id}
        onReorderAction={async (action, qty) => {
          if (selectedProduct) {
            const reqId = getReqId(selectedProduct.id)
            if (reqId) await demandApi.recommendationAction(reqId, action, qty)
          }
        }}
      />
    </AgentShell>
  )
}
