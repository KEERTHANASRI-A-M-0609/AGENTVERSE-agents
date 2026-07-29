import { apiClient } from './client'
import type {
  AnalyticsDashboardResponse,
  AnalyticsInsightsResponse,
  BusinessHealthResponse,
  ProductAnalyticsResponse,
  RevenueTrendResponse,
} from '@/types'

export const analyticsApi = {
  getDashboard: (shopId: string) =>
    apiClient
      .get<AnalyticsDashboardResponse>('/analytics/dashboard', {
        params: { shop_id: shopId },
      })
      .then((r) => r.data),

  getProducts: (shopId: string, lookbackDays = 30) =>
    apiClient
      .get<ProductAnalyticsResponse>('/analytics/products', {
        params: { shop_id: shopId, lookback_days: lookbackDays },
      })
      .then((r) => r.data),

  getTrends: (shopId: string, days = 7) =>
    apiClient
      .get<RevenueTrendResponse>('/analytics/trends', {
        params: { shop_id: shopId, days },
      })
      .then((r) => r.data),

  getHealth: (shopId: string, lookbackDays = 30) =>
    apiClient
      .get<BusinessHealthResponse>('/analytics/health', {
        params: { shop_id: shopId, lookback_days: lookbackDays },
      })
      .then((r) => r.data),

  getInsights: (shopId: string, lookbackDays = 30) =>
    apiClient
      .post<AnalyticsInsightsResponse>('/analytics/insights', {
        shop_id: shopId,
        lookback_days: lookbackDays,
      }, { timeout: 120000 })
      .then((r) => r.data),
}
