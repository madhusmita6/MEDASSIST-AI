from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.get("/")
def list_appointments(db: Session = Depends(get_db)):
    """
    TODO: Retrieve all active appointments for the authenticated patient.
    """
    return []

@router.post("/", status_code=status.HTTP_201_CREATED)
def book_appointment(db: Session = Depends(get_db)):
    """
    TODO: Book a new clinic slot.
    - Check scheduling conflicts.
    - Reserve slot via Google Calendar MCP interface.
    - Write appointment details into local PostgreSQL.
    """
    return {"message": "Appointment created - TODO"}

@router.put("/{appointment_id}")
def reschedule_appointment(appointment_id: str, db: Session = Depends(get_db)):
    """
    TODO: Modify scheduling of an existing appointment.
    - Update event via Calendar MCP.
    - Update scheduled time inside PostgreSQL.
    """
    return {"message": f"Appointment {appointment_id} rescheduled - TODO"}

@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: str, db: Session = Depends(get_db)):
    """
    TODO: Cancel appointment slot.
    - Delete event via Calendar MCP.
    - Set status to 'cancelled' or remove from PostgreSQL.
    """
    return {"message": f"Appointment {appointment_id} cancelled - TODO"}
