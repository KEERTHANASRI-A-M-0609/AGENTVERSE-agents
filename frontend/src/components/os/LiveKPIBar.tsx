import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, AlertTriangle, Brain, ShoppingCart, Package, Zap } from 'lucide-react'
import type { LiveKPI } from '@/types/events'
import { formatINR } from '@/lib/utils'

interface Props {
  kpi: LiveKPI | null
  revenueUp: boolean
}

function KPICell({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
  pulse,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  highlight?: 'green' | 'red' | 'amber' | 'blue'
  pulse?: boolean
}) {
  const colors = {
    green: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
  }
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-r border-gray-100 dark:border-white/8 last:border-r-0 min-w-0">
      <div className={`p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 shrink-0 ${pulse ? 'animate-pulse' : ''}`}>
        <Icon className={`w-3.5 h-3.5 ${highlight ? colors[highlight] : 'text-gray-500 dark:text-gray-400'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 leading-none mb-0.5">
          {label}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={value}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className={`text-sm font-bold font-mono leading-none ${highlight ? colors[highlight] : 'text-gray-800 dark:text-gray-100'}`}
          >
            {value}
          </motion.p>
        </AnimatePresence>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 leading-none">{sub}</p>}
      </div>
    </div>
  )
}

export function LiveKPIBar({ kpi, revenueUp }: Props) {
  if (!kpi) {
    return (
      <div className="h-14 bg-white dark:bg-[#161b22] border-b border-gray-100 dark:border-white/8 flex items-center px-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#161b22] border-b border-gray-100 dark:border-white/8 overflow-x-auto">
      <div className="flex items-stretch min-w-max">
        <KPICell
          icon={TrendingUp}
          label="Revenue Today"
          value={formatINR(kpi.revenue_today)}
          sub={kpi.as_of}
          highlight={revenueUp ? 'green' : undefined}
          pulse={revenueUp}
        />
        <KPICell
          icon={ShoppingCart}
          label="Orders"
          value={kpi.orders_today.toString()}
          sub="today"
        />
        <KPICell
          icon={Package}
          label="Units Sold"
          value={kpi.units_today.toString()}
          sub="today"
        />
        <KPICell
          icon={AlertTriangle}
          label="Active Alerts"
          value={kpi.unacked_alerts.toString()}
          highlight={kpi.unacked_alerts > 0 ? (kpi.unacked_alerts >= 3 ? 'red' : 'amber') : 'green'}
          pulse={kpi.unacked_alerts > 0}
        />
        <KPICell
          icon={Brain}
          label="AI Decisions"
          value={kpi.agent_decisions_recent.toString()}
          sub="recent"
          highlight="blue"
        />
        <KPICell
          icon={Zap}
          label="Agents"
          value={kpi.agents_active ? 'Active' : 'Offline'}
          highlight={kpi.agents_active ? 'green' : 'red'}
          pulse={kpi.agents_active}
        />
      </div>
    </div>
  )
}
