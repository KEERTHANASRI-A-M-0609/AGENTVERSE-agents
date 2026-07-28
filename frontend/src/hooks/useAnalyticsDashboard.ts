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

export function useAnalyticsDashboard(shopId: string, days = 7, refreshIntervalMs = 300000) {
  const [data, setData] = useState<AnalyticsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboard, products, trends, health, insights] = await Promise.all([
        analyticsApi.getDashboard(shopId),
        analyticsApi.getProducts(shopId, days),
        analyticsApi.getTrends(shopId, days),
        analyticsApi.getHealth(shopId),
        analyticsApi.getInsights(shopId),
      ])
      setData({ dashboard, products, trends, health, insights })
      setLastUpdated(dashboard.generated_at)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
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
