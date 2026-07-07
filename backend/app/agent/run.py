from datetime import datetime, timezone
from app.agent.models import AgentResponse
from app.agent.session import session_manager
from app.agent.workflows import AgentWorkflow
from app.database import SessionLocal
from app.models.user import User
from app.models.audit import AuditLog
from app.security import check_prompt_injection
from app.logging import logger

workflow = AgentWorkflow()

def run_agent(session_id: str, user_id: str, message_content: str) -> AgentResponse:
    """
    Unified execution hook for agent query processing.
    1. Check user inputs for prompt injection hijacks.
    2. Retrieve session history from DB.
    3. Process state nodes in workflow graph.
    4. Save updated session state.
    """
    logger.info(f"Running agent for session: {session_id}, query: '{message_content}'")
    
    # Security Scan: Intercept prompt injection hijacks
    if check_prompt_injection(message_content):
        logger.warning(f"PROMPT INJECTION BLOCKED: Session {session_id}, User {user_id}")
        
        # Log incident in security AuditLog
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            audit_log = AuditLog(
                user_id=user.id if user else None,
                action="SECURITY_PROMPT_INJECTION",
                details={"blocked_content": message_content}
            )
            db.add(audit_log)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log security audit: {str(e)}")
        finally:
            db.close()
            
        return AgentResponse(
            session_id=session_id,
            response_text=(
                "Security Warning: Your input triggered our automated security rules. "
                "Instructions designed to override safety policies or system prompts are blocked."
            ),
            suggested_actions=[],
            active_skill="security_block",
            emergency_triggered=False
        )
        
    # Retrieve current session state (loads history from DB)
    state = session_manager.get_or_create_session(session_id, user_id)
    
    # Add user message
    state.add_message(role="user", content=message_content)
    
    # Process through workflow graph
    response = workflow.process(state)
    
    # Add assistant response to history
    state.add_message(role="assistant", content=response.response_text)
    
    # Reset next execution node
    state.next_step = "route_intent"
    
    # Increment conversation step and update timestamp
    state.conversation_step += 1
    state.last_updated = datetime.now(timezone.utc).isoformat()
    
    # Persist updated history and contexts to database
    session_manager.save_session(session_id, state)
    
    return response
