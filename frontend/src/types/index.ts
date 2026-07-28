// All TypeScript interfaces matching backend Pydantic schemas exactly

export interface DailyPrediction {
  date: string
  predicted_units: number
}

export interface ForecastDetail {
  daily_predictions: DailyPrediction[]
  total_predicted_units: number
  confidence_score: number
  trend_type: 'upward' | 'downward' | 'seasonal_spike' | 'stable'
  model_used: string
}

export interface ReorderDetail {
  reorder_required: boolean
  current_stock: number
  recommended_order_quantity: number
  recommended_order_by_date: string | null
  days_until_stockout: number | null
}

export interface PredictResponse {
  status: string
  request_id: string
  shop_id: string
  product_id: string
  product_name: string
  forecast_horizon_days: number
  generated_at: string
  forecast: ForecastDetail
  reorder: ReorderDetail
  ai_explanation: string
  product_classification: string
  warnings: string[]
}

export interface BulkForecastItem {
  product_id: string
  product_name: string
  total_predicted_units: number
  confidence_score: number
  reorder_required: boolean
  days_until_stockout: number | null
  urgency: 'high' | 'medium' | 'low'
  trend_type: string
  ai_explanation: string
}

export interface BulkSummary {
  high_urgency_count: number
  medium_urgency_count: number
  low_urgency_count: number
}

export interface BulkPredictResponse {
  status: string
  shop_id: string
  generated_at: string
  total_products: number
  forecasts: BulkForecastItem[]
  summary: BulkSummary
}

export interface DashboardKPI {
  total_products: number
  high_urgency_products: number
  medium_urgency_products: number
  avg_confidence_score: number
  total_predicted_demand_7d: number
  inventory_health_score: number
  reorder_coverage_pct: number
  forecast_horizon_days: number
}

export interface AccuracyReport {
  available: boolean
  accuracy_pct: number | null
  sample_size: number
  message: string
}

export interface PredictionHistoryItem {
  request_id: string
  product_id: string
  product_name: string | null
  forecast_horizon_days: number
  total_predicted_units: number
  confidence_score: number
  trend_type: string | null
  reorder_required: boolean
  ai_explanation: string | null
  created_at: string
}

export interface DashboardResponse {
  status: string
  shop_id: string
  shop_name?: string | null
  generated_at: string
  forecast_horizon_days: number
  kpis: DashboardKPI
  top_reorder_products: BulkForecastItem[]
  portfolio: BulkForecastItem[]
  recent_predictions: PredictionHistoryItem[]
  accuracy: AccuracyReport
  stockout_alerts: BulkForecastItem[]
  executive_brief: string
}

export interface ExplainResponse {
  status: string
  shop_id: string
  product_id: string
  product_name: string
  explanation: string
  source: 'gemini' | 'local_template' | string
  generated_at: string
}

export interface RecommendationActionResponse {
  status: string
  request_id: string
  action: string
  modified_order_quantity: number | null
}

export interface TrendProductItem {
  product_id: string
  product_name: string
  trend_type: string
  urgency: string
  total_predicted_units: number
  days_until_stockout: number | null
}

export interface TrendsResponse {
  status: string
  shop_id: string
  generated_at: string
  trend_counts: Record<string, number>
  urgency_summary: BulkSummary
  products: TrendProductItem[]
  top_movers: TrendProductItem[]
}

export interface ProductResponse {
  id: string
  shop_id: string
  name: string
  category: string
  unit: string
  current_stock: number
  reorder_point: number
  lead_time_days: number
  selling_price: number | null
  classification: string
  is_active: boolean
}

// ── Business Analytics Agent ────────────────────────────────────────────────

export interface AnalyticsDashboardKPIs {
  todays_revenue: number
  total_orders: number
  total_products_sold: number
  revenue_growth_pct: number
}

export interface AnalyticsDashboardResponse {
  status: string
  shop_id: string
  shop_name?: string | null
  as_of: string
  generated_at: string
  kpis: AnalyticsDashboardKPIs
}

export interface ProductSalesItem {
  product_id: string
  product_name: string
  category: string | null
  units_sold: number
  revenue: number
}

export interface ProductAnalyticsResponse {
  status: string
  shop_id: string
  as_of: string
  lookback_days: number
  generated_at: string
  best_selling: ProductSalesItem[]
  slow_moving: ProductSalesItem[]
}

export interface DailyRevenuePoint {
  date: string
  revenue: number
  orders: number
  units_sold: number
}

export interface RevenueTrendResponse {
  status: string
  shop_id: string
  as_of: string
  generated_at: string
  days: number
  series: DailyRevenuePoint[]
  total_revenue: number
}

export interface HealthScoreBreakdown {
  revenue_growth: number
  sales_consistency: number
  product_movement: number
}

export interface BusinessHealthResponse {
  status: string
  shop_id: string
  as_of: string
  generated_at: string
  health_score: number
  explanation: string
  breakdown: HealthScoreBreakdown
}

export interface AnalyticsInsightsResponse {
  status: string
  shop_id: string
  as_of: string
  generated_at: string
  summary: string
  highlights: string[]
  recommendations: string[]
  health_score: number
}
