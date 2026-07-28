import { Sparkles } from 'lucide-react'
import type { AnalyticsInsightsResponse } from '@/types'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  insights: AnalyticsInsightsResponse | null
}

export function AIBusinessSummary({ insights }: Props) {
  if (!insights) {
    return (
      <div className="panel p-5">
        <h3 className="font-display text-base text-ink-900 dark:text-white mb-2">AI business summary</h3>
        <EmptyState message="Insights are not available yet" />
      </div>
    )
  }

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-600" />
        <h3 className="font-display text-base text-ink-900 dark:text-white">AI business summary</h3>
        <span className="ml-auto text-[11px] font-mono text-ink-500">
          Health {Math.round(insights.health_score)}
        </span>
      </div>

      <p className="text-sm text-ink-700 dark:text-gray-300 leading-relaxed">{insights.summary}</p>

      {insights.highlights.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-2">Highlights</p>
          <ul className="space-y-1.5">
            {insights.highlights.map((item) => (
              <li
                key={item}
                className="text-sm text-ink-700 dark:text-gray-300 pl-3 border-l-2 border-brand-600/40"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.recommendations.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-2">Recommendations</p>
          <ul className="space-y-1.5">
            {insights.recommendations.map((item) => (
              <li
                key={item}
                className="text-sm text-ink-700 dark:text-gray-300 pl-3 border-l-2 border-amber-500/50"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
