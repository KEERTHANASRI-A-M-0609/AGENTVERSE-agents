import type { ProductSalesItem } from '@/types'
import { formatINR } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'

interface ScoredProduct {
  product_id: string
  product_name: string
  category: string | null
  units_sold: number
  revenue: number
  score: number          // 0–100 composite
  signal: 'grow' | 'protect' | 'promote' | 'review'
  action: string
}

function scoreProduct(p: ProductSalesItem, maxRevenue: number, maxUnits: number): ScoredProduct {
  const revScore = maxRevenue > 0 ? (p.revenue / maxRevenue) * 60 : 0
  const velScore = maxUnits > 0 ? (p.units_sold / maxUnits) * 40 : 0
  const score = Math.round(revScore + velScore)

  let signal: ScoredProduct['signal']
  let action: string

  if (score >= 70) { signal = 'grow'; action = 'Keep well-stocked. Prioritize in reorder cycles.' }
  else if (score >= 45) { signal = 'protect'; action = 'Maintain stock. Monitor for demand shifts.' }
  else if (score >= 20) { signal = 'promote'; action = 'Run a promotion or bundle to lift velocity.' }
  else { signal = 'review'; action = 'Review pricing or consider discontinuing.' }

  return { ...p, score, signal, action }
}

const SIGNAL_CONFIG = {
  grow: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'Grow' },
  protect: { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', label: 'Protect' },
  promote: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', label: 'Promote' },
  review: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10', label: 'Review' },
}

interface Props {
  bestSelling: ProductSalesItem[]
  slowMoving: ProductSalesItem[]
}

export function ProductScorecard({ bestSelling, slowMoving }: Props) {
  const all = [...bestSelling, ...slowMoving]
  const seen = new Set<string>()
  const unique = all.filter(p => { if (seen.has(p.product_id)) return false; seen.add(p.product_id); return true })

  const maxRevenue = Math.max(...unique.map(p => p.revenue), 1)
  const maxUnits = Math.max(...unique.map(p => p.units_sold), 1)

  const scored = unique
    .map(p => scoreProduct(p, maxRevenue, maxUnits))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-12 text-[9px] font-semibold uppercase tracking-wider text-gray-400 px-1 mb-2">
        <span className="col-span-4">Product</span>
        <span className="col-span-2 text-right">Revenue</span>
        <span className="col-span-2 text-right">Units</span>
        <span className="col-span-1 text-right">Score</span>
        <span className="col-span-3 text-right">Signal</span>
      </div>
      {scored.map(p => {
        const cfg = SIGNAL_CONFIG[p.signal]
        const Icon = cfg.icon
        const barW = `${p.score}%`
        return (
          <div key={p.product_id} className="group rounded border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors overflow-hidden">
            <div className="grid grid-cols-12 items-center px-3 py-2.5 gap-1">
              <div className="col-span-4 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{p.product_name}</p>
                <p className="text-[9px] text-gray-400">{p.category ?? '—'}</p>
              </div>
              <span className="col-span-2 text-right text-[11px] font-mono text-gray-700 dark:text-gray-300">{formatINR(p.revenue)}</span>
              <span className="col-span-2 text-right text-[11px] font-mono text-gray-700 dark:text-gray-300">{p.units_sold}</span>
              <span className="col-span-1 text-right text-[11px] font-bold font-mono text-gray-900 dark:text-white">{p.score}</span>
              <div className="col-span-3 flex justify-end">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                  <Icon className="w-2.5 h-2.5" />
                  {cfg.label}
                </span>
              </div>
            </div>
            {/* Score bar + action — visible on hover */}
            <div className="hidden group-hover:block px-3 pb-2.5">
              <div className="h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${p.score >= 70 ? 'bg-emerald-500' : p.score >= 45 ? 'bg-blue-500' : p.score >= 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: barW }} />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{p.action}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
