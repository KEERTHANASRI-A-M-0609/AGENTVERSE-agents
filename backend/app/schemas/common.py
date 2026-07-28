from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TimestampMixin(BaseModel):
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SuccessResponse(BaseModel):
    status: str = "success"
    message: str


class ErrorResponse(BaseModel):
    status: str = "error"
    request_id: Optional[str] = None
    error_code: str
    message: str
    fallback_used: bool = False
    fallback_type: Optional[str] = None
