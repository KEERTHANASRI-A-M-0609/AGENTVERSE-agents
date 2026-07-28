# Product Requirements Document
## Demand Prediction Agent — ShopMind AI

**Version:** 1.0  
**Author:** Product Team  
**Status:** Approved for Development  
**Last Updated:** 2025

---

## 1. Vision

Empower small retail shop owners — who have zero data science background — to predict what products will sell, when they will sell, and how much stock to keep, using AI that thinks like their most experienced employee.

The Demand Prediction Agent is the intelligence core of ShopMind AI. It transforms raw sales history into actionable stock decisions, so a grocery store owner in a small town makes the same quality inventory decisions as a large retail chain.

---

## 2. Problem Statement

Small retail shop owners in India and similar markets operate on thin margins with high uncertainty. They face three critical problems every single day:

**Problem 1 — Overstocking**  
They buy too much of a product fearing stockout. Perishables rot. Capital gets locked. Cash flow suffers.

**Problem 2 — Stockouts**  
They run out of fast-moving items during peak demand (festivals, weekends, seasons). Customers walk away. Revenue is permanently lost.

**Problem 3 — Gut-Feel Decisions**  
All purchasing decisions are made from memory and intuition. There is no system. When the owner is sick or on leave, the shop suffers. There is no institutional knowledge.

These three problems together cause an estimated 15–30% revenue leakage for small retailers every month.

---

## 3. Business Goal

| Goal | Metric | Target |
|------|--------|--------|
| Reduce stockouts | Stockout frequency per month | Reduce by 40% in 90 days |
| Reduce overstock waste | Overstock value as % of inventory | Reduce by 25% in 90 days |
| Increase reorder accuracy | Correct reorder quantity predictions | >80% accuracy |
| Save owner time | Hours spent on manual stock planning | Reduce by 3 hours/week |
| Drive platform retention | Agent usage frequency | 4+ sessions/week per shop |

---

## 4. User Personas

### Persona 1 — Ravi, Grocery Store Owner
- Age: 42, runs a neighborhood kirana store
- Tech comfort: Uses WhatsApp, basic smartphone
- Pain: Buys too much rice during off-season, runs out of oil during festivals
- Goal: Know what to order before he runs out, not after
- Expectation: Simple answers in plain language, not charts or numbers

### Persona 2 — Meena, Stationery Shop Owner
- Age: 35, runs a school stationery shop
- Tech comfort: Uses Excel occasionally
- Pain: Massive demand spike in June (school reopening) catches her underprepared every year
- Goal: Seasonal demand alerts weeks in advance
- Expectation: Proactive warnings, not reactive reports

### Persona 3 — Arjun, Mobile Accessories Shop Owner
- Age: 28, runs a mobile accessories shop in a mall
- Tech comfort: Comfortable with apps
- Pain: New phone launches create unpredictable accessory demand spikes
- Goal: Trend-aware predictions that factor in external events
- Expectation: Confidence scores on predictions, not just numbers

### Persona 4 — Manager Agent (System Persona)
- This agent is a software system, not a human
- It calls the Demand Prediction Agent via API to get forecasts
- It needs structured JSON responses with confidence scores
- It orchestrates decisions across all six agents

---

## 5. User Journey

### Human User Journey (Shop Owner)

```
1. Owner opens ShopMind AI app
2. Navigates to "Demand Forecast" section
3. Sees dashboard: top 5 products predicted to run low this week
4. Taps on a product → sees 7-day and 30-day demand forecast
5. Sees AI recommendation: "Order 50 units of Tata Salt by Thursday"
6. Accepts or modifies the recommendation
7. Recommendation is logged and tracked
8. Next week: sees accuracy report — "Last week's predictions were 87% accurate"
```

### Manager Agent Journey (System)

```
1. Manager Agent sends POST /api/v1/demand/predict with product_id and shop_id
2. Demand Prediction Agent fetches historical sales from DB
3. Runs ML model + enriches with Gemini AI context
4. Returns structured JSON with forecast, confidence, reorder flag
5. Manager Agent uses this to trigger Inventory Agent or Pricing Agent
```

---

## 6. Pain Points Addressed

| Pain Point | How This Agent Solves It |
|------------|--------------------------|
| No visibility into future demand | 7-day and 30-day ML-based forecasts |
| Missing seasonal patterns | Seasonal decomposition in the ML model |
| No reorder alerts | Automated reorder flag when stock < predicted demand |
| Complex data analysis | Gemini AI translates predictions into plain English |
| No confidence in predictions | Confidence score (0–1) returned with every forecast |
| Manual tracking across products | Bulk forecast API for all products at once |

---

## 7. Scope (In Scope)

- Predict demand for individual products for a specific shop
- Predict demand for all products in a shop (bulk)
- Detect seasonal trends and weekly patterns
- Generate reorder recommendations with quantity suggestions
- Provide AI-generated natural language explanation of predictions
- Expose REST APIs for Manager Agent integration
- Store prediction history for accuracy tracking
- Support multiple shop types: grocery, stationery, textile, mobile
- Confidence scoring on every prediction
- Fast-moving vs slow-moving product classification

---

## 8. Out of Scope

- Pricing decisions (handled by Pricing Agent)
- Supplier management or purchase order creation
- Customer behavior analysis (handled by Customer Support Agent)
- Financial reporting (handled by Business Analytics Agent)
- Real-time POS integration (future scope)
- Multi-location inventory aggregation (future scope)
- Competitor price monitoring
- Demand prediction for services (only physical products)

---

## 9. Functional Requirements

### FR-01: Single Product Demand Forecast
- Input: shop_id, product_id, forecast_horizon (7 or 30 days)
- Output: daily demand forecast array, total predicted demand, confidence score
- Model: Time series forecasting using historical sales data

### FR-02: Bulk Product Forecast
- Input: shop_id, list of product_ids (or "all")
- Output: forecast for each product, sorted by urgency
- Performance: Must complete within 10 seconds for up to 50 products

### FR-03: Reorder Recommendation
- Input: shop_id, product_id, current_stock
- Output: reorder flag (true/false), recommended order quantity, recommended order date
- Logic: Trigger reorder when predicted demand in lead_time days > current stock

### FR-04: AI Explanation
- Input: forecast data
- Output: Plain English explanation generated by Gemini API
- Example: "Tata Salt demand will spike 40% next week likely due to the upcoming festival season. Consider ordering 60 units by Wednesday."

### FR-05: Trend Detection
- Detect: upward trend, downward trend, seasonal spike, stable
- Output: trend_type field in every forecast response

### FR-06: Prediction History
- Store every prediction made with timestamp
- Allow retrieval of past predictions for accuracy comparison
- Enable model performance tracking over time

### FR-07: Product Classification
- Classify each product as: fast_moving, slow_moving, seasonal, perishable
- Use classification to adjust forecast aggressiveness

### FR-08: Health Check API
- Expose /health endpoint for system monitoring
- Return model status, DB status, last prediction timestamp

---

## 10. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Single forecast API < 2 seconds response time |
| Performance | Bulk forecast (50 products) < 10 seconds |
| Availability | 99.5% uptime during business hours (6 AM – 10 PM) |
| Scalability | Support 500 concurrent shop sessions |
| Security | API key authentication for all endpoints |
| Data Privacy | Shop data is isolated — no cross-shop data leakage |
| Reliability | Graceful degradation if Gemini API is unavailable |
| Observability | Structured logging for every prediction request |
| Maintainability | Modular code — ML model swappable without API changes |
| Portability | Runs locally on SQLite, deployable to cloud with PostgreSQL |

---

## 11. AI Capabilities

### ML Layer (Scikit-Learn)
- Algorithm: Linear Regression with feature engineering as baseline
- Features: day_of_week, week_of_year, month, lag_7, lag_14, rolling_mean_7, rolling_mean_30, is_weekend, is_festival_season
- Fallback: Moving average when insufficient data (< 30 days history)
- Model persistence: Saved per shop per product category

### LLM Layer (Gemini API)
- Role: Translate numerical forecasts into business language
- Role: Detect contextual reasons for demand spikes (festivals, seasons, events)
- Role: Generate reorder recommendation text
- Role: Answer natural language questions about demand trends
- Prompt strategy: Structured prompts with forecast data injected as context
- Fallback: Return raw forecast data if Gemini API fails

### Intelligence Combination
- ML model provides the numbers (what and how much)
- Gemini provides the context (why and when)
- Together they produce: forecast + explanation + recommendation

---

## 12. Success Metrics

| Metric | Measurement Method | Target |
|--------|-------------------|--------|
| Forecast Accuracy (MAPE) | Mean Absolute Percentage Error on test set | < 20% MAPE |
| API Response Time | P95 latency monitoring | < 2 seconds |
| Reorder Recommendation Acceptance Rate | User accepts AI suggestion / total suggestions | > 60% |
| Stockout Reduction | Compare stockout events before/after adoption | 40% reduction |
| Agent Uptime | Monitoring alerts | > 99.5% |
| Gemini Explanation Quality | User rating on explanation helpfulness | > 4/5 stars |

---

## 13. User Stories

**US-01:** As a shop owner, I want to see which products will run out this week so that I can reorder before it's too late.

**US-02:** As a shop owner, I want to know how much of each product to order so that I don't overbuy or underbuy.

**US-03:** As a shop owner, I want the AI to explain why demand is expected to increase so that I can trust the recommendation.

**US-04:** As a shop owner, I want to see seasonal demand patterns for my products so that I can prepare months in advance.

**US-05:** As a shop owner, I want to receive alerts when a product is predicted to stock out within 3 days so that I can act immediately.

**US-06:** As the Manager Agent, I want to call a demand forecast API and receive structured JSON so that I can coordinate with the Inventory Agent.

**US-07:** As the Manager Agent, I want a confidence score with every prediction so that I can decide how aggressively to act on the recommendation.

**US-08:** As a shop owner, I want to see how accurate last week's predictions were so that I can trust the system over time.

---

## 14. Edge Cases

| Edge Case | Handling Strategy |
|-----------|------------------|
| New product with zero sales history | Use category-level average as baseline forecast |
| Product sold only once in 6 months | Classify as slow-moving, use conservative forecast |
| Sudden demand spike (unrecorded event) | Flag as anomaly, do not use in model training |
| Shop has only 7 days of data | Use moving average, flag low confidence |
| Gemini API timeout | Return ML forecast only, log Gemini failure |
| Negative stock values in data | Treat as data error, exclude from training |
| Product discontinued | Return zero forecast, flag as inactive |
| Festival date varies year to year | Use configurable festival calendar per region |
| All products requested but shop has 500+ products | Paginate response, process in batches |
| Forecast horizon > 90 days | Cap at 90 days, return warning in response |

---

## 15. Future Scope

- Integration with WhatsApp Business API for demand alerts via chat
- Real-time POS data ingestion via webhook
- External data enrichment: weather API, local event calendar
- Deep learning models: LSTM for long-term forecasting
- Collaborative filtering: "Shops like yours also see high demand for X"
- Supplier lead time integration for smarter reorder dates
- Multi-language AI explanations (Hindi, Tamil, Telugu)
- Mobile push notifications for urgent reorder alerts
- Demand elasticity modeling linked to Pricing Agent
- AutoML: automatic model retraining when accuracy drops

---

## 16. Complete Agent Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    DEMAND PREDICTION AGENT                   │
│                                                             │
│  INPUT SOURCES                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Manager Agent│  │  Shop Owner  │  │  Scheduled Cron  │  │
│  │  (API Call)  │  │  (API Call)  │  │  (Auto Refresh)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         └─────────────────┴──────────────────┘             │
│                           │                                 │
│                    ┌──────▼──────┐                          │
│                    │  API Layer  │                          │
│                    │  FastAPI    │                          │
│                    └──────┬──────┘                          │
│                           │                                 │
│                    ┌──────▼──────┐                          │
│                    │  Service    │                          │
│                    │  Layer      │                          │
│                    └──────┬──────┘                          │
│              ┌────────────┼────────────┐                    │
│              │            │            │                    │
│       ┌──────▼──┐  ┌──────▼──┐  ┌─────▼──────┐            │
│       │  Data   │  │   ML    │  │  Gemini AI │            │
│       │  Layer  │  │  Engine │  │   Layer    │            │
│       │ SQLite  │  │Sklearn  │  │  Prompts   │            │
│       └──────┬──┘  └──────┬──┘  └─────┬──────┘            │
│              └────────────┴────────────┘                    │
│                           │                                 │
│                    ┌──────▼──────┐                          │
│                    │  Response   │                          │
│                    │  Builder    │                          │
│                    └──────┬──────┘                          │
│                           │                                 │
│                    ┌──────▼──────┐                          │
│                    │  JSON Out   │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

**Step-by-step workflow:**

1. Request arrives at FastAPI endpoint (from Manager Agent or shop owner UI)
2. Auth middleware validates API key
3. Request validator checks schema (Pydantic)
4. Service layer orchestrates the prediction pipeline
5. Repository layer fetches historical sales data from SQLite
6. Feature engineering transforms raw data into ML features
7. ML model generates numerical forecast (7 or 30 days)
8. Trend detector classifies the forecast pattern
9. Reorder calculator checks if reorder is needed
10. Gemini AI receives forecast + context → generates explanation
11. Response builder assembles final JSON
12. Prediction is stored in history table
13. Response returned to caller

---

## 17. Data Flow

```
Sales Data (CSV / DB)
        │
        ▼
Data Validation & Cleaning
        │
        ▼
Feature Engineering
(lag features, rolling averages, date features)
        │
        ▼
ML Model (Scikit-Learn)
        │
        ▼
Raw Forecast (array of daily predictions)
        │
        ├──────────────────────────────────┐
        ▼                                  ▼
Trend Analysis                    Reorder Calculation
(up/down/seasonal/stable)         (stock vs predicted demand)
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
              Gemini AI Enrichment
              (plain English explanation)
                       │
                       ▼
              Final Response JSON
                       │
                       ├── Returned to caller
                       └── Stored in prediction_history table
```

---

## 18. Decision Flow

```
Incoming Forecast Request
          │
          ▼
Does product have >= 30 days of sales data?
    YES → Use ML Model (Linear Regression)
    NO  → Use Moving Average Fallback
          │
          ▼
Is Gemini API available?
    YES → Enrich with AI explanation
    NO  → Return ML forecast with default explanation
          │
          ▼
Is predicted demand > current stock in lead_time days?
    YES → Set reorder_required = true, calculate order_quantity
    NO  → Set reorder_required = false
          │
          ▼
Is confidence_score < 0.5?
    YES → Add low_confidence warning to response
    NO  → Return clean response
          │
          ▼
Return Final JSON Response
```

---

## 19. APIs Required

| Method | Endpoint | Description | Caller |
|--------|----------|-------------|--------|
| POST | /api/v1/demand/predict | Single product forecast | Manager Agent, UI |
| POST | /api/v1/demand/predict/bulk | All products forecast | Manager Agent |
| GET | /api/v1/demand/history/{shop_id} | Past predictions | UI |
| GET | /api/v1/demand/trends/{shop_id} | Trend summary | UI, Manager Agent |
| POST | /api/v1/demand/explain | AI explanation for a forecast | UI |
| GET | /api/v1/products/{shop_id} | List products for a shop | UI |
| POST | /api/v1/sales/ingest | Upload sales data | UI, Admin |
| GET | /health | Health check | DevOps, Manager Agent |

---

## 20. Expected JSON Response Format

### Single Product Forecast Response
```json
{
  "status": "success",
  "request_id": "req_abc123",
  "shop_id": "shop_001",
  "product_id": "prod_042",
  "product_name": "Tata Salt 1kg",
  "forecast_horizon_days": 7,
  "generated_at": "2025-01-15T10:30:00Z",
  "forecast": {
    "daily_predictions": [
      {"date": "2025-01-16", "predicted_units": 12},
      {"date": "2025-01-17", "predicted_units": 15},
      {"date": "2025-01-18", "predicted_units": 11},
      {"date": "2025-01-19", "predicted_units": 18},
      {"date": "2025-01-20", "predicted_units": 22},
      {"date": "2025-01-21", "predicted_units": 25},
      {"date": "2025-01-22", "predicted_units": 14}
    ],
    "total_predicted_units": 117,
    "confidence_score": 0.82,
    "trend_type": "seasonal_spike",
    "model_used": "linear_regression"
  },
  "reorder": {
    "reorder_required": true,
    "current_stock": 45,
    "recommended_order_quantity": 80,
    "recommended_order_by_date": "2025-01-17",
    "days_until_stockout": 3
  },
  "ai_explanation": "Tata Salt demand is expected to spike 40% this weekend, likely driven by the upcoming Pongal festival. Current stock of 45 units will last approximately 3 days. Recommend ordering 80 units by Thursday to avoid stockout.",
  "product_classification": "fast_moving",
  "warnings": []
}
```

### Bulk Forecast Response
```json
{
  "status": "success",
  "shop_id": "shop_001",
  "generated_at": "2025-01-15T10:30:00Z",
  "total_products": 3,
  "forecasts": [
    {
      "product_id": "prod_042",
      "product_name": "Tata Salt 1kg",
      "total_predicted_units": 117,
      "confidence_score": 0.82,
      "reorder_required": true,
      "days_until_stockout": 3,
      "urgency": "high"
    },
    {
      "product_id": "prod_018",
      "product_name": "Sunflower Oil 1L",
      "total_predicted_units": 45,
      "confidence_score": 0.71,
      "reorder_required": false,
      "days_until_stockout": 12,
      "urgency": "low"
    }
  ],
  "summary": {
    "high_urgency_count": 1,
    "medium_urgency_count": 0,
    "low_urgency_count": 2
  }
}
```

### Error Response
```json
{
  "status": "error",
  "request_id": "req_abc123",
  "error_code": "INSUFFICIENT_DATA",
  "message": "Product prod_042 has only 5 days of sales history. Minimum 7 days required.",
  "fallback_used": true,
  "fallback_type": "moving_average"
}
```

---

## 21. Why This Agent Creates Business Value

**For the Shop Owner:**
The Demand Prediction Agent converts years of sales data into a daily action plan. Instead of guessing, the owner gets a specific answer: "Order 80 units of Tata Salt by Thursday." This single recommendation, if followed, prevents a stockout that would have cost the shop ₹2,000–₹5,000 in lost sales over a weekend.

**For the Platform (ShopMind AI):**
This agent is the stickiest feature of the platform. Once a shop owner sees accurate predictions for 2–3 weeks, they trust the system and use it daily. It drives retention, word-of-mouth, and upsell to premium tiers.

**For the Multi-Agent System:**
The Demand Prediction Agent is the data backbone for three other agents:
- Inventory Agent uses its forecasts to trigger purchase orders
- Pricing Agent uses demand trends to adjust prices dynamically
- Business Analytics Agent uses prediction accuracy to generate performance reports

Without accurate demand prediction, the entire ShopMind AI platform loses its intelligence. This agent is the foundation.

**Quantified Business Impact (per shop, per month):**
- Stockout prevention: +₹8,000–₹15,000 in recovered revenue
- Overstock reduction: -₹3,000–₹6,000 in waste
- Time saved: 3 hours/week × 4 weeks = 12 hours of owner time
- Net value delivered: ₹11,000–₹21,000/month per shop

At 1,000 shops, this agent creates ₹1.1 Cr – ₹2.1 Cr in monthly value for the ecosystem.

---

*End of PRD — Demand Prediction Agent v1.0*
