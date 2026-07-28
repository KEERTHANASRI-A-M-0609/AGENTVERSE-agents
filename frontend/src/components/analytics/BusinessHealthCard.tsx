import type { BusinessHealthResponse } from '@/types'

interface Props {
  health: BusinessHealthResponse
}

export function BusinessHealthCard({ health }: Props) {
  const clamped = Math.max(0, Math.min(100, health.health_score))
  const tone =
    clamped >= 75
      ? 'text-emerald-700 dark:text-emerald-400'
      : clamped >= 50
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-rose-700 dark:text-rose-400'
  const ring = clamped >= 75 ? '#059669' : clamped >= 50 ? '#d97706' : '#e11d48'
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c - (clamped / 100) * c

  const { breakdown } = health

  return (
    <div className="panel p-5">
      <div className="flex flex-col sm:flex-row items-start gap-5">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#e8ecf1" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-2xl font-medium ${tone}`}>{Math.round(clamped)}</span>
            <span className="text-[10px] uppercase tracking-wider text-ink-500">Score</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-ink-900 dark:text-white">Business health</p>
          <p className="text-sm text-ink-500 mt-1 leading-relaxed">{health.explanation}</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Growth', value: breakdown.revenue_growth },
              { label: 'Consistency', value: breakdown.sales_consistency },
              { label: 'Movement', value: breakdown.product_movement },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-ink-50/80 dark:bg-black/20 px-2.5 py-2 text-center"
              >
                <p className="text-[10px] uppercase tracking-wider text-ink-500">{item.label}</p>
                <p className="font-mono text-sm text-ink-800 dark:text-gray-200 mt-0.5">
                  {Math.round(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
