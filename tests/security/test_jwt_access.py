import pytest
import time
from jose import jwt, JWTError

SECRET_KEY = "supersecretkeyfortesting"
ALGORITHM = "HS256"

def generate_test_token(sub: str, role: str, expires_in: int = 60) -> str:
    expire = time.time() + expires_in
    payload = {"sub": sub, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError("Invalid or expired token") from e

def test_valid_token_parsing():
    token = generate_test_token("patient_1", "patient")
    payload = verify_token(token)
    assert payload["sub"] == "patient_1"
    assert payload["role"] == "patient"

def test_expired_token_failure():
    # Token that expired 10 seconds ago
    token = generate_test_token("patient_1", "patient", expires_in=-10)
    with pytest.raises(ValueError, match="Invalid or expired token"):
        verify_token(token)

def test_invalid_signature_failure():
    token = generate_test_token("patient_1", "patient")
    # Tamper with the token string
    tampered_token = token[:-4] + "aaaa"
    with pytest.raises(ValueError, match="Invalid or expired token"):
        verify_token(tampered_token)
