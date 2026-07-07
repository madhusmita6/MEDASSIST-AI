from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timezone
from typing import List
from app.models.medication import MedicationReminder, MedicationLog
from app.logging import logger

class ReminderService:
    def list_reminders(self, db: Session, patient_id: UUID) -> List[MedicationReminder]:
        logger.info(f"Listing medication reminders for patient: {patient_id}")
        return db.query(MedicationReminder).filter(
            MedicationReminder.patient_id == patient_id,
            MedicationReminder.active == True
        ).all()

    def create_reminder(
        self,
        db: Session,
        patient_id: UUID,
        medication_name: str,
        dosage: str,
        frequency: str,
        scheduled_times: List[str],
        caregiver_escalation_window_mins: int = 30
    ) -> MedicationReminder:
        logger.info(f"Configuring reminder for medication {medication_name} ({dosage}) for patient {patient_id}")
        reminder = MedicationReminder(
            patient_id=patient_id,
            medication_name=medication_name,
            dosage=dosage,
            frequency=frequency,
            scheduled_times=scheduled_times,
            caregiver_escalation_window_mins=caregiver_escalation_window_mins,
            active=True
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder

    def delete_reminder(self, db: Session, reminder_id: UUID) -> bool:
        logger.info(f"Deactivating medication reminder {reminder_id}")
        reminder = db.query(MedicationReminder).filter(MedicationReminder.id == reminder_id).first()
        if not reminder:
            return False
        # Soft delete by marking active as false
        reminder.active = False
        db.commit()
        return True

    def log_medication_compliance(
        self,
        db: Session,
        reminder_id: UUID,
        patient_id: UUID,
        scheduled_time: datetime,
        status: str
    ) -> MedicationLog:
        logger.info(f"Logging intake compliance for reminder {reminder_id} - status: {status}")
        log_entry = MedicationLog(
            reminder_id=reminder_id,
            patient_id=patient_id,
            scheduled_time=scheduled_time,
            logged_time=datetime.now(timezone.utc) if status in ["taken", "skipped"] else None,
            status=status
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

reminder_service = ReminderService()
