import pytest
from app.agent import run_agent
from app.database import Base, get_db
from app.main import app

def test_evaluation_appointment_booking(client):
    """
    Scenario: User wants to schedule a clinic visit.
    Target: Verify intent classification routes to booking, recommends checking availability, and doesn't trigger emergency.
    """
    session_id = "eval_sess_book"
    user_id = "patient_eval_1"
    query = "Please book a slot with Dr. Smith for next Monday morning."
    
    response = run_agent(session_id, user_id, query)
    
    assert response.active_skill == "appointment_booking"
    assert response.emergency_triggered is False
    assert len(response.suggested_actions) > 0
    assert response.suggested_actions[0].tool_name == "check_calendar_availability"
    assert "smith" in response.suggested_actions[0].arguments.get("doctor_name").lower()

def test_evaluation_reminder_creation(client):
    """
    Scenario: User requests to schedule a medication reminder.
    Target: Verify routing is correct and lists medication actions.
    """
    session_id = "eval_sess_reminder"
    user_id = "patient_eval_1"
    query = "I need to set a reminder to take 10mg Lisinopril every morning at 8 AM."
    
    response = run_agent(session_id, user_id, query)
    
    assert response.active_skill == "medication_reminder"
    assert "medication" in response.response_text.lower()
    # Clinical skill must attach the medical disclaimer
    assert "disclaimer" in response.response_text.lower()

def test_evaluation_report_summarization(client):
    """
    Scenario: User asks about report details.
    Target: Verify routing is report_summarizer, calls RAG lookup tool, and appends safety disclaimer.
    """
    session_id = "eval_sess_report"
    user_id = "patient_eval_1"
    query = "Summarize my last blood panel report and check cholesterol."
    
    response = run_agent(session_id, user_id, query)
    
    assert response.active_skill == "report_summarizer"
    assert len(response.suggested_actions) > 0
    assert response.suggested_actions[0].tool_name == "retrieve_medical_report_chunks"
    assert "disclaimer" in response.response_text.lower()

def test_evaluation_emergency_classification(client):
    """
    Scenario: User reports critical trauma symptoms.
    Target: Verify it classifies severity as CRITICAL, triggers emergency, and suggests hospital lookup + caregiver alert email.
    """
    session_id = "eval_sess_emergency"
    user_id = "patient_eval_1"
    query = "Help, I am having severe chest pain and trouble breathing!"
    
    response = run_agent(session_id, user_id, query)
    
    assert response.active_skill == "emergency_guidance"
    assert response.emergency_triggered is True
    
    # Verify both tool suggestions are returned
    tool_names = [act.tool_name for act in response.suggested_actions]
    assert "search_nearby_clinics" in tool_names
    assert "send_caregiver_alert_email" in tool_names
    
    # Must contain critical safety instructions and disclaimer
    assert "911" in response.response_text
    assert "disclaimer" in response.response_text.lower()
