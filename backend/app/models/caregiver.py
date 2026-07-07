import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.patient import patient_caregivers

class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    alert_email = Column(String(255), nullable=False)
    notify_on_missed = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="caregiver_profile")
    patients = relationship("Patient", secondary=patient_caregivers, back_populates="caregivers")
