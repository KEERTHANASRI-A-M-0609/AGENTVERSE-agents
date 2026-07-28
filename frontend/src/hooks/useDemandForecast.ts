import { useState, useCallback } from 'react'
import { demandApi } from '@/api/demand'
import type { PredictResponse } from '@/types'

export function useDemandForecast() {
  const [data, setData] = useState<PredictResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const predict = useCallback(async (shopId: string, productId: string, horizon = 7) => {
    setLoading(true)
    setError(null)
    try {
      const result = await demandApi.predict(shopId, productId, horizon)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateExplanation = useCallback((text: string) => {
    setData((prev) => (prev ? { ...prev, ai_explanation: text } : prev))
  }, [])

  return { data, loading, error, predict, updateExplanation }
}
