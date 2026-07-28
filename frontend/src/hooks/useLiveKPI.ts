import { useCallback, useEffect, useState } from 'react'
import { eventsApi } from '@/api/events'
import type { LiveKPI } from '@/types/events'
import { SHOP_ID } from '@/lib/agents'

export function useLiveKPI(shopId = SHOP_ID, intervalMs = 10000) {
  const [kpi, setKpi] = useState<LiveKPI | null>(null)
  const [prevRevenue, setPrevRevenue] = useState<number | null>(null)

  const fetch = useCallback(async () => {
    try {
      const data = await eventsApi.getLiveKPI(shopId)
      setKpi((prev) => {
        if (prev) setPrevRevenue(prev.revenue_today)
        return data
      })
    } catch {
      // silent — KPI bar degrades gracefully
    }
  }, [shopId])

  useEffect(() => {
    void fetch()
    const t = setInterval(() => void fetch(), intervalMs)
    return () => clearInterval(t)
  }, [fetch, intervalMs])

  const revenueUp = prevRevenue !== null && kpi !== null && kpi.revenue_today > prevRevenue

  return { kpi, revenueUp }
}
