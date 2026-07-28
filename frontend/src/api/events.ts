import { apiClient } from './client'
import type { AlertNotification, LiveKPI, RetailEvent } from '@/types/events'

export const eventsApi = {
  getHistory: (shopId: string, limit = 50) =>
    apiClient.get<RetailEvent[]>(`/events/history/${shopId}?limit=${limit}`).then((r) => r.data),

  getAlerts: (shopId: string, unreadOnly = false) =>
    apiClient
      .get<AlertNotification[]>(`/events/alerts/${shopId}?unread_only=${unreadOnly}`)
      .then((r) => r.data),

  acknowledgeAlert: (shopId: string, alertId: string) =>
    apiClient.post(`/events/alerts/${shopId}/${alertId}/ack`).then((r) => r.data),

  getAlertCount: (shopId: string) =>
    apiClient.get<{ unacknowledged: number; active_subscribers: number }>(
      `/events/alerts/${shopId}/count`
    ).then((r) => r.data),

  getDecisions: (shopId: string, limit = 20) =>
    apiClient.get<RetailEvent[]>(`/events/decisions/${shopId}?limit=${limit}`).then((r) => r.data),

  getLiveKPI: (shopId: string) =>
    apiClient.get<LiveKPI>(`/events/livekpi/${shopId}`).then((r) => r.data),
}
