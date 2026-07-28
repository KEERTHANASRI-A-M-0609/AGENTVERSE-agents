import { ReactNode } from 'react'

interface Props {
  greeting: string
  agentName: string
  status: string
  lastUpdated: string
  confidence: number
  headline: string
  headlineLabel: string
  recommendation: string
  impact: string
  meta?: ReactNode
  actions?: ReactNode
}

export function AgentBriefing({
  greeting,
  agentName,
  status,
  lastUpdated,
  confidence,
  headline,
  headlineLabel,
  recommendation,
  impact,
  meta,
  actions,
}: Props) {
  const confPct = Math.max(0, Math.min(100, Math.round(confidence)))

  return (
    <section className="panel overflow-hidden">
      <div className="px-6 pt-6 pb-5 border-b border-ink-100 dark:border-white/8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink-500">{greeting}</p>
            <h1 className="mt-1 text-2xl md:text-[1.75rem] font-semibold tracking-tight text-ink-900 dark:text-white">
              {agentName}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-600 dark:text-gray-300 bg-ink-50 dark:bg-white/5 border border-ink-100 dark:border-white/8 rounded-full px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {status}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-500 mb-1">Last updated</p>
            <p className="font-medium text-ink-800 dark:text-gray-200">{lastUpdated}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-500 mb-1">Confidence</p>
            <p className="font-mono font-medium text-ink-800 dark:text-gray-200">{confPct}%</p>
          </div>
          {meta}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-500 mb-2">{headlineLabel}</p>
          <p className="text-lg md:text-xl leading-snug text-ink-900 dark:text-white font-medium max-w-3xl">
            {headline}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-ink-50 dark:bg-white/[0.04] border border-ink-100 dark:border-white/8 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-500 mb-2">
              Recommended action
            </p>
            <p className="text-sm leading-relaxed text-ink-800 dark:text-gray-200">{recommendation}</p>
          </div>
          <div className="rounded-xl bg-ink-50 dark:bg-white/[0.04] border border-ink-100 dark:border-white/8 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-500 mb-2">
              Expected business impact
            </p>
            <p className="text-sm leading-relaxed text-ink-800 dark:text-gray-200">{impact}</p>
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </div>
    </section>
  )
}
