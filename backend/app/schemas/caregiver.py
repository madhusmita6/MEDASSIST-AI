from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime

class CaregiverLinkRequest(BaseModel):
    caregiver_email: EmailStr
    relationship: str = Field(..., max_length=50) # spouse, parent, child, guardian

class CaregiverResponse(BaseModel):
    id: UUID
    user_id: UUID
    alert_email: str
    notify_on_missed: bool

    class Config:
        from_attributes = True
        
class CaregiverPatientResponse(BaseModel):
    patient_id: UUID
    caregiver_email: str
    relationship: str
    status: str # pending, accepted, revoked
    created_at: datetime
    
    class Config:
        from_attributes = True
