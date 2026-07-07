from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/reminders", tags=["Medication Reminders"])

@router.get("/")
def list_reminders(db: Session = Depends(get_db)):
    """
    TODO: Retrieve all medication reminders configured for the authenticated user.
    """
    return []

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_reminder(db: Session = Depends(get_db)):
    """
    TODO: Configure a new medication schedule.
    - Set medicine name, dosage, timing slots.
    - Write reminder details to PostgreSQL.
    """
    return {"message": "Reminder configured - TODO"}

@router.post("/{reminder_id}/log")
def log_compliance(reminder_id: str, db: Session = Depends(get_db)):
    """
    TODO: Log compliance status (taken/skipped/missed).
    - Save entry in medication_logs table.
    - Check compliance metrics; if missed, coordinate caregiver warnings.
    """
    return {"message": f"Reminder {reminder_id} logged - TODO"}
