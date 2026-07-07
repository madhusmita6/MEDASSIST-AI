import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class MedicationReminder(Base):
    __tablename__ = "medication_reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    
    medication_name = Column(String(100), nullable=False)
    dosage = Column(String(50), nullable=False)
    frequency = Column(String(20), nullable=False) # daily, weekly, custom
    scheduled_times = Column(JSON, nullable=False) # List of times e.g., ["08:00:00", "20:00:00"]
    caregiver_escalation_window_mins = Column(Integer, default=30)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("Patient", back_populates="medications")
    logs = relationship("MedicationLog", back_populates="reminder", cascade="all, delete-orphan")

class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reminder_id = Column(UUID(as_uuid=True), ForeignKey("medication_reminders.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    
    scheduled_time = Column(DateTime, nullable=False)
    logged_time = Column(DateTime, nullable=True) # Nullable if missed
    status = Column(String(20), nullable=False) # taken, skipped, missed

    # Relationships
    reminder = relationship("MedicationReminder", back_populates="logs")
