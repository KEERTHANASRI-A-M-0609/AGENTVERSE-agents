import { useCallback, useEffect, useState } from 'react'
import { demandApi } from '@/api/demand'
import { analyticsApi } from '@/api/analytics'
import type { AnalyticsBundle } from '@/hooks/useAnalyticsDashboard'
import type { DashboardResponse } from '@/types'
import { SHOP_ID } from '@/lib/agents'

export interface MissionControlData {
  demand: DashboardResponse
  analytics: AnalyticsBundle
}

export function useMissionControl(shopId = SHOP_ID, horizon = 30) {
  const [data, setData] = useState<MissionControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fast calls first — dashboard, products, trends (no insights/health which are slow)
      const [demand, dashboard, products, trends] = await Promise.all([
        demandApi.getDashboard(shopId, horizon),
        analyticsApi.getDashboard(shopId),
        analyticsApi.getProducts(shopId, 30),
        analyticsApi.getTrends(shopId, 30),
      ])

      // Health is a single fast call — fetch after the parallel batch
      const health = await analyticsApi.getHealth(shopId, 30)

      // Build a minimal insights stub so AnalyticsBundle type is satisfied
      const insights = {
        shop_id: shopId,
        as_of: dashboard.as_of,
        generated_at: dashboard.generated_at,
        summary: '',
        highlights: [],
        recommendations: [],
        health_score: health.health_score,
      }

      setData({
        demand,
        analytics: { dashboard, products, trends, health, insights },
      })
      setLastUpdated(new Date().toISOString())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [shopId, horizon])

  useEffect(() => {
    void refetch()
    const t = window.setInterval(() => void refetch(), 300000)
    return () => window.clearInterval(t)
  }, [refetch])

  return { data, loading, error, lastUpdated, refetch }
}
