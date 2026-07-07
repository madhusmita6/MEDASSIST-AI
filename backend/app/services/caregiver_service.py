from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timezone
from typing import List
from app.models.caregiver import Caregiver
from app.models.patient import Patient, patient_caregivers
from app.services.notification.gmail import gmail_notification_service
from app.logging import logger

class CaregiverService:
    def list_caregivers(self, db: Session, patient_id: UUID) -> List[Caregiver]:
        logger.info(f"Listing caregivers for patient: {patient_id}")
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return []
        return patient.caregivers

    def link_caregiver(
        self,
        db: Session,
        patient_id: UUID,
        caregiver_email: str,
        relationship: str
    ) -> Caregiver:
        logger.info(f"Linking patient {patient_id} with caregiver {caregiver_email}")
        
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError("Patient not found")
            
        # Check if caregiver profile already exists for this email
        caregiver = db.query(Caregiver).filter(Caregiver.alert_email == caregiver_email).first()
        if not caregiver:
            # Create a shell Caregiver record (user_id is None / will bind on registration)
            # Create dummy user first or allow null constraint
            # In our model, user_id FK was not null. Let's create a placeholder user or check constraints.
            # Wait, in caregiver.py: user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
            # So user_id is NOT nullable! Let's mock a user login record for them, or check if they exist.
            # To respect constraints, let's look up if user exists. If not, create a placeholder user account with role 'caregiver'.
            from app.models.user import User
            from app.security import get_password_hash
            
            # Create placeholder User account
            placeholder_user = User(
                email=caregiver_email,
                password_hash=get_password_hash("temporary_hash_123"),
                full_name=caregiver_email.split("@")[0].capitalize(),
                role="caregiver"
            )
            db.add(placeholder_user)
            db.commit()
            db.refresh(placeholder_user)
            
            caregiver = Caregiver(
                user_id=placeholder_user.id,
                alert_email=caregiver_email,
                notify_on_missed=True
            )
            db.add(caregiver)
            db.commit()
            db.refresh(caregiver)
            
        # Bind relationship in association table
        # Check if association already exists
        if caregiver not in patient.caregivers:
            # Insert association
            statement = patient_caregivers.insert().values(
                patient_id=patient.id,
                caregiver_id=caregiver.id,
                relationship=relationship
            )
            db.execute(statement)
            db.commit()
            
        # Trigger verification request email
        self.send_caregiver_email(
            recipient_email=caregiver_email,
            subject="MedAssist AI Connection Request",
            body=(
                f"Hello,\n\n"
                f"You have been added as a caregiver monitoring patient status on MedAssist AI.\n"
                f"If you did not request this, please disregard."
            )
        )
        
        return caregiver

    def send_caregiver_email(self, recipient_email: str, subject: str, body: str) -> bool:
        """Invokes the concrete Gmail/SMTP sender service."""
        return gmail_notification_service.send_alert(recipient_email, subject, body)

caregiver_service = CaregiverService()
