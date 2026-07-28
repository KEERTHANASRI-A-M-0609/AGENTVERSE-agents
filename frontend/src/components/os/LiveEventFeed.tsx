import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, AlertTriangle, TrendingUp, TrendingDown,
  Package, DollarSign, User, Zap, Activity, Brain, RefreshCw
} from 'lucide-react'
import type { RetailEvent, EventSeverity, EventType } from '@/types/events'

interface Props {
  events: RetailEvent[]
  connected: boolean
  reconnecting: boolean
  totalReceived: number
  maxVisible?: number
}

const EVENT_ICONS: Partial<Record<EventType, React.ElementType>> = {
  'sale.recorded': ShoppingCart,
  'sale.spike_detected': TrendingUp,
  'sale.drop_detected': TrendingDown,
  'inventory.stock_low': Package,
  'inventory.stock_critical': AlertTriangle,
  'inventory.stock_out': AlertTriangle,
  'demand.trend_change': TrendingUp,
  'demand.forecast_updated': Activity,
  'business.revenue_milestone': DollarSign,
  'business.slow_mover_alert': TrendingDown,
  'business.price_anomaly': DollarSign,
  'customer.activity': User,
  'customer.order_placed': ShoppingCart,
  'agent.decision': Brain,
  'system.agent_heartbeat': Zap,
}

const SEVERITY_STYLES: Record<EventSeverity, string> = {
  critical: 'border-l-red-500 bg-red-50 dark:bg-red-500/5',
  warning: 'border-l-amber-500 bg-amber-50 dark:bg-amber-500/5',
  success: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-500/5',
  info: 'border-l-blue-400 bg-white dark:bg-white/[0.02]',
}

const SEVERITY_ICON_COLOR: Record<EventSeverity, string> = {
  critical: 'text-red-500',
  warning: 'text-amber-500',
  success: 'text-emerald-500',
  info: 'text-blue-400',
}

const AGENT_BADGE: Record<string, { label: string; cls: string }> = {
  demand: { label: 'Demand', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  intelligence: { label: 'Intel', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
  manager: { label: 'Manager', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
}

function EventRow({ event }: { event: RetailEvent }) {
  const Icon = EVENT_ICONS[event.event_type] ?? Activity
  const isDecision = event.event_type === 'agent.decision'
  const agent = isDecision ? (event.payload as Record<string, string>).agent : null
  const confidence = isDecision ? (event.payload as Record<string, number>).confidence : null
  const badge = agent ? AGENT_BADGE[agent] : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`border-l-2 px-3 py-2.5 ${SEVERITY_STYLES[event.severity]} overflow-hidden`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${SEVERITY_ICON_COLOR[event.severity]}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              {event.title}
            </span>
            {badge && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                {badge.label}
              </span>
            )}
            {confidence !== null && (
              <span className="text-[10px] text-gray-400 font-mono">
                {Math.round(confidence * 100)}% conf
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
            {isDecision
              ? (event.payload as Record<string, string>).reasoning || event.message
              : event.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-gray-400">
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </span>
            {event.product_name && (
              <span className="text-[10px] text-gray-400 truncate">· {event.product_name}</span>
            )}
            {event.action_required && event.action_label && (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                → {event.action_label}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function LiveEventFeed({ events, connected, reconnecting, totalReceived, maxVisible = 40 }: Props) {
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState<'all' | 'decisions' | 'critical' | 'actions'>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = events.filter((e) => {
    if (filter === 'decisions') return e.event_type === 'agent.decision'
    if (filter === 'critical') return e.severity === 'critical' || e.severity === 'warning'
    if (filter === 'actions') return e.action_required
    return true
  }).slice(0, maxVisible)

  // Auto-scroll to top when new events arrive (unless paused)
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [events.length, paused])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : reconnecting ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Live Event Feed</span>
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
            {totalReceived}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPaused((p) => !p)}
            className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${paused ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-100 dark:border-white/8 shrink-0">
        {(['all', 'decisions', 'critical', 'actions'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] font-semibold px-2 py-1 rounded capitalize transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Status bar */}
      {reconnecting && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] shrink-0">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Reconnecting to event stream…
        </div>
      )}

      {/* Event list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5"
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <Activity className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-xs">Waiting for events…</p>
          </div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {filtered.map((e) => (
              <EventRow key={e.event_id} event={e} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
