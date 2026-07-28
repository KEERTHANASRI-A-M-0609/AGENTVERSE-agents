import { ArrowDown } from 'lucide-react'

export interface CollabStep {
  id: string
  agent: string
  message: string
  tone?: 'intel' | 'opportunity' | 'healthy' | 'warn'
}

const TONE = {
  intel: 'border-blue-200 bg-intel-soft dark:bg-blue-500/10 dark:border-blue-500/20',
  opportunity: 'border-violet-200 bg-opportunity-soft dark:bg-violet-500/10 dark:border-violet-500/20',
  healthy: 'border-emerald-200 bg-healthy-soft dark:bg-emerald-500/10 dark:border-emerald-500/20',
  warn: 'border-amber-200 bg-warn-soft dark:bg-amber-500/10 dark:border-amber-500/20',
}

interface Props {
  title?: string
  steps: CollabStep[]
}

export function AgentCollaboration({ title = 'Agent communication', steps }: Props) {
  return (
    <section className="panel p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-4">{title}</h3>
      <ol className="space-y-0">
        {steps.map((step, i) => (
          <li key={step.id} className="flex flex-col items-stretch">
            <div className={`rounded-xl border px-4 py-3 ${TONE[step.tone ?? 'intel']}`}>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-70 mb-1">
                {step.agent}
              </p>
              <p className="text-sm font-medium text-ink-900 dark:text-white leading-relaxed">
                {step.message}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-1.5 text-ink-400">
                <ArrowDown className="w-4 h-4" />
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
