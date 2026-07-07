import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, List
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Roles definition
ROLE_PATIENT = "patient"
ROLE_CAREGIVER = "caregiver"
ROLE_ADMIN = "admin"

# Tool Allowlists
ALLOWED_TOOLS = [
    "check_calendar_availability",
    "book_calendar_event",
    "search_nearby_clinics",
    "send_caregiver_alert_email",
    "retrieve_medical_report_chunks"
]

class PIIMasker:
    """Utility to mask sensitive healthcare data and PII in logs or messages."""
    
    EMAIL_REGEX = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
    PHONE_REGEX = re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b")
    DOB_REGEX = re.compile(r"\b(0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])[-/](19|20)\d{2}\b")

    @classmethod
    def mask(cls, text: str) -> str:
        if not text:
            return text
        text = cls.EMAIL_REGEX.sub("[EMAIL_MASKED]", text)
        text = cls.PHONE_REGEX.sub("[PHONE_MASKED]", text)
        text = cls.DOB_REGEX.sub("[DOB_MASKED]", text)
        return text

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def is_tool_allowed(tool_name: str) -> bool:
    """Blocks tools that are not defined in the security allowlist."""
    return tool_name in ALLOWED_TOOLS

def check_prompt_injection(user_input: str) -> bool:
    """
    Checks if user input constitutes a prompt hijack attempt.
    Combines direct regex checks with a query to the Gemini model classifier.
    """
    injection_patterns = [
        r"ignore all previous instructions",
        r"system prompt",
        r"override security",
        r"delete medical disclaimer"
    ]
    for pattern in injection_patterns:
        if re.search(pattern, user_input, re.IGNORECASE):
            return True
            
    # Query LLM scanner
    try:
        from app.services.llm_service import llm_service
        return llm_service.detect_prompt_injection(user_input)
    except Exception:
        # Fallback if circular references occur during testing
        return False

def verify_patient_isolation(db, user_id: Any, patient_id: Any) -> bool:
    """
    Enforces user isolation boundaries.
    Ensures that a user can only access records if they own them (patient role matches patient_id)
    or if they are a caregiver registered to monitor that patient.
    """
    from app.models.user import User
    from app.models.patient import Patient
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
        
    if user.role == "patient":
        patient = user.patient_profile
        return patient is not None and patient.id == patient_id
        
    elif user.role == "caregiver":
        caregiver = user.caregiver_profile
        if not caregiver:
            return False
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return False
        return caregiver in patient.caregivers
        
    return False
