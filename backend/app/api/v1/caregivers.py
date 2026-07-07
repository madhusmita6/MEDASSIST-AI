from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/caregivers", tags=["Caregivers Registry"])

@router.get("/")
def list_caregivers(db: Session = Depends(get_db)):
    """
    TODO: Retrieve all caregivers registered to monitor the current patient.
    """
    return []

@router.post("/", status_code=status.HTTP_201_CREATED)
def add_caregiver(db: Session = Depends(get_db)):
    """
    TODO: Link a new caregiver email.
    - Write record into caregiver_patients table.
    - Dispatch registration confirmation request via Gmail MCP.
    """
    return {"message": "Caregiver relationship initialized - TODO"}

@router.delete("/{caregiver_id}")
def remove_caregiver(caregiver_id: str, db: Session = Depends(get_db)):
    """
    TODO: Dissolve caregiver monitoring relationships.
    - Remove mapping from database.
    """
    return {"message": f"Caregiver relationship {caregiver_id} terminated - TODO"}
