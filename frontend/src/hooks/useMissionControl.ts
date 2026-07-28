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

export function useMissionControl(shopId = SHOP_ID, horizon = 7) {
  const [data, setData] = useState<MissionControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [demand, dashboard, products, trends, health, insights] = await Promise.all([
        demandApi.getDashboard(shopId, horizon),
        analyticsApi.getDashboard(shopId),
        analyticsApi.getProducts(shopId),
        analyticsApi.getTrends(shopId, 7),
        analyticsApi.getHealth(shopId),
        analyticsApi.getInsights(shopId),
      ])
      setData({
        demand,
        analytics: { dashboard, products, trends, health, insights },
      })
      setLastUpdated(new Date().toISOString())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load Mission Control')
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
