import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { BulkForecastItem } from '@/types'

interface Props {
  forecasts: BulkForecastItem[]
  horizon: number
}

const URGENCY_COLORS: Record<string, string> = {
  high: '#e11d48',
  medium: '#d97706',
  low: '#0f766e',
}

export function WeeklyForecastChart({ forecasts, horizon }: Props) {
  const data = forecasts.slice(0, 8).map((f) => ({
    name: f.product_name.split(' ').slice(0, 2).join(' '),
    units: Math.round(f.total_predicted_units),
    urgency: f.urgency,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#5b6472' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#5b6472' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #eceef2', fontSize: 11 }}
          formatter={(v: number) => [`${v} units`, 'Predicted']} />
        <Bar dataKey="units" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={URGENCY_COLORS[entry.urgency] ?? '#0f766e'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
