import pytest
from app.agent import run_agent
from app.agent.session import session_manager

def test_appointment_booking_confirmation_yes(client):
    """
    Verify that proposing a booking, receiving a 'yes' confirmation,
    creates the appointment and outputs the success message.
    """
    session_id = "test_confirm_yes"
    user_id = "patient_test_confirm"
    
    # 1. First turn: Propose booking slot
    res_1 = run_agent(session_id, user_id, "Schedule checkup with Dr. Adams")
    assert "would you like me to book it" in res_1.response_text.lower()
    
    # Verify session state tracks confirmation request
    state = session_manager.get_or_create_session(session_id, user_id)
    assert state.awaiting_confirmation is True
    assert state.pending_action == "appointment_booking"
    
    # 2. Second turn: Confirm with 'yes'
    res_2 = run_agent(session_id, user_id, "yes")
    assert "booked for Monday at 09:00 AM" in res_2.response_text
    
    # Verify confirmation state is cleared
    state_after = session_manager.get_or_create_session(session_id, user_id)
    assert state_after.awaiting_confirmation is False
    assert state_after.pending_action is None

def test_appointment_booking_cancellation_no(client):
    """
    Verify that proposing a booking and receiving a 'no' response
    clears the pending action and outputs a cancellation message.
    """
    session_id = "test_confirm_no"
    user_id = "patient_test_confirm"
    
    # 1. First turn: Propose booking slot
    res_1 = run_agent(session_id, user_id, "Schedule checkup with Dr. Adams")
    assert "would you like me to book it" in res_1.response_text.lower()
    
    # 2. Second turn: Decline with 'no'
    res_2 = run_agent(session_id, user_id, "no")
    assert "not booked" in res_2.response_text
    
    # Verify confirmation state is cleared
    state_after = session_manager.get_or_create_session(session_id, user_id)
    assert state_after.awaiting_confirmation is False
    assert state_after.pending_action is None

def test_reject_reschedule_book(client):
    """
    Book appointment -> Reject slot -> Request another slot -> Book alternative slot.
    """
    session_id = "test_reject_reschedule"
    user_id = "patient_test_confirm"
    
    # 1. First turn: Propose booking slot
    res_1 = run_agent(session_id, user_id, "Schedule checkup with Dr. Adams")
    assert "would you like me to book it" in res_1.response_text.lower()
    
    # 2. Second turn: Reject slot and request another slot at 10 PM
    res_2 = run_agent(session_id, user_id, "No, I need 10 PM Monday")
    assert "10:00 PM" in res_2.response_text
    
    # Verify confirmation state is still active with the new time
    state = session_manager.get_or_create_session(session_id, user_id)
    assert state.awaiting_confirmation is True
    assert state.pending_entities["time_slot"] == "Monday at 10:00 PM"
    
    # 3. Third turn: Book alternative slot
    res_3 = run_agent(session_id, user_id, "book it")
    assert "booked for Monday at 10:00 PM" in res_3.response_text

def test_request_another_doctor(client):
    """
    Book appointment -> Another doctor -> Alternative found.
    """
    session_id = "test_another_doctor"
    user_id = "patient_test_confirm"
    
    # 1. First turn: Propose booking slot
    res_1 = run_agent(session_id, user_id, "Schedule checkup with Dr. Adams")
    assert "would you like me to book it" in res_1.response_text.lower()
    
    # 2. Second turn: Request another doctor
    res_2 = run_agent(session_id, user_id, "another doctor")
    assert "Dr. John Adams" in res_2.response_text
    
    # 3. Third turn: Confirm booking
    res_3 = run_agent(session_id, user_id, "sure")
    assert "booked for Monday at 09:00 AM" in res_3.response_text

def test_appointment_booking_cancel(client):
    """
    Book appointment -> Cancel.
    """
    session_id = "test_booking_cancel"
    user_id = "patient_test_confirm"
    
    # 1. First turn: Propose booking slot
    res_1 = run_agent(session_id, user_id, "Schedule checkup with Dr. Adams")
    assert "would you like me to book it" in res_1.response_text.lower()
    
    # 2. Second turn: Cancel
    res_2 = run_agent(session_id, user_id, "cancel")
    assert "not booked" in res_2.response_text

def test_appointment_booking_e2e_flow(client):
    """
    Book appointment -> reject slot -> request another time -> request another doctor -> confirm booking.
    """
    session_id = "test_booking_e2e"
    user_id = "patient_test_confirm"
    
    # 1. Propose checkup
    res_1 = run_agent(session_id, user_id, "Schedule checkup with Dr. Adams")
    assert "Dr. Evelyn Adams" in res_1.response_text
    assert "Monday at 09:00 AM" in res_1.response_text
    
    # 2. Reject and request another time (10 PM)
    res_2 = run_agent(session_id, user_id, "No, 10 PM instead")
    assert "Dr. Evelyn Adams" in res_2.response_text
    assert "Monday at 10:00 PM" in res_2.response_text
    
    # 3. Request another doctor
    res_3 = run_agent(session_id, user_id, "different doctor")
    assert "Dr. John Adams" in res_3.response_text
    assert "Monday at 10:00 PM" in res_3.response_text  # should carry over 10 PM
    
    # 4. Confirm booking
    res_4 = run_agent(session_id, user_id, "sounds good")
    assert "booked for Monday at 10:00 PM" in res_4.response_text
    assert "Dr. John Adams" in res_4.response_text


def test_reschedule_existing_appointment(client):
    """
    Verify rescheduling of an existing scheduled appointment.
    """
    import uuid
    from app.database import SessionLocal
    from app.models.user import User
    from app.models.patient import Patient
    from app.models.appointment import Appointment
    from datetime import datetime, timedelta

    user_uuid = uuid.UUID("12345678-1234-5678-1234-56781234567a")
    patient_uuid = uuid.UUID("87654321-4321-8765-4321-87654321098b")
    apt_uuid = uuid.UUID("11111111-2222-3333-4444-55555555555c")

    db = SessionLocal()
    try:
        # Create unique patient user
        user = User(
            id=user_uuid,
            email="reschedule_patient@example.com",
            password_hash="dummy_hash",
            full_name="Jane Reschedule",
            role="patient"
        )
        db.add(user)
        db.commit()

        patient = Patient(
            id=patient_uuid,
            user_id=user_uuid
        )
        db.add(patient)
        db.commit()

        # Create active appointment
        apt = Appointment(
            id=apt_uuid,
            patient_id=patient_uuid,
            doctor_name="Dr. Evelyn Adams",
            clinic_name="Metro Heart Institute",
            scheduled_time=datetime.now() + timedelta(days=2),
            status="scheduled"
        )
        db.add(apt)
        db.commit()
        
        session_id = "sess_reschedule"
        user_id = str(user_uuid)

        # 1. Ask to update appointment
        res_1 = run_agent(session_id, user_id, "Can I update my appointment?")
        assert "found your appointment" in res_1.response_text.lower()
        state_1 = session_manager.get_or_create_session(session_id, user_id)
        assert state_1.awaiting_confirmation is True
        assert state_1.pending_action == "modify_appointment"

        # 2. Tell the day (Tuesday) - only day collected, so should ask for time
        res_2 = run_agent(session_id, user_id, "Move it to Tuesday")
        assert "what date and time" in res_2.response_text.lower()
        state_2 = session_manager.get_or_create_session(session_id, user_id)
        assert state_2.awaiting_confirmation is False
        assert state_2.awaiting_new_datetime is True
        assert state_2.pending_action == "reschedule_appointment"

        # 3. Tell the time (12 PM) - both Tuesday and 12 PM now collected
        res_3 = run_agent(session_id, user_id, "No, 12 PM instead")
        assert "12:00 pm" in res_3.response_text.lower()
        assert "confirm the change" in res_3.response_text.lower()
        state_3 = session_manager.get_or_create_session(session_id, user_id)
        assert state_3.awaiting_confirmation is True
        assert state_3.awaiting_new_datetime is False
        assert state_3.pending_action == "reschedule_appointment"
        assert len(res_3.suggested_actions) > 0
        assert res_3.suggested_actions[0].tool_name == "check_calendar_availability"

        # 4. Confirm reschedule
        res_4 = run_agent(session_id, user_id, "Book it")
        assert "rescheduled to" in res_4.response_text.lower()
        state_4 = session_manager.get_or_create_session(session_id, user_id)
        assert state_4.awaiting_confirmation is False
        assert state_4.pending_action is None
        assert len(res_4.suggested_actions) > 0
        assert res_4.suggested_actions[0].tool_name == "update_calendar_event"

        # Verify database is updated
        db.refresh(apt)
        assert apt.scheduled_time.hour == 12
        assert apt.scheduled_time.minute == 0
        
        # Verify ID is preserved and no extra appointments were created
        active_apts = db.query(Appointment).filter(Appointment.patient_id == patient_uuid).all()
        assert len(active_apts) == 1
        assert active_apts[0].id == apt_uuid
    finally:
        # Clean up database records
        db.query(Appointment).filter(Appointment.id == apt_uuid).delete()
        db.query(Patient).filter(Patient.id == patient_uuid).delete()
        db.query(User).filter(User.id == user_uuid).delete()
        db.commit()
        db.close()

def test_uploaded_medical_report_summarization_and_qa(client):
    """
    Test PDF upload pipeline, report routing, Gemini summarization format,
    retrieval, and RAG follow-up Q&A.
    """
    import io
    import uuid
    from app.database import SessionLocal
    from app.models.user import User
    from app.models.patient import Patient
    from app.models.report import UploadedReport
    
    db = SessionLocal()
    user_uuid = uuid.UUID("22222222-3333-4444-5555-66666666666a")
    patient_uuid = uuid.UUID("77777777-8888-9999-0000-11111111111b")
    
    try:
        # 1. Create patient user in DB
        user = User(
            id=user_uuid,
            email="madhusmita_patient@example.com",
            password_hash="dummy_hash",
            full_name="Madhusmita Sen",
            role="patient"
        )
        db.add(user)
        db.commit()

        patient = Patient(
            id=patient_uuid,
            user_id=user_uuid
        )
        db.add(patient)
        db.commit()

        # 2. Upload file through the client upload endpoint
        # Simulate PDF content
        pdf_content = (
            "PATIENT LAB RESULTS\n"
            "Patient Name: Madhusmita Sen\n"
            "Date: 2026-06-24\n\n"
            "METABOLIC PANEL:\n"
            "Fasting Glucose: 95 mg/dL (Reference: 70-100 mg/dL) - Normal\n"
            "LDL Cholesterol Level: 145 mg/dL (Reference: <100 mg/dL) - Elevated\n"
            "HDL Cholesterol: 50 mg/dL (Reference: >40 mg/dL) - Normal\n\n"
            "RECOMMENDATIONS:\n"
            "1. Focus on a low-cholesterol diet with plenty of soluble fiber.\n"
            "2. Retest lipid profile in 3 months."
        )
        
        # Call the endpoint
        response = client.post(
            "/api/v1/reports/upload",
            files={"file": ("madhusmita_report.pdf", io.BytesIO(pdf_content.encode("utf-8")), "application/pdf")}
        )
        assert response.status_code == 201
        res_data = response.json()
        assert res_data["filename"] == "madhusmita_report.pdf"
        assert "id" in res_data
        assert res_data["extractedText"] is not None
        assert len(res_data["chunks"]) > 0
        
        # Verify saved in SQLite database
        db_report = db.query(UploadedReport).filter(UploadedReport.filename == "madhusmita_report.pdf").first()
        assert db_report is not None
        assert db_report.extracted_text == res_data["extractedText"]
        
        session_id = "sess_report_summarization"
        user_id = str(user_uuid)
        
        # 3. Summarize the report
        res_summary = run_agent(session_id, user_id, "Summarize document madhusmita_report.pdf")
        
        # The assistant's response should contain the summarization format headings:
        # Summary, Key findings, Abnormal values, Recommendations, Citations
        assert "summary" in res_summary.response_text.lower()
        assert "key findings" in res_summary.response_text.lower()
        assert "abnormal values" in res_summary.response_text.lower()
        assert "recommendations" in res_summary.response_text.lower()
        assert "citations" in res_summary.response_text.lower()
        
        # Verify it specifically mentions madhusmita_report.pdf in citations or text
        assert "madhusmita_report.pdf" in res_summary.response_text.lower()

        # 4. Ask follow-up question: "What was my cholesterol level?"
        res_qa = run_agent(session_id, user_id, "What was my cholesterol level?")
        
        # Should answer from the uploaded document (which has "145 mg/dL" or "LDL Cholesterol Level: 145 mg/dL")
        assert "145" in res_qa.response_text
        assert "cholesterol" in res_qa.response_text.lower()
        
    finally:
        # Clean up database records
        db.query(UploadedReport).filter(UploadedReport.patient_id == patient_uuid).delete()
        db.query(Patient).filter(Patient.id == patient_uuid).delete()
        db.query(User).filter(User.id == user_uuid).delete()
        db.commit()
        db.close()

def test_uploaded_medical_report_citations_isolation(client):
    """
    Verify report isolation, global search fallback, and low-confidence fallback for reports.
    """
    import io
    import uuid
    from app.database import SessionLocal
    from app.models.user import User
    from app.models.patient import Patient
    from app.models.report import UploadedReport
    
    db = SessionLocal()
    user_uuid = uuid.UUID("33333333-4444-5555-6666-77777777777a")
    patient_uuid = uuid.UUID("88888888-9999-0000-1111-22222222222b")
    
    try:
        # 1. Create patient user in DB
        user = User(
            id=user_uuid,
            email="isolation_patient@example.com",
            password_hash="dummy_hash",
            full_name="Isolation Patient",
            role="patient"
        )
        db.add(user)
        db.commit()

        patient = Patient(
            id=patient_uuid,
            user_id=user_uuid
        )
        db.add(patient)
        db.commit()

        # 2. Upload madhusmita_report.pdf
        pdf_content_1 = (
            "PATIENT LAB RESULTS\n"
            "Patient Name: Madhusmita Sen\n"
            "LDL Cholesterol Level: 145 mg/dL\n"
        )
        res_1 = client.post(
            "/api/v1/reports/upload",
            files={"file": ("madhusmita_report.pdf", io.BytesIO(pdf_content_1.encode("utf-8")), "application/pdf")}
        )
        assert res_1.status_code == 201
        
        # 3. Upload metabolic_panel_june.pdf
        pdf_content_2 = (
            "METABOLIC LAB PROFILE REPORT\n"
            "Patient Name: John Doe\n"
            "LDL Cholesterol Level: 180 mg/dL\n"
        )
        res_2 = client.post(
            "/api/v1/reports/upload",
            files={"file": ("metabolic_panel_june.pdf", io.BytesIO(pdf_content_2.encode("utf-8")), "application/pdf")}
        )
        assert res_2.status_code == 201

        session_id = "sess_rag_isolation"
        user_id = str(user_uuid)
        
        # 4. Summarize document madhusmita_report.pdf
        res_summary = run_agent(session_id, user_id, "Summarize document madhusmita_report.pdf")
        
        # Assert citations only refer to madhusmita_report.pdf
        assert "madhusmita_report.pdf" in res_summary.response_text
        assert "metabolic_panel_june.pdf" not in res_summary.response_text
        
        # 5. What was my cholesterol level? (global search across patient reports)
        res_qa = run_agent(session_id, user_id, "What was my cholesterol level?")
        # Since it is global, it can return references to the latest report (metabolic_panel_june.pdf)
        assert "metabolic_panel_june.pdf" in res_qa.response_text
        
        # 6. Summarize document non_existent_report.pdf
        res_non_existent = run_agent(session_id, user_id, "Summarize document non_existent_report.pdf")
        assert "No information found in non_existent_report.pdf" in res_non_existent.response_text

    finally:
        # Clean up database records
        db.query(UploadedReport).filter(UploadedReport.patient_id == patient_uuid).delete()
        db.query(Patient).filter(Patient.id == patient_uuid).delete()
        db.query(User).filter(User.id == user_uuid).delete()
        db.commit()
        db.close()
