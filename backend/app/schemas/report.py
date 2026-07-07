from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional

class ReportResponse(BaseModel):
    id: UUID
    patient_id: UUID
    filename: str
    storage_path: str
    summary_cached: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReportSummaryRequest(BaseModel):
    query: str
