from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ChatMessage(BaseModel):
    role: str # user, assistant, system
    content: str

class AgentAction(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)

class AgentResponse(BaseModel):
    session_id: str
    response_text: str
    suggested_actions: List[AgentAction] = Field(default_factory=list)
    active_skill: Optional[str] = None
    emergency_triggered: bool = False
