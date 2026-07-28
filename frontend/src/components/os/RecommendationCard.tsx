import { Check, Eye, Ban, FileDown, MessageSquare, ChevronRight } from 'lucide-react'

export interface RecommendationModel {
  id: string
  title: string
  reason: string
  businessValue: string
  riskLevel: 'low' | 'medium' | 'high'
  expectedImpact: string
  productId?: string
}

interface Props {
  item: RecommendationModel
  onApprove?: () => void
  onIgnore?: () => void
  onReview?: () => void
  onAskAI?: () => void
  onExport?: () => void
  busy?: boolean
  statusMsg?: string | null
}

const RISK = {
  low: 'text-healthy bg-healthy-soft border-emerald-100',
  medium: 'text-warn bg-warn-soft border-amber-100',
  high: 'text-critical bg-critical-soft border-rose-100',
}

export function RecommendationCard({
  item,
  onApprove,
  onIgnore,
  onReview,
  onAskAI,
  onExport,
  busy,
  statusMsg,
}: Props) {
  return (
    <div className="panel p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-caps mb-1">Immediate action</p>
          <h3 className="text-lg font-semibold text-ink-900 dark:text-white">{item.title}</h3>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${RISK[item.riskLevel]}`}>
          Risk · {item.riskLevel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-ink-50 dark:bg-white/[0.04] border border-ink-100 dark:border-white/8 p-3">
          <p className="label-caps mb-1">Reason</p>
          <p className="text-sm text-ink-700 dark:text-gray-300 leading-relaxed">{item.reason}</p>
        </div>
        <div className="rounded-xl bg-ink-50 dark:bg-white/[0.04] border border-ink-100 dark:border-white/8 p-3">
          <p className="label-caps mb-1">Business value</p>
          <p className="text-sm text-ink-700 dark:text-gray-300 leading-relaxed">{item.businessValue}</p>
        </div>
        <div className="rounded-xl bg-ink-50 dark:bg-white/[0.04] border border-ink-100 dark:border-white/8 p-3">
          <p className="label-caps mb-1">Expected impact</p>
          <p className="text-sm text-ink-700 dark:text-gray-300 leading-relaxed">{item.expectedImpact}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onApprove && (
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-ink-900 text-white dark:bg-white dark:text-ink-900 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </button>
        )}
        {onReview && (
          <button
            type="button"
            onClick={onReview}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-ink-100 dark:border-white/10 hover:bg-ink-50 dark:hover:bg-white/5"
          >
            <Eye className="w-3.5 h-3.5" />
            Review details
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
        {onAskAI && (
          <button
            type="button"
            onClick={onAskAI}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-ink-100 dark:border-white/10 hover:bg-ink-50 dark:hover:bg-white/5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Ask AI
          </button>
        )}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-ink-100 dark:border-white/10 hover:bg-ink-50 dark:hover:bg-white/5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export
          </button>
        )}
        {onIgnore && (
          <button
            type="button"
            disabled={busy}
            onClick={onIgnore}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-ink-500 hover:bg-ink-50 dark:hover:bg-white/5 disabled:opacity-50"
          >
            <Ban className="w-3.5 h-3.5" />
            Ignore
          </button>
        )}
      </div>
      {statusMsg && <p className="text-xs text-ink-500">{statusMsg}</p>}
    </div>
  )
}
