from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional

class AppointmentBase(BaseModel):
    doctor_name: str = Field(..., max_length=100)
    clinic_name: str = Field(..., max_length=150)
    scheduled_time: datetime

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    doctor_name: Optional[str] = Field(None, max_length=100)
    clinic_name: Optional[str] = Field(None, max_length=150)
    scheduled_time: Optional[datetime] = None
    status: Optional[str] = None # scheduled, completed, cancelled

class AppointmentResponse(AppointmentBase):
    id: UUID
    patient_id: UUID
    status: str
    calendar_event_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
