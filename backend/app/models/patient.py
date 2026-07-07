import uuid
from sqlalchemy import Column, String, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

# Many-to-many association table linking Patients and Caregivers
patient_caregivers = Table(
    "patient_caregivers_association",
    Base.metadata,
    Column("patient_id", UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), primary_key=True),
    Column("caregiver_id", UUID(as_uuid=True), ForeignKey("caregivers.id", ondelete="CASCADE"), primary_key=True),
    Column("relationship", String(50), default="guardian") # spouse, parent, child, guardian
)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    medical_conditions = Column(String, nullable=True)
    allergies = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="patient_profile")
    caregivers = relationship("Caregiver", secondary=patient_caregivers, back_populates="patients")
    appointments = relationship("Appointment", back_populates="patient")
    medications = relationship("MedicationReminder", back_populates="patient")
    reports = relationship("UploadedReport", back_populates="patient")
