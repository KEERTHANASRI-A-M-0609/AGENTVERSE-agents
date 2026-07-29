import { useState, useEffect, useCallback } from 'react'
import { analyticsApi } from '@/api/analytics'
import type {
  AnalyticsDashboardResponse,
  AnalyticsInsightsResponse,
  BusinessHealthResponse,
  ProductAnalyticsResponse,
  RevenueTrendResponse,
} from '@/types'

export interface AnalyticsBundle {
  dashboard: AnalyticsDashboardResponse
  products: ProductAnalyticsResponse
  trends: RevenueTrendResponse
  health: BusinessHealthResponse
  insights: AnalyticsInsightsResponse
}

export function useAnalyticsDashboard(shopId: string, days = 30, refreshIntervalMs = 300000) {
  const [data, setData] = useState<AnalyticsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fast calls — render immediately
      const [dashboard, products, trends, health] = await Promise.all([
        analyticsApi.getDashboard(shopId),
        analyticsApi.getProducts(shopId, days),
        analyticsApi.getTrends(shopId, days),
        analyticsApi.getHealth(shopId, days),
      ])

      // Stub insights so page renders without waiting for the slow call
      const insightsStub: AnalyticsInsightsResponse = {
        shop_id: shopId,
        as_of: dashboard.as_of,
        generated_at: dashboard.generated_at,
        summary: '',
        highlights: [],
        recommendations: [],
        health_score: health.health_score,
      }

      setData({ dashboard, products, trends, health, insights: insightsStub })
      setLastUpdated(String(dashboard.generated_at))
      setLoading(false)

      // Fetch insights in background — update when ready
      analyticsApi.getInsights(shopId, days).then(insights => {
        setData(prev => prev ? { ...prev, insights } : prev)
      }).catch(() => {
        // insights failure is non-fatal — stub already shown
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
      setLoading(false)
    }
  }, [shopId, days])

  useEffect(() => {
    fetchAll()
    const interval = window.setInterval(fetchAll, refreshIntervalMs)
    return () => window.clearInterval(interval)
  }, [fetchAll, refreshIntervalMs])

  return { data, loading, error, lastUpdated, refetch: fetchAll }
}
