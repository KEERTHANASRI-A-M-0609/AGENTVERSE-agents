import { IndianRupee, ShoppingBag, Package, TrendingUp, TrendingDown } from 'lucide-react'
import type { AnalyticsDashboardKPIs } from '@/types'
import { formatINR } from '@/lib/utils'

interface Props {
  kpis: AnalyticsDashboardKPIs
}

export function AnalyticsKPICards({ kpis }: Props) {
  const growthPositive = kpis.revenue_growth_pct >= 0
  const GrowthIcon = growthPositive ? TrendingUp : TrendingDown

  const cards = [
    {
      label: 'Revenue',
      value: formatINR(kpis.todays_revenue),
      hint: 'Today',
      icon: IndianRupee,
    },
    {
      label: 'Orders',
      value: kpis.total_orders.toLocaleString('en-IN'),
      hint: 'Sale lines today',
      icon: ShoppingBag,
    },
    {
      label: 'Products sold',
      value: kpis.total_products_sold.toLocaleString('en-IN'),
      hint: 'Units today',
      icon: Package,
    },
    {
      label: 'Revenue growth',
      value: `${growthPositive ? '+' : ''}${kpis.revenue_growth_pct.toFixed(1)}%`,
      hint: 'vs yesterday',
      icon: GrowthIcon,
      valueClass: growthPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, hint, icon: Icon, valueClass }) => (
        <div key={label} className="panel p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">{label}</p>
            <Icon className="w-4 h-4 text-brand-600 opacity-80" />
          </div>
          <p
            className={`mt-3 font-mono text-2xl font-medium tabular-nums ${
              valueClass ?? 'text-ink-900 dark:text-white'
            }`}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-ink-500">{hint}</p>
        </div>
      ))}
    </div>
  )
}
