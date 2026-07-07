import pytest

# Simple triage lookup rule
CRITICAL_FLAGS = ["chest pain", "difficulty breathing", "severe bleeding", "unconscious", "stroke"]

def classify_symptom_severity(message: str) -> str:
    """Helper method mimicking agent triage classification logic."""
    msg_lower = message.lower()
    for flag in CRITICAL_FLAGS:
        if flag in msg_lower:
            return "CRITICAL"
    if "breathing" in msg_lower and "difficult" in msg_lower:
        return "CRITICAL"
    return "ROUTINE"

@pytest.mark.parametrize("input_text,expected_severity", [
    ("I have severe chest pain and pressure on my left arm.", "CRITICAL"),
    ("My breathing is very difficult right now, I need help.", "CRITICAL"),
    ("Can you schedule a checkup with my doctor?", "ROUTINE"),
    ("My head hurts a little bit, maybe I need some water.", "ROUTINE"),
    ("I collapsed and had stroke symptoms.", "CRITICAL"),
])
def test_emergency_triage_classification(input_text, expected_severity):
    """Verify that symptoms are correctly flagged for emergency escalation."""
    severity = classify_symptom_severity(input_text)
    assert severity == expected_severity
