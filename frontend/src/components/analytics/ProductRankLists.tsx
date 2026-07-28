import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ProductSalesItem } from '@/types'
import { formatINR } from '@/lib/utils'
import { EmptyState } from '@/components/shared/EmptyState'

interface RankListProps {
  title: string
  variant: 'best' | 'slow'
  items: ProductSalesItem[]
}

function RankList({ title, variant, items }: RankListProps) {
  const Icon = variant === 'best' ? TrendingUp : TrendingDown
  const iconClass = variant === 'best' ? 'text-emerald-600' : 'text-amber-600'

  return (
    <div className="panel p-5">
      <h3 className="font-display text-base text-ink-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconClass}`} />
        {title}
      </h3>
      {items.length === 0 ? (
        <EmptyState message="No products to rank yet" />
      ) : (
        <ol className="space-y-0">
          {items.map((item, index) => (
            <li
              key={item.product_id}
              className="flex items-center justify-between gap-3 py-2.5 border-b border-ink-50 dark:border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs text-ink-500 w-5 shrink-0">{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm text-ink-800 dark:text-gray-200 truncate">{item.product_name}</p>
                  <p className="text-[11px] text-ink-500 truncate">
                    {item.category ?? 'Uncategorized'} · {item.product_id}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono tabular-nums text-ink-900 dark:text-white">
                  {item.units_sold.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] font-mono text-ink-500">{formatINR(item.revenue)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

interface Props {
  bestSelling: ProductSalesItem[]
  slowMoving: ProductSalesItem[]
}

export function ProductRankLists({ bestSelling, slowMoving }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <RankList title="Best-selling products" variant="best" items={bestSelling} />
      <RankList title="Slow-moving products" variant="slow" items={slowMoving} />
    </div>
  )
}
