export interface TimelineStep {
  id: string
  label: string
  detail?: string
  done?: boolean
  active?: boolean
}

interface Props {
  title?: string
  steps: TimelineStep[]
}

export function ProcessTimeline({ title = 'Timeline', steps }: Props) {
  return (
    <section className="panel p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-4">{title}</h3>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full border-2 ${
                  step.active
                    ? 'border-intel bg-intel animate-pulseDot'
                    : step.done
                      ? 'border-healthy bg-healthy'
                      : 'border-ink-200 bg-white dark:bg-transparent'
                }`}
              />
              {i < steps.length - 1 && (
                <span className="w-px flex-1 bg-ink-100 dark:bg-white/10 mt-1 min-h-[18px]" />
              )}
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium text-ink-900 dark:text-white">{step.label}</p>
              {step.detail && <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{step.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
