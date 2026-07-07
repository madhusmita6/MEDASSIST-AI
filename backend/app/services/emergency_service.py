from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.models.audit import AuditLog
from app.models.patient import Patient
from app.services.caregiver_service import caregiver_service
from app.logging import logger

CRITICAL_KEYWORDS = ["chest pain", "difficulty breathing", "severe bleeding", "unconscious", "stroke", "heart attack"]

FIRST_AID_GUIDES = {
    "chest pain": (
        "1. Sit the person down and keep them calm.\n"
        "2. Loosen any tight clothing.\n"
        "3. Ask if they take nitroglycerin for a known heart condition and help them take it.\n"
        "4. Call 911 immediately. Do not leave the person alone."
    ),
    "difficulty breathing": (
        "1. Help the person sit upright to ease breathing.\n"
        "2. Help them locate and use their inhaler if available.\n"
        "3. Loosen tight clothing around neck and chest.\n"
        "4. Call 911 immediately if symptoms worsen or skin looks pale."
    ),
    "severe bleeding": (
        "1. Put on protective gloves if available.\n"
        "2. Apply direct pressure to the wound using a clean cloth or bandage.\n"
        "3. Elevate the bleeding limb above the level of the heart if possible.\n"
        "4. Keep pressure applied until bleeding stops or help arrives."
    )
}

class EmergencyService:
    def classify_severity(self, symptoms: str) -> str:
        symptoms_lower = symptoms.lower()
        if any(keyword in symptoms_lower for keyword in CRITICAL_KEYWORDS):
            return "CRITICAL"
        return "ROUTINE"

    def get_first_aid_guidance(self, symptoms: str) -> str:
        symptoms_lower = symptoms.lower()
        for key, guide in FIRST_AID_GUIDES.items():
            if key in symptoms_lower:
                return guide
        return "Please call 911 immediately if symptoms are severe. Keep calm, sit down, and rest."

    def escalate_emergency(
        self,
        db: Session,
        patient_id: UUID,
        latitude: float,
        longitude: float
    ) -> Dict[str, Any]:
        logger.info(f"Escalating emergency for patient {patient_id} at coordinates ({latitude}, {longitude})")
        
        # 1. Fetch patient and associated caregivers
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError("Patient not found")
            
        caregivers = patient.caregivers
        notified_emails: List[str] = []
        
        # 2. Dispatch alerts to caregivers
        for cg in caregivers:
            alert_body = (
                f"ALERT: MedAssist SOS triggered by {patient.user.full_name}.\n"
                f"Location Coordinates: https://www.google.com/maps?q={latitude},{longitude}\n"
                f"Timestamp: {datetime.now(timezone.utc).isoformat()}"
            )
            sent = caregiver_service.send_caregiver_email(
                recipient_email=cg.alert_email,
                subject="URGENT: MedAssist Patient SOS",
                body=alert_body
            )
            if sent:
                notified_emails.append(cg.alert_email)
                
        # 3. Search closest clinical emergency rooms (Mocking Maps MCP search tools)
        nearby_hospitals = [
            {
                "name": "General Emergency Medical Center",
                "distance_miles": 1.2,
                "address": "100 Urgent Care Way, Cityville",
                "phone": "+155501938"
            },
            {
                "name": "Mercy Community Health ER",
                "distance_miles": 2.4,
                "address": "404 Clinic Blvd, MetroCity",
                "phone": "+155501830"
            }
        ]
        
        # 4. Log event in security AuditLog
        audit_log = AuditLog(
            user_id=patient.user_id,
            action="SOS_TRIGGERED",
            details={
                "latitude": latitude,
                "longitude": longitude,
                "notified_caregivers": notified_emails,
                "hospitals_presented": [h["name"] for h in nearby_hospitals]
            }
        )
        db.add(audit_log)
        db.commit()
        
        return {
            "status": "triggered",
            "caregivers_notified": notified_emails,
            "nearby_hospitals": nearby_hospitals
        }

emergency_service = EmergencyService()
