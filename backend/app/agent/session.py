from datetime import datetime, timezone
from typing import Optional
from app.agent.state import AgentState
from app.agent.models import ChatMessage
from app.database import SessionLocal
from app.models.session import AgentSession
from app.logging import logger

class SessionManager:
    """Manages session states with persistence to PostgreSQL AgentSession table."""
    
    def get_or_create_session(self, session_id: str, user_id: str) -> AgentState:
        db = SessionLocal()
        try:
            # Query the database for existing session state
            session_rec = db.query(AgentSession).filter(
                AgentSession.session_id == session_id
            ).first()

            if session_rec and session_rec.state_json:
                logger.info(f"Loaded persistent session state for: {session_id} from AgentSession table")
                state_dict = session_rec.state_json
                
                # Reconstruct AgentState from dictionary
                state = AgentState(session_id=session_id, user_id=user_id)
                state.active_skill = state_dict.get("active_skill")
                state.next_step = state_dict.get("next_step", "route_intent")
                state.awaiting_confirmation = state_dict.get("awaiting_confirmation", False)
                state.awaiting_new_datetime = state_dict.get("awaiting_new_datetime", False)
                state.pending_action = state_dict.get("pending_action")
                state.pending_entities = state_dict.get("pending_entities")
                state.confirmation_prompt = state_dict.get("confirmation_prompt")
                state.last_agent_question = state_dict.get("last_agent_question")
                state.selected_appointment_id = state_dict.get("selected_appointment_id")
                state.conversation_mode = state_dict.get("conversation_mode", "none")
                state.conversation_step = state_dict.get("conversation_step", 0)
                state.last_updated = state_dict.get("last_updated", datetime.now(timezone.utc).isoformat())
                
                # Timeout check: 300 seconds (5 minutes)
                try:
                    last_up = datetime.fromisoformat(state.last_updated)
                    diff = (datetime.now(timezone.utc) - last_up).total_seconds()
                    if diff > 300:
                        logger.warning(f"Session {session_id} timed out (inactive for {diff:.1f}s). Resetting conversation mode.")
                        state.conversation_mode = "none"
                        state.awaiting_confirmation = False
                        state.pending_action = None
                        state.pending_entities = None
                        state.confirmation_prompt = None
                        state.last_agent_question = None
                        state.conversation_step = 0
                except Exception as ex:
                    logger.error(f"Failed to check session timeout: {str(ex)}")

                state.uploaded_documents = state_dict.get("uploaded_documents", [])
                state.appointment_context = state_dict.get("appointment_context", {})
                state.reminder_context = state_dict.get("reminder_context", {})
                state.emergency_context = state_dict.get("emergency_context", {})
                state.caregiver_context = state_dict.get("caregiver_context", {})
                state.audit_events = state_dict.get("audit_events", [])
                
                # Restore messages
                for msg in state_dict.get("conversation_history", []):
                    state.conversation_history.append(
                        ChatMessage(role=msg["role"], content=msg["content"])
                    )
                return state

            logger.info(f"No AgentSession record found for {session_id}. Instantiating fresh AgentState.")
            return AgentState(session_id=session_id, user_id=user_id)
        except Exception as e:
            logger.error(f"Error loading session state from database: {str(e)}. Falling back to transient state.")
            return AgentState(session_id=session_id, user_id=user_id)
        finally:
            db.close()

    def save_session(self, session_id: str, state: AgentState) -> None:
        db = SessionLocal()
        try:
            logger.info(f"Persisting session state for {session_id} to AgentSession table...")
            
            # Serialize state to dictionary
            state_data = state.to_dict()
            
            # Find existing session or create a new one
            session_rec = db.query(AgentSession).filter(
                AgentSession.session_id == session_id
            ).first()
            
            if session_rec:
                session_rec.state_json = state_data
            else:
                import uuid as py_uuid
                user_id_str = str(state.user_id)
                try:
                    db_user_id = py_uuid.UUID(user_id_str)
                except ValueError:
                    db_user_id = py_uuid.uuid5(py_uuid.NAMESPACE_DNS, user_id_str)

                session_rec = AgentSession(
                    session_id=session_id,
                    user_id=db_user_id,
                    state_json=state_data
                )
                db.add(session_rec)
                
            db.commit()
            logger.info(f"Session {session_id} state successfully saved to AgentSession.")
        except Exception as e:
            logger.error(f"Failed to persist session state in AgentSession: {str(e)}")
            db.rollback()
        finally:
            db.close()

session_manager = SessionManager()
