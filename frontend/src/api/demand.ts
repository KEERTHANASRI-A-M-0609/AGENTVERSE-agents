import { apiClient } from './client'
import type {
  PredictResponse,
  BulkPredictResponse,
  DashboardResponse,
  PredictionHistoryItem,
  ExplainResponse,
  RecommendationActionResponse,
  TrendsResponse,
} from '@/types'

export const demandApi = {
  predict: (shopId: string, productId: string, horizon = 7) =>
    apiClient.post<PredictResponse>('/demand/predict', {
      shop_id: shopId,
      product_id: productId,
      forecast_horizon_days: horizon,
      include_ai: false,
    }).then((r) => r.data),

  bulkPredict: (shopId: string, horizon = 7) =>
    apiClient.post<BulkPredictResponse>('/demand/predict/bulk', {
      shop_id: shopId,
      forecast_horizon_days: horizon,
    }).then((r) => r.data),

  getDashboard: (shopId: string, horizon = 7) =>
    apiClient.get<DashboardResponse>(`/demand/dashboard/${shopId}`, {
      params: { horizon },
    }).then((r) => r.data),

  getHistory: (shopId: string, limit = 20) =>
    apiClient.get<PredictionHistoryItem[]>(`/demand/history/${shopId}?limit=${limit}`).then((r) => r.data),

  getTrends: (shopId: string) =>
    apiClient.get<TrendsResponse>(`/demand/trends/${shopId}`).then((r) => r.data),

  explain: (shopId: string, productId: string, horizon = 7) =>
    apiClient.post<ExplainResponse>('/demand/explain', {
      shop_id: shopId,
      product_id: productId,
      forecast_horizon_days: horizon,
    }).then((r) => r.data),

  recommendationAction: (
    requestId: string,
    action: 'accepted' | 'modified',
    modifiedOrderQuantity?: number,
  ) =>
    apiClient.post<RecommendationActionResponse>('/demand/recommendations/action', {
      request_id: requestId,
      action,
      modified_order_quantity: modifiedOrderQuantity,
    }).then((r) => r.data),
}
