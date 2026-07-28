interface Props {
  score: number
  coverage: number
}

export function InventoryHealthGauge({ score, coverage }: Props) {
  const clamped = Math.max(0, Math.min(100, score))
  const tone =
    clamped >= 75 ? 'text-emerald-700' : clamped >= 50 ? 'text-amber-700' : 'text-rose-700'
  const ring =
    clamped >= 75 ? '#059669' : clamped >= 50 ? '#d97706' : '#e11d48'
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c - (clamped / 100) * c

  return (
    <div className="panel p-5 flex items-center gap-5">
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
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-2xl font-medium ${tone}`}>{Math.round(clamped)}</span>
          <span className="text-[10px] uppercase tracking-wider text-ink-500">Health</span>
        </div>
      </div>
      <div>
        <p className="font-display text-lg text-ink-900 dark:text-white">Inventory health</p>
        <p className="text-sm text-ink-500 mt-1 leading-relaxed">
          Composite of model confidence and urgency pressure across the active assortment.
        </p>
        <p className="mt-3 text-xs font-mono text-brand-700">
          {coverage.toFixed(0)}% SKUs adequately covered
        </p>
      </div>
    </div>
  )
}
