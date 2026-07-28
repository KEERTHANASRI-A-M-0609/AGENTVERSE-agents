import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailyPrediction } from '@/types'
import { format, parseISO } from 'date-fns'

interface Props {
  data: DailyPrediction[]
  productName: string
  confidence: number
  horizon: number
}

export function TrendChart({ data, productName, confidence, horizon }: Props) {
  const band = Math.max(0.08, 1 - confidence)
  const chartData = data.map((d) => {
    const mid = Math.round(d.predicted_units)
    const spread = Math.max(1, Math.round(mid * band))
    return { date: format(parseISO(d.date), 'EEE dd'), units: mid, low: Math.max(0, mid - spread), high: mid + spread }
  })

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5b6472' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#5b6472' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #eceef2', fontSize: 11 }}
          formatter={(v: number) => [`${v} units`, 'Forecast']} />
        <Area type="monotone" dataKey="units" stroke="#0f766e" strokeWidth={2}
          fill="url(#demandGrad)" dot={{ r: 2.5, fill: '#0f766e' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
