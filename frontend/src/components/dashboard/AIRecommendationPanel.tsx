import { useState } from 'react'
import { Sparkles, Check, Pencil, Wand2 } from 'lucide-react'
import type { PredictResponse } from '@/types'
import { formatConfidence, getUrgencyBg, getUrgencyColor } from '@/lib/utils'
import { demandApi } from '@/api/demand'

interface Props {
  prediction: PredictResponse
  onExplanationUpdate?: (text: string) => void
}

export function AIRecommendationPanel({ prediction, onExplanationUpdate }: Props) {
  const [modifying, setModifying] = useState(false)
  const [qty, setQty] = useState(prediction.reorder.recommended_order_quantity)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [explaining, setExplaining] = useState(false)

  const urgency = prediction.reorder.reorder_required
    ? prediction.reorder.days_until_stockout != null && prediction.reorder.days_until_stockout <= 3
      ? 'high'
      : 'medium'
    : 'low'

  const handleAccept = async () => {
    setBusy(true)
    setStatusMsg(null)
    try {
      await demandApi.recommendationAction(prediction.request_id, 'accepted')
      setStatusMsg('Recommendation accepted and logged.')
      setModifying(false)
    } catch (e: unknown) {
      setStatusMsg(e instanceof Error ? e.message : 'Failed to accept recommendation')
    } finally {
      setBusy(false)
    }
  }

  const handleModify = async () => {
    setBusy(true)
    setStatusMsg(null)
    try {
      await demandApi.recommendationAction(prediction.request_id, 'modified', qty)
      setStatusMsg(`Modified order quantity saved: ${qty} units.`)
      setModifying(false)
    } catch (e: unknown) {
      setStatusMsg(e instanceof Error ? e.message : 'Failed to save modified quantity')
    } finally {
      setBusy(false)
    }
  }

  const handleExplainAI = async () => {
    setExplaining(true)
    setStatusMsg(null)
    try {
      const result = await demandApi.explain(
        prediction.shop_id,
        prediction.product_id,
        prediction.forecast_horizon_days,
      )
      onExplanationUpdate?.(result.explanation)
      setStatusMsg(
        result.source === 'gemini'
          ? 'Gemini explanation loaded.'
          : 'Local template explanation (Gemini disabled — no API quota used).',
      )
    } catch (e: unknown) {
      setStatusMsg(e instanceof Error ? e.message : 'Failed to load AI explanation')
    } finally {
      setExplaining(false)
    }
  }

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${getUrgencyBg(urgency)}`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brand-600" />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Recommendation</span>
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-white border ${getUrgencyColor(urgency)}`}>
          {urgency.toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        {prediction.ai_explanation}
      </p>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {Math.round(prediction.forecast.total_predicted_units)}
          </p>
          <p className="text-xs text-gray-500">Predicted Units</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatConfidence(prediction.forecast.confidence_score)}
          </p>
          <p className="text-xs text-gray-500">Confidence</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {prediction.reorder.recommended_order_quantity}
          </p>
          <p className="text-xs text-gray-500">Reorder Qty</p>
        </div>
      </div>

      {modifying && (
        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">Order qty</label>
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
          />
          <button
            onClick={handleModify}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={handleAccept}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> Accept
        </button>
        <button
          onClick={() => {
            setQty(prediction.reorder.recommended_order_quantity)
            setModifying((v) => !v)
          }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white/80 disabled:opacity-50"
        >
          <Pencil className="w-3.5 h-3.5" /> Modify
        </button>
        <button
          onClick={handleExplainAI}
          disabled={explaining}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          <Wand2 className="w-3.5 h-3.5" /> {explaining ? 'Explaining…' : 'Explain with AI'}
        </button>
      </div>

      {statusMsg && (
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-white/70 dark:bg-gray-900/70 rounded-lg px-3 py-2">
          {statusMsg}
        </p>
      )}

      {prediction.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {prediction.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
