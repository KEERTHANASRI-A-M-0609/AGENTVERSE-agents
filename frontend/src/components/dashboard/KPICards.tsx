import { Activity, AlertTriangle, BarChart3, ShieldCheck } from 'lucide-react'
import type { DashboardKPI } from '@/types'
import { formatConfidence } from '@/lib/utils'

interface Props {
  kpis: DashboardKPI
}

const cards = [
  {
    key: 'total_products' as const,
    label: 'Active SKUs',
    icon: ShieldCheck,
    format: (v: number) => v.toString(),
    hint: 'Tracked assortment',
  },
  {
    key: 'high_urgency_products' as const,
    label: 'Critical reorders',
    icon: AlertTriangle,
    format: (v: number) => v.toString(),
    hint: 'Act within 3 days',
  },
  {
    key: 'avg_confidence_score' as const,
    label: 'Model confidence',
    icon: Activity,
    format: (v: number) => formatConfidence(v),
    hint: 'Portfolio average',
  },
  {
    key: 'total_predicted_demand_7d' as const,
    label: 'Horizon demand',
    icon: BarChart3,
    format: (v: number) => `${Math.round(v).toLocaleString()}`,
    hint: 'Predicted units',
  },
]

export function KPICards({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ key, label, icon: Icon, format, hint }) => (
        <div key={key} className="panel p-4 group hover:-translate-y-0.5 transition-transform duration-300">
          <div className="flex items-start justify-between">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">{label}</p>
            <Icon className="w-4 h-4 text-brand-600 opacity-80" />
          </div>
          <p className="mt-3 font-mono text-2xl font-medium text-ink-900 dark:text-white tabular-nums">
            {format(kpis[key] as number)}
          </p>
          <p className="mt-1 text-xs text-ink-500">{hint}</p>
        </div>
      ))}
    </div>
  )
}
