// Real-time retail event types — mirrors backend schemas/events.py exactly

export type EventType =
  | 'sale.recorded'
  | 'sale.spike_detected'
  | 'sale.drop_detected'
  | 'inventory.stock_low'
  | 'inventory.stock_critical'
  | 'inventory.stock_out'
  | 'inventory.reorder_triggered'
  | 'inventory.reorder_approved'
  | 'demand.forecast_updated'
  | 'demand.anomaly'
  | 'demand.trend_change'
  | 'business.revenue_milestone'
  | 'business.slow_mover_alert'
  | 'business.fast_mover_alert'
  | 'business.price_anomaly'
  | 'customer.activity'
  | 'customer.order_placed'
  | 'agent.decision'
  | 'system.agent_heartbeat'
  | 'system.model_retrained'

export type EventSeverity = 'info' | 'warning' | 'critical' | 'success'
export type AgentRole = 'demand' | 'intelligence' | 'manager'
export type DecisionPriority = 'critical' | 'high' | 'medium' | 'low'

export interface RetailEvent {
  event_id: string
  event_type: EventType
  shop_id: string
  product_id: string | null
  product_name: string | null
  severity: EventSeverity
  title: string
  message: string
  payload: Record<string, unknown>
  action_required: boolean
  action_label: string | null
  action_endpoint: string | null
  timestamp: string
  acknowledged: boolean
}

export interface AlertNotification {
  alert_id: string
  shop_id: string
  severity: EventSeverity
  title: string
  body: string
  product_id: string | null
  product_name: string | null
  recommended_action: string
  business_impact: string
  action_label: string | null
  action_endpoint: string | null
  created_at: string
  acknowledged: boolean
  source_event_ids: string[]
}

export interface AgentDecisionPayload {
  decision_id: string
  agent: AgentRole
  priority: DecisionPriority
  action: string
  action_label: string | null
  action_endpoint: string | null
  confidence: number
  reasoning: string
  [key: string]: unknown
}

export interface LiveKPI {
  shop_id: string
  as_of: string
  revenue_today: number
  orders_today: number
  units_today: number
  unacked_alerts: number
  agent_decisions_recent: number
  critical_events_recent: number
  agents_active: boolean
  event_stream_subscribers: number
}
