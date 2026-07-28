import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { DailyRevenuePoint } from '@/types'
import { formatINR } from '@/lib/utils'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  series: DailyRevenuePoint[]
  totalRevenue: number
  height?: number
  showOrders?: boolean
  variant?: 'area' | 'bar'
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 dark:bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono font-bold">
          {p.dataKey === 'revenue' ? formatINR(p.value) : `${p.value} orders`}
        </p>
      ))}
    </div>
  )
}

export function RevenueTrendChart({ series, totalRevenue, height = 120, showOrders = false, variant = 'area' }: Props) {
  if (!series.length) return <EmptyState message="No revenue data" />

  const chartData = series.map(d => ({
    date: format(parseISO(d.date), 'MMM dd'),
    revenue: Math.round(d.revenue),
    orders: d.orders,
  }))

  if (variant === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
          {showOrders && <Bar dataKey="orders" fill="#8b5cf6" radius={[3, 3, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
        <Tooltip content={<CustomTooltip />} />
        {showOrders && (
          <Area type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={1.5}
            fill="url(#ordersGrad)" dot={false} />
        )}
        <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2}
          fill="url(#revenueGrad)" dot={{ r: 2.5, fill: '#6366f1', strokeWidth: 0 }}
          activeDot={{ r: 4, fill: '#6366f1' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
