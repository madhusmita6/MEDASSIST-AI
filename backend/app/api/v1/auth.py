from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(db: Session = Depends(get_db)):
    """
    TODO: Implement user registration.
    - Validate email uniqueness.
    - Hash password using security helper.
    - Create User record and associate appropriate role profiles (Patient or Caregiver).
    """
    return {"message": "User registration placeholder - TODO"}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    TODO: Implement user authentication.
    - Check user email.
    - Verify password hash.
    - Generate and return JWT access token.
    """
    return {"access_token": "mock_token", "token_type": "bearer"}

@router.get("/me")
def get_me():
    """
    TODO: Implement profile fetch.
    - Retrieve active authenticated user profile details.
    """
    return {"id": "mock_id", "email": "mock@example.com"}
