from pydantic import BaseModel, Field
from datetime import datetime, time
from uuid import UUID
from typing import List, Optional

class ReminderBase(BaseModel):
    medication_name: str = Field(..., max_length=100)
    dosage: str = Field(..., max_length=50)
    frequency: str = Field(..., max_length=20) # daily, weekly, custom
    scheduled_times: List[str] = Field(..., description="Array of times in HH:MM:SS format")
    caregiver_escalation_window_mins: int = 30

class ReminderCreate(ReminderBase):
    pass

class ReminderResponse(ReminderBase):
    id: UUID
    patient_id: UUID
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class MedicationLogCreate(BaseModel):
    scheduled_time: datetime
    status: str = Field(..., description="taken, skipped, missed")

class MedicationLogResponse(BaseModel):
    id: UUID
    reminder_id: UUID
    patient_id: UUID
    scheduled_time: datetime
    logged_time: Optional[datetime] = None
    status: str

    class Config:
        from_attributes = True
