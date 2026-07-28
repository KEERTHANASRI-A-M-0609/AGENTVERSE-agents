import { useState, useEffect, useCallback } from 'react'
import { demandApi } from '@/api/demand'
import type { DashboardResponse } from '@/types'

export function useDashboard(shopId: string, horizon = 7, refreshIntervalMs = 300000) {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await demandApi.getDashboard(shopId, horizon)
      setData(result)
      setLastUpdated(result.generated_at)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [shopId, horizon])

  useEffect(() => {
    fetch()
    const interval = window.setInterval(() => {
      fetch()
    }, refreshIntervalMs)

    return () => window.clearInterval(interval)
  }, [fetch, refreshIntervalMs])

  return { data, loading, error, lastUpdated, refetch: fetch }
}
