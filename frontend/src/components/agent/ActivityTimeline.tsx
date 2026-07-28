export interface TimelineEvent {
  id: string
  time: string
  title: string
  detail?: string
  tone?: 'neutral' | 'positive' | 'warning' | 'critical'
}

interface Props {
  title?: string
  events: TimelineEvent[]
}

const DOT: Record<NonNullable<TimelineEvent['tone']>, string> = {
  neutral: 'bg-ink-400',
  positive: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-rose-500',
}

export function ActivityTimeline({ title = 'Live activity', events }: Props) {
  return (
    <section className="panel p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-4">{title}</h3>
      {events.length === 0 ? (
        <p className="text-sm text-ink-500">No recent activity.</p>
      ) : (
        <ul className="space-y-4">
          {events.map((e, i) => (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`mt-1.5 h-2 w-2 rounded-full ${DOT[e.tone ?? 'neutral']}`} />
                {i < events.length - 1 && (
                  <span className="w-px flex-1 bg-ink-100 dark:bg-white/10 mt-1" />
                )}
              </div>
              <div className="pb-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-sm font-medium text-ink-900 dark:text-white">{e.title}</p>
                  <span className="text-[11px] font-mono text-ink-500">{e.time}</span>
                </div>
                {e.detail && (
                  <p className="text-sm text-ink-500 mt-0.5 leading-relaxed">{e.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
