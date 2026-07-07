from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.agent.models import ChatMessage

class AgentState:
    """
    Tracks complete conversational history, metadata context, 
    and clinical state events for a patient interaction session.
    """
    def __init__(
        self,
        session_id: str,
        user_id: str,
        messages: Optional[List[ChatMessage]] = None
    ):
        self.session_id = session_id
        self.user_id = user_id
        
        # Core History
        self.conversation_history: List[ChatMessage] = messages or []
        
        # Skill State Parameters
        self.active_skill: Optional[str] = None
        self.next_step: str = "route_intent"
        
        # Multi-Turn Confirmation Context
        self.awaiting_confirmation: bool = False
        self.awaiting_new_datetime: bool = False
        self.pending_action: Optional[str] = None
        self.pending_entities: Optional[Dict[str, Any]] = None
        self.confirmation_prompt: Optional[str] = None
        self.last_agent_question: Optional[str] = None
        self.selected_appointment_id: Optional[str] = None
        
        # State Machine Tracking
        self.conversation_mode: str = "none"
        self.conversation_step: int = 0
        self.last_updated: str = datetime.now(timezone.utc).isoformat()
        
        # Specialized Context Blocks
        self.uploaded_documents: List[Dict[str, Any]] = []
        self.appointment_context: Dict[str, Any] = {}
        self.reminder_context: Dict[str, Any] = {}
        self.emergency_context: Dict[str, Any] = {}
        self.caregiver_context: Dict[str, Any] = {}
        
        # Security Audit Logs
        self.audit_events: List[Dict[str, Any]] = []

    def add_message(self, role: str, content: str):
        self.conversation_history.append(ChatMessage(role=role, content=content))
        
    def add_document(self, filename: str, storage_path: str, summary_cached: Optional[str] = None):
        self.uploaded_documents.append({
            "filename": filename,
            "storage_path": storage_path,
            "summary": summary_cached,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        })
        self.log_audit("DOCUMENT_UPLOADED", {"filename": filename})

    def log_audit(self, action_type: str, details: Optional[Dict[str, Any]] = None):
        self.audit_events.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action_type,
            "details": details or {}
        })

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "conversation_history": [msg.model_dump() for msg in self.conversation_history],
            "active_skill": self.active_skill,
            "next_step": self.next_step,
            "awaiting_confirmation": self.awaiting_confirmation,
            "awaiting_new_datetime": self.awaiting_new_datetime,
            "pending_action": self.pending_action,
            "pending_entities": self.pending_entities,
            "confirmation_prompt": self.confirmation_prompt,
            "last_agent_question": self.last_agent_question,
            "selected_appointment_id": self.selected_appointment_id,
            "conversation_mode": self.conversation_mode,
            "conversation_step": self.conversation_step,
            "last_updated": self.last_updated,
            "uploaded_documents": self.uploaded_documents,
            "appointment_context": self.appointment_context,
            "reminder_context": self.reminder_context,
            "emergency_context": self.emergency_context,
            "caregiver_context": self.caregiver_context,
            "audit_events": self.audit_events
        }
