/**
 * LiveEventFeed — real-time SSE event stream panel.
 * Shows live retail events with severity, product context, and action buttons.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { eventsApi } from '@/api/events'
import type { RetailEvent } from '@/types/events'
import {
  Zap, AlertTriangle, CheckCircle2, Info, ShoppingCart,
  Package, TrendingUp, TrendingDown, Bell, Trash2, ExternalLink,
} from 'lucide-react'

interface Props {
  events: RetailEvent[]
  connected: boolean
  reconnecting: boolean
  totalReceived: number
  shopId: string
  onClear: () => void
  maxVisible?: number
}

const SEV_CFG = {
  critical: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  text: '#ef4444', icon: AlertTriangle },
  warning:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b', icon: AlertTriangle },
  success:  { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', text: '#10b981', icon: CheckCircle2 },
  info:     { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', text: '#818cf8', icon: Info },
}

const TYPE_ICON: Record<string, React.ElementType> = {
  'sale.recorded':         ShoppingCart,
  'sale.spike_detected':   TrendingUp,
  'sale.drop_detected':    TrendingDown,
  'inventory.stock_low':   Package,
  'inventory.stock_critical': AlertTriangle,
  'inventory.stock_out':   AlertTriangle,
  'demand.trend_change':   TrendingUp,
  'demand.forecast_updated': Zap,
  'customer.order_placed': ShoppingCart,
  'customer.activity':     Bell,
  'business.slow_mover_alert': TrendingDown,
  'business.revenue_milestone': CheckCircle2,
  'business.price_anomaly': AlertTriangle,
  'agent.decision':        Zap,
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function LiveEventFeed({
  events, connected, reconnecting, totalReceived, shopId, onClear, maxVisible = 40,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'action'>('all')
  const [acking, setAcking] = useState<Set<string>>(new Set())

  const filtered = events
    .filter(e => {
      if (filter === 'critical') return e.severity === 'critical'
      if (filter === 'warning') return e.severity === 'warning' || e.severity === 'critical'
      if (filter === 'action') return e.action_required
      return true
    })
    .slice(0, maxVisible)

  const handleAck = async (e: RetailEvent) => {
    if (!e.action_required || acking.has(e.event_id)) return
    setAcking(prev => new Set(prev).add(e.event_id))
    try {
      await eventsApi.acknowledgeAlert(shopId, e.event_id)
    } catch { /* silent */ }
  }

  return (
    <div className="card overflow-hidden flex flex-col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : reconnecting ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[11px] font-bold" style={{ color: connected ? '#10b981' : '#f59e0b' }}>
            {connected ? 'Live' : reconnecting ? 'Reconnecting…' : 'Disconnected'}
          </span>
        </div>
        <span className="text-[11px] font-semibold flex-1">Event Stream</span>
        <span className="text-[9px] font-mono" style={{ color: 'rgba(148,163,184,0.4)' }}>{totalReceived} total</span>
        <button onClick={onClear} className="p-1 rounded opacity-40 hover:opacity-80 transition-opacity">
          <Trash2 className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.6)' }} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {(['all', 'critical', 'warning', 'action'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: filter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: filter === f ? '#e2e8f0' : 'rgba(148,163,184,0.4)',
            }}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-[9px] font-mono" style={{ color: 'rgba(148,163,184,0.3)' }}>
          {filtered.length} shown
        </span>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Zap className="w-5 h-5" style={{ color: 'rgba(148,163,184,0.2)' }} />
            <p className="text-[11px]" style={{ color: 'rgba(148,163,184,0.35)' }}>
              {connected ? 'Waiting for events…' : 'Connecting to event stream…'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map(event => {
              const sev = SEV_CFG[event.severity] ?? SEV_CFG.info
              const TypeIcon = TYPE_ICON[event.event_type] ?? Zap
              const done = acking.has(event.event_id)
              return (
                <motion.div
                  key={event.event_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="px-3 py-2.5 flex items-start gap-2.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                >
                  {/* Severity dot + type icon */}
                  <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center"
                      style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
                      <TypeIcon className="w-2.5 h-2.5" style={{ color: sev.text }} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[11px] font-semibold leading-tight" style={{ color: '#e2e8f0' }}>
                        {event.title}
                      </p>
                      <span className="text-[9px] shrink-0 mt-0.5" style={{ color: 'rgba(148,163,184,0.35)' }}>
                        {timeAgo(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'rgba(148,163,184,0.55)' }}>
                      {event.message}
                    </p>
                    {event.product_name && (
                      <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.5)' }}>
                        {event.product_name}
                      </span>
                    )}
                    {event.action_required && event.action_label && (
                      <button
                        onClick={() => handleAck(event)}
                        disabled={done}
                        className="mt-1.5 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded transition-all"
                        style={{
                          background: done ? 'rgba(16,185,129,0.1)' : sev.bg,
                          color: done ? '#10b981' : sev.text,
                          border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : sev.border}`,
                          opacity: done ? 0.7 : 1,
                        }}>
                        {done ? <CheckCircle2 className="w-2.5 h-2.5" /> : <ExternalLink className="w-2.5 h-2.5" />}
                        {done ? 'Done' : event.action_label}
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
