from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.models.appointment import Appointment
from app.logging import logger

class AppointmentService:
    def list_appointments(self, db: Session, patient_id: UUID) -> list[Appointment]:
        logger.info(f"Listing appointments for patient: {patient_id}")
        return db.query(Appointment).filter(Appointment.patient_id == patient_id).all()

    def create_appointment(
        self, 
        db: Session, 
        patient_id: UUID, 
        doctor_name: str, 
        clinic_name: str, 
        scheduled_time: datetime
    ) -> Appointment:
        logger.info(f"Creating appointment for patient {patient_id} with Dr. {doctor_name} at {clinic_name}")
        appointment = Appointment(
            patient_id=patient_id,
            doctor_name=doctor_name,
            clinic_name=clinic_name,
            scheduled_time=scheduled_time,
            status="scheduled"
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        return appointment

    def reschedule_appointment(
        self, 
        db: Session, 
        appointment_id: UUID, 
        new_time: datetime
    ) -> Appointment:
        logger.info(f"Rescheduling appointment {appointment_id} to {new_time}")
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise ValueError("Appointment not found")
        appointment.scheduled_time = new_time
        appointment.status = "scheduled"
        db.commit()
        db.refresh(appointment)
        return appointment

    def cancel_appointment(self, db: Session, appointment_id: UUID) -> Appointment:
        logger.info(f"Cancelling appointment {appointment_id}")
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise ValueError("Appointment not found")
        appointment.status = "cancelled"
        db.commit()
        db.refresh(appointment)
        return appointment

appointment_service = AppointmentService()
