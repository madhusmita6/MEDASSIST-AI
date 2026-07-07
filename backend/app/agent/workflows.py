from typing import Dict, Any, List, Optional
from app.agent.state import AgentState
from app.agent.models import AgentResponse, AgentAction
from app.agent.tools import (
    check_calendar_availability,
    book_calendar_event,
    search_nearby_clinics,
    send_caregiver_alert_email,
    retrieve_medical_report_chunks
)
from app.logging import logger
from app.services.llm_service import llm_service
from datetime import datetime
import json

class ConversationContinuationNode:
    """Interprets short replies as continuation of the active workflow or resets it on explicit topic change."""
    def process(self, state: AgentState) -> None:
        if not state.conversation_history:
            return
        last_msg = state.conversation_history[-1].content.lower().strip()
        
        if state.conversation_mode == "appointment_booking":
            # Check for explicit topic change to other skills
            emergency_flags = ["chest pain", "difficulty breathing", "severe bleeding", "unconscious", "stroke"]
            reminder_flags = ["reminder", "medicine", "pill", "dose", "log", "take", "medication"]
            report_flags = ["report", "summary", "blood", "pdf", "results", "test"]
            caregiver_flags = ["caregiver", "notifier", "alert", "notify", "link"]
            
            is_emergency = any(flag in last_msg for flag in emergency_flags) or ("breathing" in last_msg and "difficult" in last_msg)
            is_reminder = any(flag in last_msg for flag in reminder_flags)
            is_report = any(flag in last_msg for flag in report_flags)
            is_caregiver = any(flag in last_msg for flag in caregiver_flags)
            
            if is_emergency or is_reminder or is_report or is_caregiver:
                # Explicit topic change: reset conversation mode
                state.conversation_mode = "none"
                state.awaiting_confirmation = False
                state.pending_action = None
                state.pending_entities = None
                state.confirmation_prompt = None
                return
            
            # Short replies or continuation keywords
            confirmations = ["yes", "sure", "okay", "proceed", "book it", "sounds good", "y"]
            rejections_and_modifiers = [
                "no", "not now", "different time", "another doctor", "next tuesday instead", "cancel", "n",
                "instead", "pm", "am", "at", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
                "dr.", "doctor", "physician", "different"
            ]
            
            is_continuation = (
                any(c in last_msg for c in confirmations) or
                any(r in last_msg for r in rejections_and_modifiers) or
                len(last_msg.split()) <= 4  # short reply
            )
            
            if is_continuation:
                state.active_skill = "appointment_booking"
                state.next_step = "execute_appointment_booking"

class RoutingNode:
    """Triage incoming patient query and switch execution node pathways."""
    def process(self, state: AgentState) -> None:
        last_msg = state.conversation_history[-1].content.lower().strip()
        state.log_audit("ROUTING_INTENT", {"input": last_msg})
        
        # Conversational Continuation: Check multi-turn confirmation workflows
        if state.awaiting_confirmation:
            confirmations = ["yes", "yes please", "confirm", "book it", "proceed", "okay", "y"]
            cancellations = ["no", "cancel", "not now", "n"]
            
            if any(c == last_msg for c in confirmations):
                if state.pending_action in ["appointment_booking", "reschedule_appointment", "modify_appointment"]:
                    state.active_skill = "appointment_booking"
                    state.next_step = "execute_appointment_booking"
                    state.appointment_context["confirmed"] = True
                else:
                    state.active_skill = state.pending_action
                    state.next_step = f"execute_{state.pending_action}"
                state.log_audit("CONFIRMATION_RECEIVED", {"action": state.pending_action})
                return
            elif any(c == last_msg for c in cancellations):
                if state.pending_action in ["appointment_booking", "reschedule_appointment", "modify_appointment"]:
                    state.active_skill = "appointment_booking"
                    state.next_step = "execute_appointment_booking"
                    state.appointment_context["cancelled"] = True
                else:
                    state.active_skill = state.pending_action
                    state.next_step = f"execute_{state.pending_action}"
                state.log_audit("CONFIRMATION_CANCELLED", {"action": state.pending_action})
                return
            else:
                # Unrelated query: reset confirmation context and flow to normal classifiers
                state.awaiting_confirmation = False
                state.pending_action = None
                state.pending_entities = None
                state.confirmation_prompt = None

        # Report Summarization keyword override
        report_routing_keywords = ["summarize", "report", "pdf", "document", "uploaded file"]
        if any(kw in last_msg for kw in report_routing_keywords):
            state.active_skill = "report_summarizer"
            state.conversation_mode = "report_summary"
            state.next_step = "execute_report_summarizer"
            return

        # Continuation check for report_summary
        if state.conversation_mode == "report_summary":
            topic_change = False
            other_flags = [
                "chest pain", "difficulty breathing", "severe bleeding", "unconscious", "stroke",
                "reminder", "medicine", "pill", "dose", "log", "take", "medication",
                "appointment", "booking", "schedule", "reschedule", "doctor", "physician", "clinic",
                "caregiver", "notifier", "alert", "notify", "link"
            ]
            if any(flag in last_msg for flag in other_flags):
                topic_change = True
            
            if not topic_change:
                state.active_skill = "report_summarizer"
                state.conversation_mode = "report_summary"
                state.next_step = "execute_report_summarizer"
                return

        # Call LLM or mock classifier
        intent = llm_service.classify_intent(last_msg)
        
        # Override for emergency safety if keywords are present (guardrail)
        emergency_flags = ["chest pain", "difficulty breathing", "severe bleeding", "unconscious", "stroke"]
        is_emergency = any(flag in last_msg for flag in emergency_flags) or ("breathing" in last_msg and "difficult" in last_msg)
        if is_emergency or intent == "emergency_guidance":
            state.active_skill = "emergency_guidance"
            state.conversation_mode = "emergency_guidance"
            state.next_step = "execute_emergency_guidance"
            state.emergency_context["critical_symptom"] = next((f for f in emergency_flags if f in last_msg), "breathing difficulty")
            state.log_audit("EMERGENCY_DETECTED", {"symptom": state.emergency_context["critical_symptom"]})
            return

        if intent == "appointment_booking":
            state.active_skill = "appointment_booking"
            state.conversation_mode = "appointment_booking"
            state.next_step = "execute_appointment_booking"
            return

        if intent == "medication_reminder":
            state.active_skill = "medication_reminder"
            state.conversation_mode = "medication_reminder"
            state.next_step = "execute_medication_reminder"
            return

        if intent in ["report_summarizer", "report_summary"]:
            state.active_skill = "report_summarizer"
            state.conversation_mode = "report_summary"
            state.next_step = "execute_report_summarizer"
            return

        if intent == "caregiver_notifier":
            state.active_skill = "caregiver_notifier"
            state.conversation_mode = "none"
            state.next_step = "execute_caregiver_notifier"
            return

        state.active_skill = "general_chat"
        state.conversation_mode = "none"
        state.next_step = "execute_general_chat"


class ToolExecutionNode:
    """Executes target skills and binds mock tool payload mappings."""
    def process(self, state: AgentState) -> List[AgentAction]:
        suggested_actions = []
        last_msg = state.conversation_history[-1].content.lower()
        
        if state.active_skill == "emergency_guidance":
            symptom = state.emergency_context.get("critical_symptom", "unknown")
            state.log_audit("EXECUTING_TOOL_SOS", {"symptom": symptom})
            
            suggested_actions.append(AgentAction(
                tool_name="search_nearby_clinics",
                arguments={"latitude": 37.7749, "longitude": -122.4194, "radius_miles": 5}
            ))
            suggested_actions.append(AgentAction(
                tool_name="send_caregiver_alert_email",
                arguments={
                    "caregiver_email": "primary_caregiver@example.com",
                    "subject": "EMERGENCY ALERT: MedAssist Patient SOS",
                    "message_body": f"The patient reports severe symptoms matching: {symptom}."
                }
            ))
            
        elif state.active_skill == "appointment_booking":
            DOCTORS_REGISTRY = [
                {"name": "Dr. Evelyn Adams", "specialty": "Cardiology", "clinic": "Metro Heart Institute"},
                {"name": "Dr. John Adams", "specialty": "Cardiology", "clinic": "Metro Heart Institute"},
                {"name": "Dr. Michael Chang", "specialty": "Generalist", "clinic": "City Health Center"},
                {"name": "Dr. Jane Chang", "specialty": "Generalist", "clinic": "City Health Center"},
                {"name": "Dr. Sarah Johnson", "specialty": "Neurology", "clinic": "Neuroscience Center"},
                {"name": "Dr. Robert Johnson", "specialty": "Neurology", "clinic": "Neuroscience Center"},
            ]
            
            def find_alternative_doctor(current_name: str) -> Dict[str, str]:
                current_spec = "Cardiology"
                curr_clean = current_name.lower().replace("dr.", "").strip()
                for doc in DOCTORS_REGISTRY:
                    doc_clean = doc["name"].lower().replace("dr.", "").strip()
                    if doc_clean in curr_clean or curr_clean in doc_clean:
                        current_spec = doc["specialty"]
                        break
                for doc in DOCTORS_REGISTRY:
                    doc_clean = doc["name"].lower().replace("dr.", "").strip()
                    if doc["specialty"] == current_spec and doc_clean != curr_clean:
                        return doc
                for doc in DOCTORS_REGISTRY:
                    doc_clean = doc["name"].lower().replace("dr.", "").strip()
                    if doc_clean != curr_clean:
                        return doc
                return DOCTORS_REGISTRY[0]

            if state.appointment_context.get("confirmed"):
                # Confirm booking slot directly
                pe = state.pending_entities or {}
                doctor_name = pe.get("doctor_name", "Dr. Evelyn Adams")
                time_slot = pe.get("time_slot", "Monday at 09:00 AM")
                
                suggested_actions.append(AgentAction(
                    tool_name="book_calendar_event",
                    arguments={
                        "doctor_name": doctor_name,
                        "time_slot": time_slot,
                        "patient_email": "patient@example.com"
                    }
                ))
                state.appointment_context["doctor_name"] = doctor_name
                state.appointment_context["time_slot"] = time_slot
                
                # Clear state
                state.awaiting_confirmation = False
                state.pending_action = None
                state.pending_entities = None
                state.confirmation_prompt = None
                state.last_agent_question = None
            elif state.appointment_context.get("cancelled"):
                # Clear state
                state.awaiting_confirmation = False
                state.pending_action = None
                state.pending_entities = None
                state.confirmation_prompt = None
                state.last_agent_question = None
            elif (state.awaiting_confirmation or state.awaiting_new_datetime) and state.pending_action in ["appointment_booking", "reschedule_appointment", "modify_appointment"]:
                # Subsequent turn processing
                confirmations = ["yes", "sure", "okay", "proceed", "book it", "sounds good", "y"]
                cancellations = ["no", "not now", "cancel", "n"]
                
                has_time_change = any(t in last_msg for t in ["pm", "am", "at", "o'clock", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "next"])
                has_doctor_change = any(d in last_msg for d in ["another doctor", "different doctor", "other doctor", "different physician", "change doctor"])
                
                is_confirm = any(c == last_msg or last_msg.startswith(c + " ") or last_msg.endswith(" " + c) for c in confirmations)
                is_cancel = any(c == last_msg or last_msg.startswith(c + " ") or last_msg.endswith(" " + c) for c in cancellations)
                
                if is_confirm and not (has_time_change or has_doctor_change):
                    if state.pending_action == "reschedule_appointment":
                        # Reschedule confirmation flow
                        pe = state.pending_entities or {}
                        date_val = pe.get("date") or "Monday"
                        time_val = pe.get("time") or "09:00 AM"
                        
                        import re
                        from datetime import datetime, timedelta
                        d = datetime.now()
                        day_num = d.weekday()
                        days_until_monday = (7 - day_num) % 7
                        if days_until_monday == 0:
                            days_until_monday = 7
                        next_monday = d + timedelta(days=days_until_monday)
                        
                        parsed_day = next_monday
                        target_day_str = date_val.lower()
                        if "tuesday" in target_day_str:
                            diff = (1 - day_num) % 7
                            if diff <= 0: diff += 7
                            parsed_day = d + timedelta(days=diff)
                        elif "wednesday" in target_day_str:
                            diff = (2 - day_num) % 7
                            if diff <= 0: diff += 7
                            parsed_day = d + timedelta(days=diff)
                        elif "thursday" in target_day_str:
                            diff = (3 - day_num) % 7
                            if diff <= 0: diff += 7
                            parsed_day = d + timedelta(days=diff)
                        elif "friday" in target_day_str:
                            diff = (4 - day_num) % 7
                            if diff <= 0: diff += 7
                            parsed_day = d + timedelta(days=diff)
                        
                        hour = 9
                        minute = 0
                        match_t = re.search(r'(\d{1,2}):(\d{2})\s*(am|pm)', time_val, re.IGNORECASE)
                        if match_t:
                            hour = int(match_t.group(1))
                            minute = int(match_t.group(2))
                            ampm = match_t.group(3).lower()
                            if ampm == "pm" and hour < 12: hour += 12
                            if ampm == "am" and hour == 12: hour = 0
                        
                        scheduledTime = parsed_day.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat()
                        
                        suggested_actions.append(AgentAction(
                            tool_name="update_calendar_event",
                            arguments={
                                "appointment_id": state.selected_appointment_id,
                                "new_date_time": scheduledTime
                            }
                        ))
                        
                        from app.database import SessionLocal
                        from app.models.appointment import Appointment
                        db = SessionLocal()
                        try:
                            import uuid as py_uuid
                            if isinstance(state.selected_appointment_id, py_uuid.UUID):
                                db_apt_id = state.selected_appointment_id
                            else:
                                db_apt_id = py_uuid.UUID(str(state.selected_appointment_id))
                            apt = db.query(Appointment).filter(Appointment.id == db_apt_id).first()
                            if apt:
                                apt.scheduled_time = datetime.fromisoformat(scheduledTime)
                                db.commit()
                        except Exception as e:
                            logger.error(f"Failed to update appointment: {e}")
                        finally:
                            db.close()
                        
                        state.confirmation_prompt = f"Your appointment has been rescheduled to {date_val} at {time_val}."
                        state.awaiting_confirmation = False
                        state.awaiting_new_datetime = False
                        state.pending_action = None
                        state.pending_entities = None
                        state.selected_appointment_id = None
                        state.conversation_mode = "none"
                    else:
                        state.appointment_context["confirmed"] = True
                        pe = state.pending_entities or {}
                        doctor_name = pe.get("doctor_name", "Dr. Evelyn Adams")
                        time_slot = pe.get("time_slot", "Monday at 09:00 AM")
                        suggested_actions.append(AgentAction(
                            tool_name="book_calendar_event",
                            arguments={
                                "doctor_name": doctor_name,
                                "time_slot": time_slot,
                                "patient_email": "patient@example.com"
                            }
                        ))
                        state.appointment_context["doctor_name"] = doctor_name
                        state.appointment_context["time_slot"] = time_slot
                        state.awaiting_confirmation = False
                        state.pending_action = None
                        state.pending_entities = None
                        state.confirmation_prompt = None
                        state.last_agent_question = None
                elif is_cancel and not (has_time_change or has_doctor_change):
                    state.appointment_context["cancelled"] = True
                    state.awaiting_confirmation = False
                    state.awaiting_new_datetime = False
                    state.pending_action = None
                    state.pending_entities = None
                    state.confirmation_prompt = None
                    state.last_agent_question = None
                    state.selected_appointment_id = None
                    state.conversation_mode = "none"
                else:
                    pe = state.pending_entities or {
                        "doctor_name": "Dr. Evelyn Adams",
                        "clinic_name": "Metro Heart Institute",
                        "time_slot": "Monday at 09:00 AM"
                    }
                    
                    is_reschedule = state.pending_action in ["reschedule_appointment", "modify_appointment"]
                    
                    # Parse day and time from last_msg
                    day = pe.get("date")
                    if "monday" in last_msg: day = "Monday"
                    elif "tuesday" in last_msg: day = "Tuesday"
                    elif "wednesday" in last_msg: day = "Wednesday"
                    elif "thursday" in last_msg: day = "Thursday"
                    elif "friday" in last_msg: day = "Friday"
                    elif "saturday" in last_msg: day = "Saturday"
                    elif "sunday" in last_msg: day = "Sunday"
                    
                    time_val = pe.get("time")
                    if "12 pm" in last_msg or "12:00 pm" in last_msg: time_val = "12:00 PM"
                    elif "10 pm" in last_msg or "10:00 pm" in last_msg: time_val = "10:00 PM"
                    elif "10 am" in last_msg or "10:00 am" in last_msg: time_val = "10:00 AM"
                    elif "11 am" in last_msg or "11:00 am" in last_msg: time_val = "11:00 AM"
                    elif "9 am" in last_msg or "09:00 am" in last_msg or "9:00 am" in last_msg: time_val = "09:00 AM"
                    else:
                        import re
                        match = re.search(r'\d{1,2}:\d{2}\s*(?:am|pm)', last_msg, re.IGNORECASE)
                        if match:
                            time_val = match.group(0).upper()
                    
                    if is_reschedule:
                        if day: pe["date"] = day
                        if time_val: pe["time"] = time_val
                        
                        if day and time_val:
                            time_slot = f"{day} at {time_val}"
                            pe["time_slot"] = time_slot
                            state.awaiting_confirmation = True
                            state.awaiting_new_datetime = False
                            state.pending_action = "reschedule_appointment"
                            state.confirmation_prompt = f"I see an open slot on {time_slot}. Would you like me to confirm the change?"
                            suggested_actions.append(AgentAction(
                                tool_name="check_calendar_availability",
                                arguments={"doctor_name": pe.get("doctor_name", "Dr. Evelyn Adams"), "preferred_date": time_slot}
                            ))
                        else:
                            state.awaiting_confirmation = False
                            state.awaiting_new_datetime = True
                            state.pending_action = "reschedule_appointment"
                            state.confirmation_prompt = "What date and time would you like to move your appointment to?"
                        
                        state.pending_entities = pe
                        state.last_agent_question = state.confirmation_prompt
                    else:
                        if not llm_service.is_mock_mode:
                            # Call real Gemini to update the entities in context
                            prompt = (
                                f"You are a medical assistant helping to reschedule or adjust an appointment booking.\n"
                                f"Current Pending Appointment details: {json.dumps(pe)}\n"
                                f"User message: '{last_msg}'\n"
                                f"Update the appointment details based on the user request. Keep existing details if not changed.\n"
                                f"Output ONLY a valid JSON object with keys: doctor_name, clinic_name, time_slot. Do not write markdown code fences."
                            )
                            try:
                                res = llm_service.generate_completion(prompt)
                                res = res.replace("```json", "").replace("```", "").strip()
                                updated = json.loads(res)
                                pe.update(updated)
                            except Exception as e:
                                logger.error(f"Failed to update entities via LLM: {e}")
                        
                        if has_time_change:
                            day_name = "Monday"
                            if "tuesday" in last_msg:
                                day_name = "Tuesday"
                            elif "wednesday" in last_msg:
                                day_name = "Wednesday"
                            elif "thursday" in last_msg:
                                day_name = "Thursday"
                            elif "friday" in last_msg:
                                day_name = "Friday"
                            else:
                                prev_slot = pe.get("time_slot", "").lower()
                                if "tuesday" in prev_slot:
                                    day_name = "Tuesday"
                                elif "wednesday" in prev_slot:
                                    day_name = "Wednesday"
                                elif "thursday" in prev_slot:
                                    day_name = "Thursday"
                                elif "friday" in prev_slot:
                                    day_name = "Friday"
                            
                            t_val = "09:00 AM"
                            if "10 pm" in last_msg or "10:00 pm" in last_msg:
                                t_val = "10:00 PM"
                            elif "10 am" in last_msg or "10:00 am" in last_msg:
                                t_val = "10:00 AM"
                            elif "11 am" in last_msg or "11:00 am" in last_msg:
                                t_val = "11:00 AM"
                            elif "9 am" in last_msg or "09:00 am" in last_msg or "9:00 am" in last_msg:
                                t_val = "09:00 AM"
                            else:
                                import re
                                prev_slot = pe.get("time_slot", "")
                                match = re.search(r'\d{2}:\d{2}\s*(?:AM|PM)', prev_slot, re.IGNORECASE)
                                if match:
                                    t_val = match.group(0).upper()
                                elif "11 am" in prev_slot.lower():
                                    t_val = "11:00 AM"
                                elif "10 pm" in prev_slot.lower():
                                    t_val = "10:00 PM"
                                elif "10 am" in prev_slot.lower():
                                    t_val = "10:00 AM"
                                    
                            pe["time_slot"] = f"{day_name} at {t_val}"
                            state.awaiting_confirmation = True
                            state.pending_entities = pe
                            
                        if has_doctor_change:
                            current_doc = pe.get("doctor_name", "Dr. Evelyn Adams")
                            alt_doc = find_alternative_doctor(current_doc)
                            pe["doctor_name"] = alt_doc["name"]
                            pe["clinic_name"] = alt_doc["clinic"]
                            state.awaiting_confirmation = True
                            state.pending_entities = pe
                        
                        doctor_name = pe["doctor_name"]
                        time_slot = pe["time_slot"]
                        state.confirmation_prompt = f"I see an open slot with {doctor_name} on {time_slot}. Would you like me to book it?"
                        state.last_agent_question = state.confirmation_prompt
                        suggested_actions.append(AgentAction(
                            tool_name="check_calendar_availability",
                            arguments={"doctor_name": doctor_name, "preferred_date": time_slot}
                        ))
            else:
                # Check if this is a modification/reschedule request for an existing appointment
                has_mod_keyword = any(kw in last_msg for kw in ["update", "modify", "change", "reschedule"])
                if has_mod_keyword:
                    from app.database import SessionLocal
                    from app.models.appointment import Appointment
                    from app.models.patient import Patient
                    import uuid as py_uuid
                    
                    db = SessionLocal()
                    try:
                        user_id_str = str(state.user_id)
                        try:
                            db_user_id = py_uuid.UUID(user_id_str)
                        except ValueError:
                            db_user_id = py_uuid.uuid5(py_uuid.NAMESPACE_DNS, user_id_str)
                        patient = db.query(Patient).filter(Patient.user_id == db_user_id).first()
                        active_apt = None
                        if patient:
                            active_apt = db.query(Appointment).filter(
                                Appointment.patient_id == patient.id,
                                Appointment.status == "scheduled"
                            ).first()
                            
                        if active_apt:
                            apt_date = active_apt.scheduled_time
                            weekday = apt_date.strftime("%A")
                            time_string = apt_date.strftime("%I:%M %p")
                            
                            state.confirmation_prompt = (
                                f"I found your appointment with {active_apt.doctor_name} on {weekday} at {time_string}.\n\n"
                                "What would you like to change?\n\n"
                                "• Date\n"
                                "• Time\n"
                                "• Doctor\n"
                                "• Cancel Appointment"
                            )
                            state.selected_appointment_id = str(active_apt.id)
                            state.awaiting_confirmation = True
                            state.pending_action = "modify_appointment"
                            state.pending_entities = {
                                "doctor_name": active_apt.doctor_name,
                                "clinic_name": active_apt.clinic_name,
                                "time_slot": f"{weekday} at {time_string}"
                            }
                            state.last_agent_question = state.confirmation_prompt
                            return suggested_actions
                    except Exception as e:
                        import traceback
                        logger.error(f"Error querying active appointments in fallback: {e}\n{traceback.format_exc()}")
                    finally:
                        db.close()

                import re
                
                # Check LLM extraction if in real mode
                extracted_doctor = None
                extracted_date = None
                if not llm_service.is_mock_mode:
                    try:
                        entities = llm_service.extract_entities(last_msg, "appointment_booking")
                        extracted_doctor = entities.get("doctor_name")
                        extracted_date = entities.get("date_time")
                    except Exception as e:
                        logger.error(f"Failed to extract entities via LLM: {e}")

                doctor_match = re.search(r'(?:dr\.|doctor)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)', last_msg, re.IGNORECASE)
                doctor_name = f"Dr. {doctor_match.group(1).strip().title()}" if doctor_match else (extracted_doctor or "Dr. Evelyn Adams")
                
                # Check registry for matches to get full name/clinic
                clinic_name = "Metro Heart Institute"
                doc_name_clean = doctor_name.lower().replace("dr.", "").strip()
                for doc in DOCTORS_REGISTRY:
                    clean_reg = doc["name"].lower().replace("dr.", "").strip()
                    if doc_name_clean in clean_reg or clean_reg in doc_name_clean:
                        doctor_name = doc["name"]
                        clinic_name = doc["clinic"]
                        break
                
                # Parse preferred date/time
                day = "Monday"
                if "tuesday" in last_msg:
                    day = "Tuesday"
                elif "wednesday" in last_msg:
                    day = "Wednesday"
                elif "thursday" in last_msg:
                    day = "Thursday"
                elif "friday" in last_msg:
                    day = "Friday"
                elif extracted_date:
                    try:
                        dt = datetime.fromisoformat(extracted_date.replace("Z", ""))
                        day = dt.strftime("%A")
                    except Exception:
                        pass

                time_val = "09:00 AM"
                if "10 pm" in last_msg or "10:00 pm" in last_msg:
                    time_val = "10:00 PM"
                elif "10 am" in last_msg or "10:00 am" in last_msg:
                    time_val = "10:00 AM"
                elif "11 am" in last_msg or "11:00 am" in last_msg:
                    time_val = "11:00 AM"
                elif "9 am" in last_msg or "09:00 am" in last_msg or "9:00 am" in last_msg:
                    time_val = "09:00 AM"
                elif extracted_date:
                    try:
                        dt = datetime.fromisoformat(extracted_date.replace("Z", ""))
                        time_val = dt.strftime("%I:%M %p")
                    except Exception:
                        pass

                time_slot = f"{day} at {time_val}"
                preferred_date = time_slot

                state.awaiting_confirmation = True
                state.pending_action = "appointment_booking"
                state.pending_entities = {
                    "doctor_name": doctor_name,
                    "clinic_name": clinic_name,
                    "time_slot": time_slot
                }
                state.confirmation_prompt = f"I see an open slot with {doctor_name} on {time_slot}. Would you like me to book it?"
                state.last_agent_question = state.confirmation_prompt
                suggested_actions.append(AgentAction(
                    tool_name="check_calendar_availability",
                    arguments={"doctor_name": doctor_name, "preferred_date": preferred_date}
                ))
                
        elif state.active_skill == "medication_reminder":
            if "delete" in last_msg or "remove" in last_msg:
                state.log_audit("EXECUTING_TOOL_DELETE_REMINDER")
                state.reminder_context["action"] = "delete"
            else:
                state.log_audit("EXECUTING_TOOL_CREATE_REMINDER")
                state.reminder_context["action"] = "create"
                
        elif state.active_skill == "report_summarizer":
            state.log_audit("EXECUTING_TOOL_QUERY_RAG")
            suggested_actions.append(AgentAction(
                tool_name="retrieve_medical_report_chunks",
                arguments={"patient_id": state.user_id, "query": last_msg}
            ))
            
        elif state.active_skill == "caregiver_notifier":
            state.log_audit("EXECUTING_TOOL_SEND_EMAIL")
            suggested_actions.append(AgentAction(
                tool_name="send_caregiver_alert_email",
                arguments={
                    "caregiver_email": "caregiver@example.com",
                    "subject": "MedAssist Status Update",
                    "message_body": "Status query from MedAssist client dashboard."
                }
            ))
            
        return suggested_actions


class ResponseGeneratorNode:
    """Formats patient response text while enforcing security safety layers."""
    
    CLINICAL_SKILLS = ["emergency_guidance", "medication_reminder", "report_summarizer"]
    
    def process(self, state: AgentState, actions: List[AgentAction]) -> str:
        last_msg = state.conversation_history[-1].content.lower()
        response_text = ""

        # Guardrails: Block diagnosis and medication prescriptions
        prescribe_keywords = ["prescribe", "give me a script", "write medicine", "antibiotic", "dosage for"]
        diagnose_keywords = ["diagnose me", "do i have cancer", "what disease", "is this chronic"]
        
        if any(kw in last_msg for kw in prescribe_keywords):
            state.log_audit("SECURITY_GUARDRAIL_PRESCRIBE_ATTEMPT")
            return (
                "Safety Alert: I cannot prescribe medications, adjust dosages, or issue prescription scripts. "
                "Please consult your licensed healthcare professional for medication directives."
            )
        if any(kw in last_msg for kw in diagnose_keywords):
            state.log_audit("SECURITY_GUARDRAIL_DIAGNOSE_ATTEMPT")
            return (
                "Safety Alert: I cannot analyze symptoms to provide medical diagnoses or identify diseases. "
                "Please consult a physician for diagnostic evaluations."
            )

        # Build skill-specific prompts
        if state.active_skill == "emergency_guidance":
            symptom = state.emergency_context.get("critical_symptom", "symptoms")
            response_text = (
                f"ALERT: Severe symptom ({symptom}) classified as CRITICAL. "
                "I am searching for nearby clinics and alerting your caregiver now.\n\n"
                "First Aid Advice:\n"
                "- Keep calm, sit down, and rest.\n"
                "- If you have breathing difficulty, sit upright. Do not lie flat.\n"
                "- Call 911 immediately if you are alone or feeling lightheaded."
            )
        elif state.active_skill == "appointment_booking":
            if state.appointment_context.get("confirmed"):
                doctor = state.appointment_context.get("doctor_name", "Dr. Evelyn Adams")
                time_slot = state.appointment_context.get("time_slot", "Monday at 09:00 AM")
                response_text = f"Your appointment with {doctor} has been booked for {time_slot}."
                state.appointment_context.clear()
                state.conversation_mode = "none"
            elif state.appointment_context.get("cancelled"):
                response_text = "No problem. The appointment was not booked."
                state.appointment_context.clear()
                state.conversation_mode = "none"
            else:
                response_text = state.confirmation_prompt or "I see an open slot on Monday at 09:00 AM. Would you like me to book it?"
        elif state.active_skill == "medication_reminder":
            action = state.reminder_context.get("action", "query")
            response_text = f"I am loading medication options (Action: {action}). Configuring database logs..."
        elif state.active_skill == "report_summarizer":
            from app.database import SessionLocal
            from app.models.report import UploadedReport
            from app.services.rag_service import rag_service
            
            db = SessionLocal()
            try:
                # Extract explicitly referenced filename (e.g. *.pdf) from query
                import re
                pdf_match = re.search(r'([\w\-_]+\.pdf)', last_msg, re.IGNORECASE)
                referenced_filename = pdf_match.group(1) if pdf_match else None
                
                matched_report = None
                is_low_confidence = False
                
                if referenced_filename:
                    # Perform direct database report lookup for that file
                    reports = db.query(UploadedReport).all()
                    for rep in reports:
                        if rep.filename.lower() == referenced_filename.lower():
                            matched_report = rep
                            break
                    if not matched_report:
                        is_low_confidence = True
                else:
                    # Fallback: get the latest report
                    matched_report = db.query(UploadedReport).order_by(UploadedReport.created_at.desc()).first()
                
                if referenced_filename and is_low_confidence:
                    response_text = f"No information found in {referenced_filename}"
                elif not matched_report:
                    response_text = "I couldn't find any uploaded medical reports to summarize. Please upload a PDF first."
                else:
                    filename = matched_report.filename
                    extracted_text = matched_report.extracted_text or ""
                    
                    # 2. Retrieve top chunks from ChromaDB (with filename filter if referenced)
                    citations = rag_service.retrieve_relevant_chunks(
                        patient_id=str(matched_report.patient_id),
                        query=last_msg,
                        limit=4,
                        filename_filter=referenced_filename
                    )
                    
                    # Check low confidence
                    if referenced_filename:
                        if not citations:
                            is_low_confidence = True
                        elif not rag_service.is_mock:
                            min_dist = min(c["distance"] for c in citations)
                            if min_dist > 0.8:
                                is_low_confidence = True
                                
                    if referenced_filename and is_low_confidence:
                        response_text = f"No information found in {referenced_filename}"
                    else:
                        top_chunks_text = "\n\n".join([c["text"] for c in citations])
                        
                        # Determine if it's a summary request or a follow-up question
                        is_summary_req = any(kw in last_msg for kw in ["summarize", "report", "pdf", "document", "uploaded file"])
                        
                        if is_summary_req:
                            # Summarization flow
                            if not llm_service.is_mock_mode:
                                prompt = (
                                    f"Summarize this medical report in patient friendly language. Highlight abnormal values, recommendations and follow-up actions.\n\n"
                                    f"Filename: {filename}\n\n"
                                    f"Extracted Text:\n{extracted_text}\n\n"
                                    f"Top Chunks:\n{top_chunks_text}\n\n"
                                    f"Please format your output strictly with the following headings:\n"
                                    f"### **Summary**\n[Summary content]\n\n"
                                    f"### **Key findings**\n[Key findings content]\n\n"
                                    f"### **Abnormal values**\n[Abnormal values content]\n\n"
                                    f"### **Recommendations**\n[Recommendations content]\n\n"
                                    f"### **Citations**\n[Citations content]"
                                )
                                response_text = llm_service.generate_completion(prompt)
                            else:
                                # Build smart mock summary
                                abnormal_lines = []
                                for line in extracted_text.split("\n"):
                                    if any(w in line.lower() for w in ["high", "low", "critical", "elevated", "abnormal"]):
                                        abnormal_lines.append(line.strip())
                                
                                abnormal_val_text = "\n".join([f"- {l}" for l in abnormal_lines]) if abnormal_lines else "None noted."
                                
                                response_text = (
                                    f"### **Summary**\n"
                                    f"This is a patient friendly summary of the medical report '{filename}'.\n\n"
                                    f"### **Key findings**\n"
                                    f"The document outlines recent laboratory evaluations.\n\n"
                                    f"### **Abnormal values**\n"
                                    f"{abnormal_val_text}\n\n"
                                    f"### **Recommendations**\n"
                                    f"Review any outside-reference values with your healthcare provider.\n\n"
                                    f"### **Citations**\n"
                                    f"Source document: {filename}."
                                )
                            
                            # Cache the summary
                            matched_report.summary_cached = response_text
                            db.commit()
                        else:
                            # Follow-up question flow
                            if not llm_service.is_mock_mode:
                                prompt = (
                                    f"You are a medical assistant. Answer the user's follow-up question using the medical report context provided.\n\n"
                                    f"Filename: {filename}\n\n"
                                    f"Medical Report Extracted Text:\n{extracted_text}\n\n"
                                    f"Relevant Chunks:\n{top_chunks_text}\n\n"
                                    f"Question: {last_msg}\n\n"
                                    f"Answer in patient friendly language. Be concise and precise."
                                )
                                response_text = llm_service.generate_completion(prompt)
                            else:
                                # Smart mock follow-up answers
                                answer = ""
                                if "cholesterol" in last_msg:
                                    for line in extracted_text.split("\n"):
                                        if "cholesterol" in line.lower():
                                            answer = f"According to the uploaded report, {line.strip()}."
                                            break
                                    if not answer:
                                        answer = "Your LDL cholesterol level is 145 mg/dL."
                                else:
                                    matched_lines = []
                                    for line in extracted_text.split("\n"):
                                        if any(word in line.lower() for word in last_msg.split() if len(word) > 3):
                                            matched_lines.append(line.strip())
                                    if matched_lines:
                                        answer = "Based on the report:\n" + "\n".join(f"- {l}" for l in matched_lines[:3])
                                    else:
                                        answer = "I couldn't find a specific answer in the document, but normal reference ranges apply."
                                response_text = answer
                        
                        # Programmatically overwrite or format the Citations section to ensure it conforms exactly
                        citation_lines = ["### **Citations**"]
                        for c in citations:
                            citation_lines.append(f"Source:\n{c['source']} (Chunk {c['chunk_index']})")
                        citations_block = "\n".join(citation_lines)
                        
                        if "### **Citations**" in response_text:
                            parts = response_text.split("### **Citations**")
                            response_text = parts[0] + citations_block
                        else:
                            response_text = response_text.strip() + "\n\n" + citations_block
            except Exception as e:
                logger.error(f"Error generating report response: {e}")
                response_text = f"An error occurred while processing the report: {str(e)}"
            finally:
                db.close()
        elif state.active_skill == "caregiver_notifier":
            response_text = "I am processing status update requests to your linked caregivers."
        else:
            response_text = "How can I help you coordinate your healthcare options today?"

        # Attach safety medical disclaimers for clinical pathways
        if state.active_skill in self.CLINICAL_SKILLS:
            response_text += (
                "\n\nDisclaimer: I am an AI healthcare assistant, not a doctor. "
                "For serious symptoms or medical decisions, please consult a healthcare professional or contact emergency services."
            )

        return response_text


class AgentWorkflow:
    def __init__(self):
        self.continuation = ConversationContinuationNode()
        self.router = RoutingNode()
        self.executor = ToolExecutionNode()
        self.generator = ResponseGeneratorNode()

    def process(self, state: AgentState) -> AgentResponse:
        logger.info(f"Executing workflow step: {state.next_step}")
        
        gemini_success = False
        
        if not llm_service.is_mock_mode:
            try:
                # Compile history as list of dicts: role, content
                history_logs = []
                for m in state.conversation_history[:-1]:
                    history_logs.append({
                        "role": "model" if m.role == "assistant" else "user",
                        "content": m.content
                    })
                
                # Call query_gemini_router
                gemini_res = llm_service.query_gemini_router(
                    message=state.conversation_history[-1].content,
                    state_dict={
                        "conversation_mode": state.conversation_mode,
                        "awaiting_confirmation": state.awaiting_confirmation,
                        "pending_action": state.pending_action,
                        "pending_entities": state.pending_entities,
                        "selected_appointment_id": state.selected_appointment_id,
                        "conversation_step": state.conversation_step,
                    },
                    history=history_logs
                )
                
                # Check guardrails
                raw_msg_lower = state.conversation_history[-1].content.lower()
                prescribe_keywords = ["prescribe", "give me a script", "write medicine", "antibiotic", "dosage for"]
                diagnose_keywords = ["diagnose me", "do i have cancer", "what disease", "is this chronic"]
                
                is_prescribe = any(kw in raw_msg_lower for kw in prescribe_keywords)
                is_diagnose = any(kw in raw_msg_lower for kw in diagnose_keywords)
                is_emergency = any(kw in raw_msg_lower for kw in ["chest pain", "difficulty breathing", "severe bleeding", "unconscious", "stroke"]) or ("breathing" in raw_msg_lower and "difficult" in raw_msg_lower)
                
                if is_prescribe:
                    gemini_res["intent"] = "general_question"
                    gemini_res["next_action"] = "none"
                elif is_diagnose:
                    gemini_res["intent"] = "general_question"
                    gemini_res["next_action"] = "none"
                elif is_emergency or gemini_res.get("next_action") == "emergency_escalation" or gemini_res.get("intent") == "emergency_guidance":
                    gemini_res["intent"] = "emergency_guidance"
                    gemini_res["next_action"] = "emergency_escalation"
                
                logger.info(f"Gemini Router parsed response: {gemini_res}")
                
                raw_msg_lower = state.conversation_history[-1].content.lower()
                report_routing_keywords = ["summarize", "report", "pdf", "document", "uploaded file"]
                if any(kw in raw_msg_lower for kw in report_routing_keywords):
                    gemini_res["intent"] = "report_summarizer"

                # Continuation check for report_summary
                if state.conversation_mode == "report_summary":
                    topic_change = False
                    other_flags = [
                        "chest pain", "difficulty breathing", "severe bleeding", "unconscious", "stroke",
                        "reminder", "medicine", "pill", "dose", "log", "take", "medication",
                        "appointment", "booking", "schedule", "reschedule", "doctor", "physician", "clinic",
                        "caregiver", "notifier", "alert", "notify", "link"
                    ]
                    if any(flag in raw_msg_lower for flag in other_flags):
                        topic_change = True
                    if not topic_change:
                        gemini_res["intent"] = "report_summarizer"

                intent = gemini_res.get("intent", "unknown")
                next_action = gemini_res.get("next_action", "none")
                is_continuation = gemini_res.get("is_continuation", False)
                updated_entities = gemini_res.get("updated_entities") or {}
                
                # Sync state parameters
                if intent == "appointment_booking":
                    state.conversation_mode = "appointment_booking"
                    state.active_skill = "appointment_booking"
                elif intent == "medication_reminder":
                    state.conversation_mode = "medication_reminder"
                    state.active_skill = "medication_reminder"
                elif intent in ["report_summarizer", "report_summary"]:
                    state.conversation_mode = "report_summary"
                    state.active_skill = "report_summarizer"
                elif intent == "emergency_guidance":
                    state.conversation_mode = "emergency_guidance"
                    state.active_skill = "emergency_guidance"
                else:
                    state.conversation_mode = "none"
                    state.active_skill = "general_chat"
                
                # Override action to prevent converting reschedule flow to create appointment
                if state.pending_action == "reschedule_appointment" and next_action == "create_appointment":
                    next_action = "reschedule_appointment"

                # Update state pending action and entities
                state.pending_action = next_action
                if not state.pending_entities:
                    state.pending_entities = {}
                state.pending_entities.update(updated_entities)

                # Special handling for reschedule_appointment
                if next_action == "reschedule_appointment":
                    confirmations = ["yes", "yes please", "confirm", "book it", "proceed", "okay", "y", "sure", "sounds good"]
                    is_confirm = any(c in raw_msg_lower for c in confirmations)
                    if not (state.awaiting_confirmation and is_confirm):
                        state.awaiting_confirmation = False
                        state.awaiting_new_datetime = True
                
                # Route step
                if state.active_skill == "appointment_booking":
                    state.next_step = "execute_appointment_booking"
                    
                    if next_action == "modify_appointment":
                        # Retrieve active appointments from DB
                        from app.database import SessionLocal
                        from app.models.appointment import Appointment
                        from app.models.patient import Patient
                        import uuid as py_uuid
                        
                        db = SessionLocal()
                        try:
                            user_id_str = str(state.user_id)
                            try:
                                db_user_id = py_uuid.UUID(user_id_str)
                            except ValueError:
                                db_user_id = py_uuid.uuid5(py_uuid.NAMESPACE_DNS, user_id_str)
                            patient = db.query(Patient).filter(Patient.user_id == db_user_id).first()
                            active_apt = None
                            if patient:
                                active_apt = db.query(Appointment).filter(
                                    Appointment.patient_id == patient.id,
                                    Appointment.status == "scheduled"
                                ).first()
                                
                            if active_apt:
                                apt_date = active_apt.scheduled_time
                                weekday = apt_date.strftime("%A")
                                time_string = apt_date.strftime("%I:%M %p")
                                
                                state.confirmation_prompt = (
                                    f"I found your appointment with {active_apt.doctor_name} on {weekday} at {time_string}.\n\n"
                                    "What would you like to change?\n\n"
                                    "• Date\n"
                                    "• Time\n"
                                    "• Doctor\n"
                                    "• Cancel Appointment"
                                )
                                state.selected_appointment_id = str(active_apt.id)
                                state.awaiting_confirmation = True
                                state.pending_action = "modify_appointment"
                                state.pending_entities = {
                                    "doctor_name": active_apt.doctor_name,
                                    "clinic_name": active_apt.clinic_name,
                                    "time_slot": f"{weekday} at {time_string}"
                                }
                                state.last_agent_question = state.confirmation_prompt
                            else:
                                state.confirmation_prompt = "I couldn't find any active scheduled appointments for you."
                                state.conversation_mode = "none"
                                state.awaiting_confirmation = False
                                state.pending_action = None
                        except Exception as e:
                            logger.error(f"Error querying active appointments: {e}")
                        finally:
                            db.close()
                            
                    elif next_action == "reschedule_appointment":
                        confirmations = ["yes", "yes please", "confirm", "book it", "proceed", "okay", "y", "sure", "sounds good"]
                        cancellations = ["no", "cancel", "not now", "n"]
                        is_confirm = any(c in raw_msg_lower for c in confirmations)
                        is_cancel = any(c in raw_msg_lower for c in cancellations)
                        
                        if state.awaiting_confirmation and (is_confirm or is_cancel):
                            if is_confirm:
                                date_val = state.pending_entities.get("date") or "Monday"
                                time_val = state.pending_entities.get("time") or "09:00 AM"
                                import re
                                from datetime import datetime, timedelta
                                d = datetime.now()
                                day_num = d.weekday()
                                days_until_monday = (7 - day_num) % 7
                                if days_until_monday == 0:
                                    days_until_monday = 7
                                next_monday = d + timedelta(days=days_until_monday)
                                
                                parsed_day = next_monday
                                target_day_str = date_val.lower()
                                if "tuesday" in target_day_str:
                                    diff = (1 - day_num) % 7
                                    if diff <= 0:
                                        diff += 7
                                    parsed_day = d + timedelta(days=diff)
                                elif "wednesday" in target_day_str:
                                    diff = (2 - day_num) % 7
                                    if diff <= 0:
                                        diff += 7
                                    parsed_day = d + timedelta(days=diff)
                                elif "thursday" in target_day_str:
                                    diff = (3 - day_num) % 7
                                    if diff <= 0:
                                        diff += 7
                                    parsed_day = d + timedelta(days=diff)
                                elif "friday" in target_day_str:
                                    diff = (4 - day_num) % 7
                                    if diff <= 0:
                                        diff += 7
                                    parsed_day = d + timedelta(days=diff)
                                
                                hour = 9
                                minute = 0
                                match_t = re.search(r'(\d{1,2}):(\d{2})\s*(am|pm)', time_val, re.IGNORECASE)
                                if match_t:
                                    hour = int(match_t.group(1))
                                    minute = int(match_t.group(2))
                                    ampm = match_t.group(3).lower()
                                    if ampm == "pm" and hour < 12:
                                        hour += 12
                                    if ampm == "am" and hour == 12:
                                        hour = 0
                                
                                scheduledTime = parsed_day.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat()
                                
                                suggested_actions.append(AgentAction(
                                    tool_name="update_calendar_event",
                                    arguments={
                                        "appointment_id": state.selected_appointment_id,
                                        "new_date_time": scheduledTime
                                    }
                                ))
                                
                                from app.database import SessionLocal
                                from app.models.appointment import Appointment
                                db = SessionLocal()
                                try:
                                    import uuid as py_uuid
                                    if isinstance(state.selected_appointment_id, py_uuid.UUID):
                                        db_apt_id = state.selected_appointment_id
                                    else:
                                        db_apt_id = py_uuid.UUID(str(state.selected_appointment_id))
                                    apt = db.query(Appointment).filter(Appointment.id == db_apt_id).first()
                                    if apt:
                                        apt.scheduled_time = datetime.fromisoformat(scheduledTime)
                                        db.commit()
                                except Exception as e:
                                    logger.error(f"Failed to update appointment: {e}")
                                finally:
                                    db.close()
                                
                                state.confirmation_prompt = f"Your appointment has been rescheduled to {date_val} at {time_val}."
                            else:
                                state.confirmation_prompt = "No problem. The appointment was not rescheduled."
                                
                            state.awaiting_confirmation = False
                            state.awaiting_new_datetime = False
                            state.pending_action = None
                            state.pending_entities = None
                            state.selected_appointment_id = None
                            state.conversation_mode = "none"
                        else:
                            date_val = state.pending_entities.get("date")
                            time_val = state.pending_entities.get("time")
                            
                            if date_val and time_val:
                                state.confirmation_prompt = f"I see an open slot on {date_val} at {time_val}. Would you like me to confirm the change?"
                                state.last_agent_question = state.confirmation_prompt
                                state.awaiting_new_datetime = False
                                state.awaiting_confirmation = True
                                
                                suggested_actions.append(AgentAction(
                                    tool_name="check_calendar_availability",
                                    arguments={
                                        "doctor_name": state.pending_entities.get("doctor_name") or "Dr. Evelyn Adams",
                                        "preferred_date": f"{date_val} at {time_val}"
                                    }
                                ))
                            else:
                                state.awaiting_confirmation = False
                                state.awaiting_new_datetime = True
                                state.confirmation_prompt = "What date and time would you like to move your appointment to?"
                                state.last_agent_question = state.confirmation_prompt
                                
                    elif next_action in ["check_calendar", "find_another_doctor"]:
                        # Extract doctor name
                        doctor_name = state.pending_entities.get("doctorName") or state.pending_entities.get("doctor_name") or "Dr. Evelyn Adams"
                        clinic_name = state.pending_entities.get("clinicName") or state.pending_entities.get("clinic_name") or "Metro Heart Institute"
                        
                        if next_action == "find_another_doctor":
                            # Swapping cardiology doctors
                            if "evelyn adams" in doctor_name.lower():
                                doctor_name = "Dr. John Adams"
                            else:
                                doctor_name = "Dr. Evelyn Adams"
                        
                        # Preferred date parsing
                        day = updated_entities.get("date") or "Monday"
                        day = day.capitalize()
                        time_val = updated_entities.get("time") or "09:00 AM"
                        time_slot = f"{day} at {time_val}"
                        
                        state.pending_entities["doctor_name"] = doctor_name
                        state.pending_entities["clinic_name"] = clinic_name
                        state.pending_entities["time_slot"] = time_slot
                        
                        is_reschedule = state.pending_action in ["reschedule_appointment", "modify_appointment"]
                        if is_reschedule:
                            state.confirmation_prompt = f"I see an open slot on {time_slot}. Would you like me to confirm the change?"
                            state.pending_action = "reschedule_appointment"
                        else:
                            state.confirmation_prompt = f"I see an open slot with {doctor_name} on {time_slot}. Would you like me to book it?"
                            state.pending_action = "appointment_booking"
                        state.last_agent_question = state.confirmation_prompt
                        state.awaiting_confirmation = True
                        
                    elif next_action == "create_appointment":
                        state.appointment_context["confirmed"] = True
                        
                    elif next_action == "cancel_appointment":
                        state.appointment_context["cancelled"] = True
                        
                    elif next_action == "none":
                        pass
                        
                elif state.active_skill == "medication_reminder":
                    state.next_step = "execute_medication_reminder"
                elif state.active_skill == "report_summarizer":
                    state.next_step = "execute_report_summarizer"
                elif state.active_skill == "emergency_guidance":
                    state.next_step = "execute_emergency_guidance"
                    state.emergency_context["critical_symptom"] = "emergency symptoms"
                else:
                    state.next_step = "execute_general_chat"
                
                gemini_success = True
            except Exception as router_err:
                logger.warning(f"Gemini orchestrator failed, falling back to rules: {router_err}")
                gemini_success = False
        
        if not gemini_success:
            # Continuation Triage Node
            self.continuation.process(state)
            
            # Node 1: Intent Routing
            if state.next_step == "route_intent":
                self.router.process(state)
            
        # Node 2: Tool Execution Mappings
        actions = self.executor.process(state)
        
        # Node 3: Security & Response formatting
        response_text = self.generator.process(state, actions)
        
        # Final transition state reset
        state.next_step = "route_intent"
        state.log_audit("WORKFLOW_COMPLETED", {"active_skill": state.active_skill})

        return AgentResponse(
            session_id=state.session_id,
            response_text=response_text,
            suggested_actions=actions,
            active_skill=state.active_skill,
            emergency_triggered=(state.active_skill == "emergency_guidance")
        )
