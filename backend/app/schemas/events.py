"""
Retail Event Schema — typed events that flow through the event bus.
Every retail action in the store generates one of these events.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EventType(str, Enum):
    # Sales events
    SALE_RECORDED = "sale.recorded"
    SALE_SPIKE_DETECTED = "sale.spike_detected"
    SALE_DROP_DETECTED = "sale.drop_detected"

    # Inventory events
    STOCK_LOW = "inventory.stock_low"
    STOCK_CRITICAL = "inventory.stock_critical"
    STOCK_OUT = "inventory.stock_out"
    REORDER_TRIGGERED = "inventory.reorder_triggered"
    REORDER_APPROVED = "inventory.reorder_approved"

    # Demand events
    DEMAND_FORECAST_UPDATED = "demand.forecast_updated"
    DEMAND_ANOMALY = "demand.anomaly"
    DEMAND_TREND_CHANGE = "demand.trend_change"

    # Business events
    REVENUE_MILESTONE = "business.revenue_milestone"
    SLOW_MOVER_ALERT = "business.slow_mover_alert"
    FAST_MOVER_ALERT = "business.fast_mover_alert"
    PRICE_ANOMALY = "business.price_anomaly"

    # Customer events
    CUSTOMER_ACTIVITY = "customer.activity"
    ORDER_PLACED = "customer.order_placed"

    # Agent events
    AGENT_DECISION = "agent.decision"
    AGENT_HEARTBEAT = "system.agent_heartbeat"
    MODEL_RETRAINED = "system.model_retrained"


class EventSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    SUCCESS = "success"


class RetailEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    event_type: EventType
    shop_id: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    severity: EventSeverity = EventSeverity.INFO
    title: str
    message: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    action_required: bool = False
    action_label: Optional[str] = None
    action_endpoint: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    acknowledged: bool = False

    def to_sse(self) -> str:
        """Format as Server-Sent Event string."""
        import json
        data = self.model_dump(mode="json")
        return f"data: {json.dumps(data)}\n\n"


class AlertNotification(BaseModel):
    """Proactive AI-generated alert surfaced to the store owner."""
    alert_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:10])
    shop_id: str
    severity: EventSeverity
    title: str
    body: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    recommended_action: str
    business_impact: str
    action_label: Optional[str] = None
    action_endpoint: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged: bool = False
    source_event_ids: List[str] = Field(default_factory=list)


class AgentRole(str, Enum):
    DEMAND = "demand"
    INTELLIGENCE = "intelligence"
    MANAGER = "manager"


class DecisionPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AgentDecision(BaseModel):
    """Structured decision produced by an AI agent with full reasoning chain."""
    decision_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:10])
    shop_id: str
    agent: AgentRole
    priority: DecisionPriority
    title: str
    reasoning: str
    action: str
    action_label: Optional[str] = None
    action_endpoint: Optional[str] = None
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    source_event_ids: List[str] = Field(default_factory=list)
    payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    executed: bool = False
