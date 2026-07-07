export type UserRole = 'patient' | 'caregiver' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  riskLevel?: 'Low' | 'Medium' | 'High';
  healthScore?: number;
}

export interface Patient {
  id: string;
  userId: string;
  medicalConditions: string;
  allergies: string;
}

export interface Caregiver {
  id: string;
  userId: string;
  alertEmail: string;
  notifyOnMissed: boolean;
}

export interface Appointment {
  id: string;
  doctorName: string;
  clinicName: string;
  scheduledTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  calendarEventId?: string;
}

export interface MedicationReminder {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  scheduledTimes: string[];
  caregiverEscalationWindowMins: number;
  active: boolean;
}

export interface MedicationLog {
  id: string;
  reminderId: string;
  scheduledTime: string;
  loggedTime?: string;
  status: 'taken' | 'skipped' | 'missed';
}

export interface UploadedReport {
  id: string;
  filename: string;
  uploadedAt: string;
  extractedText: string;
  chunks: string[];
  embeddings: number[][];
  storagePath?: string;
  summaryCached?: string;
  createdAt?: string;
}

export interface Citation {
  text: string;
  source: string;
  chunkIndex: number;
  distance: number;
}

export interface AgentAction {
  tool_name: string;
  arguments: Record<string, any>;
}

export interface AgentResponse {
  session_id: string;
  response_text: string;
  suggested_actions: AgentAction[];
  active_skill?: string;
  emergency_triggered: boolean;
  conversation_state?: any;
  gemini_reasoning?: string;
  router?: string;
  model?: string;
  gemini_status?: string;
  raw_gemini_output?: string;
  state_before?: any;
  state_after?: any;
  fallback_activated?: boolean;
  fallback_reason?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
  thinking?: {
    intent: string;
    skill: string;
    tool: string;
    mcp: string;
    status: string;
    time: string;
    safetyChecks: string;
    conversationState?: any;
    geminiReasoning?: string;
    router?: string;
    model?: string;
    geminiStatus?: string;
    rawGeminiOutput?: string;
    stateBefore?: any;
    stateAfter?: any;
    fallbackActivated?: boolean;
    fallbackReason?: string;
  };
}
