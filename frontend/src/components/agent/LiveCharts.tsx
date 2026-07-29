/**
 * LiveCharts — real-time updating charts for Demand and BI agents.
 * Uses recharts. Data updates from SSE events + periodic API refresh.
 */
import { useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { RetailEvent } from '@/types/events'
import type { AnalyticsBundle } from '@/hooks/useAnalyticsDashboard'
import type { DashboardResponse, DailyRevenuePoint } from '@/types'
import { formatINR } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity, BarChart2 } from 'lucide-react'
import { motion } from 'framer-motion'

const DARK_TOOLTIP = {
  contentStyle: {
    background: '#0d1220',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    fontSize: 11,
    color: '#e2e8f0',
  },
  cursor: { stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 },
}

// ── Revenue Area Chart ────────────────────────────────────────────────────────
export function RevenueAreaChart({
  series, color = '#6366f1', height = 160,
}: {
  series: DailyRevenuePoint[]
  color?: string
  height?: number
}) {
  const data = series.map(d => ({
    date: String(d.date).slice(5),   // MM-DD
    revenue: d.revenue,
    orders: d.orders,
    units: d.units_sold,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(148,163,184,0.4)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: 'rgba(148,163,184,0.4)' }} axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
        <Tooltip {...DARK_TOOLTIP}
          formatter={(v: number, name: string) => [
            name === 'revenue' ? formatINR(v) : v,
            name.charAt(0).toUpperCase() + name.slice(1),
          ]} />
        <Area type="monotone" dataKey="revenue" stroke={color} strokeWidth={2}
          fill={`url(#grad-${color.replace('#', '')})`} dot={false} activeDot={{ r: 4, fill: color }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Orders + Units Bar Chart ──────────────────────────────────────────────────
export function OrdersBarChart({ series, height = 140 }: { series: DailyRevenuePoint[]; height?: number }) {
  const data = series.map(d => ({
    date: String(d.date).slice(5),
    orders: d.orders,
    units: d.units_sold,
  }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(148,163,184,0.4)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: 'rgba(148,163,184,0.4)' }} axisLine={false} tickLine={false} />
        <Tooltip {...DARK_TOOLTIP} />
        <Bar dataKey="orders" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={16} />
        <Bar dataKey="units" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Live Event Revenue Ticker (from SSE) ──────────────────────────────────────
export function LiveRevenueTicker({
  events, height = 120,
}: {
  events: RetailEvent[]
  height?: number
}) {
  const data = useMemo(() => {
    const saleEvents = events
      .filter(e => e.event_type === 'sale.recorded' || e.event_type === 'customer.order_placed')
      .slice(0, 20)
      .reverse()
    return saleEvents.map((e, i) => ({
      i,
      revenue: Number(e.payload?.revenue ?? 0),
      qty: Number(e.payload?.quantity_sold ?? e.payload?.quantity ?? 1),
      product: e.product_name ?? '',
    }))
  }, [events])

  if (data.length < 2) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.3)' }}>Waiting for live sales…</p>
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="i" hide />
        <YAxis tick={{ fontSize: 9, fill: 'rgba(148,163,184,0.4)' }} axisLine={false} tickLine={false}
          tickFormatter={v => `₹${v}`} />
        <Tooltip {...DARK_TOOLTIP}
          formatter={(v: number) => [formatINR(v), 'Revenue']}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.product ?? ''} />
        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2}
          dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#10b981' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Product Category Pie ──────────────────────────────────────────────────────
export function CategoryPieChart({ data: bundle, height = 180 }: { data: AnalyticsBundle; height?: number }) {
  const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
  const catMap: Record<string, number> = {}
  bundle.products.best_selling.forEach(p => {
    const cat = p.category || 'Other'
    catMap[cat] = (catMap[cat] ?? 0) + p.revenue
  })
  const data = Object.entries(catMap).map(([name, value]) => ({ name, value: Math.round(value) }))
  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
          paddingAngle={3} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip {...DARK_TOOLTIP} formatter={(v: number) => [formatINR(v), 'Revenue']} />
        <Legend iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)' }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Demand Urgency Radial ─────────────────────────────────────────────────────
export function UrgencyRadialChart({ data: dash }: { data: DashboardResponse }) {
  const portfolio = dash.portfolio?.length ? dash.portfolio : dash.top_reorder_products
  const total = portfolio.length || 1
  const high = portfolio.filter(p => p.urgency === 'high').length
  const medium = portfolio.filter(p => p.urgency === 'medium').length
  const low = portfolio.filter(p => p.urgency === 'low').length

  const radialData = [
    { name: 'Critical', value: Math.round((high / total) * 100), fill: '#ef4444' },
    { name: 'Watch', value: Math.round((medium / total) * 100), fill: '#f59e0b' },
    { name: 'Healthy', value: Math.round((low / total) * 100), fill: '#10b981' },
  ]

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={120} height={120}>
        <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={55}
          data={radialData} startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Tooltip {...DARK_TOOLTIP} formatter={(v: number) => [`${v}%`, '']} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="space-y-1.5">
        {[
          { label: 'Critical', count: high, color: '#ef4444' },
          { label: 'Watch', count: medium, color: '#f59e0b' },
          { label: 'Healthy', count: low, color: '#10b981' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.6)' }}>{item.label}</span>
            <span className="text-[11px] font-bold font-mono ml-auto" style={{ color: item.color }}>{item.count}</span>
          </div>
        ))}
        <div className="pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[9px]" style={{ color: 'rgba(148,163,184,0.4)' }}>{total} total SKUs</span>
        </div>
      </div>
    </div>
  )
}

// ── Forecast Confidence Chart ─────────────────────────────────────────────────
export function ForecastConfidenceChart({ data: dash, height = 140 }: { data: DashboardResponse; height?: number }) {
  const portfolio = dash.portfolio?.length ? dash.portfolio : dash.top_reorder_products
  const chartData = portfolio
    .slice(0, 12)
    .map(p => ({
      name: p.product_name.split(' ').slice(0, 2).join(' '),
      confidence: Math.round(p.confidence_score * 100),
      units: Math.round(p.total_predicted_units),
      urgency: p.urgency,
    }))
    .sort((a, b) => b.confidence - a.confidence)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(148,163,184,0.4)' }}
          axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'rgba(148,163,184,0.5)' }}
          axisLine={false} tickLine={false} width={80} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v: number) => [`${v}%`, 'Confidence']} />
        <Bar dataKey="confidence" radius={[0, 4, 4, 0]} maxBarSize={12}>
          {chartData.map((entry, i) => (
            <Cell key={i}
              fill={entry.urgency === 'high' ? '#ef4444' : entry.urgency === 'medium' ? '#f59e0b' : '#10b981'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Live KPI Ticker strip ─────────────────────────────────────────────────────
export function LiveKPIStrip({ events }: { events: RetailEvent[] }) {
  const stats = useMemo(() => {
    const sales = events.filter(e => e.event_type === 'sale.recorded' || e.event_type === 'customer.order_placed')
    const spikes = events.filter(e => e.event_type === 'sale.spike_detected').length
    const criticals = events.filter(e => e.severity === 'critical').length
    const liveRevenue = sales.reduce((s, e) => s + Number(e.payload?.revenue ?? 0), 0)
    return { sales: sales.length, spikes, criticals, liveRevenue }
  }, [events])

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: 'Live Sales', value: stats.sales.toString(), color: '#10b981', icon: <ShoppingCartIcon /> },
        { label: 'Live Revenue', value: formatINR(Math.round(stats.liveRevenue)), color: '#6366f1', icon: <ActivityIcon /> },
        { label: 'Demand Spikes', value: stats.spikes.toString(), color: '#f59e0b', icon: <TrendingUp className="w-3 h-3" /> },
        { label: 'Critical Alerts', value: stats.criticals.toString(), color: '#ef4444', icon: <TrendingDown className="w-3 h-3" /> },
      ].map(item => (
        <motion.div key={item.label}
          className="card p-3"
          animate={item.value !== '0' ? { borderColor: [`${item.color}30`, `${item.color}60`, `${item.color}30`] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}>
          <div className="flex items-center gap-1.5 mb-1">
            <span style={{ color: item.color }}>{item.icon}</span>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.45)' }}>{item.label}</p>
          </div>
          <p className="text-[15px] font-bold font-mono leading-none" style={{ color: item.color }}>{item.value}</p>
        </motion.div>
      ))}
    </div>
  )
}

function ShoppingCartIcon() { return <Activity className="w-3 h-3" /> }
function ActivityIcon() { return <BarChart2 className="w-3 h-3" /> }
