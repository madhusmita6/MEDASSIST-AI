import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    
    doctor_name = Column(String(100), nullable=False)
    clinic_name = Column(String(150), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(String(20), default="scheduled") # scheduled, completed, cancelled
    
    calendar_event_id = Column(String(255), nullable=True) # Reference to Google Calendar event ID
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
