interface Props {
  value: number
  label?: string
  size?: 'sm' | 'md'
}

export function ConfidenceMeter({ value, label = 'Confidence', size = 'md' }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const tone =
    pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
  const barH = size === 'sm' ? 'h-1.5' : 'h-2'

  return (
    <div className="min-w-[140px]">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-[11px] uppercase tracking-[0.12em] text-ink-500">{label}</span>
        <span className="font-mono text-sm font-medium text-ink-900 dark:text-white">{pct}%</span>
      </div>
      <div className={`${barH} rounded-full bg-ink-100 dark:bg-white/10 overflow-hidden`}>
        <div className={`${barH} rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
