import { Appointment, MedicationReminder, UploadedReport, User, AgentResponse, ChatMessage } from '../types';
import { queryGeminiRouter } from './llm_router';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
console.log("import.meta.env:", import.meta.env);

// Check backend heartbeat
let isBackendOnline = false;
fetch(`${API_BASE}/health`)
  .then(() => { isBackendOnline = true; console.log("MedAssist API server detected. Running in LIVE mode."); })
  .catch(() => { isBackendOnline = false; console.log("MedAssist API server offline. Reverting to local fallback database."); });

// --- LOCAL STORAGE DATA SEEDERS ---
const seedLocalStorage = () => {
  if (!localStorage.getItem('med_users')) {
    localStorage.setItem('med_users', JSON.stringify([
      { id: 'usr_patient_1', email: 'patient@example.com', fullName: 'John Doe', role: 'patient', riskLevel: 'Medium', healthScore: 88, createdAt: new Date().toISOString() },
      { id: 'usr_patient_2', email: 'alice@example.com', fullName: 'Alice Johnson', role: 'patient', riskLevel: 'Low', healthScore: 96, createdAt: new Date().toISOString() },
      { id: 'usr_patient_3', email: 'bob@example.com', fullName: 'Bob Vance', role: 'patient', riskLevel: 'High', healthScore: 54, createdAt: new Date().toISOString() },
      { id: 'usr_caregiver_1', email: 'caregiver@example.com', fullName: 'Sarah Smith', role: 'caregiver', createdAt: new Date().toISOString() },
      { id: 'usr_doctor_1', email: 'doctor@example.com', fullName: 'Dr. Evelyn Adams', role: 'doctor', createdAt: new Date().toISOString() },
      { id: 'usr_admin_1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin', createdAt: new Date().toISOString() }
    ]));
  }
  if (!localStorage.getItem('med_appointments')) {
    localStorage.setItem('med_appointments', JSON.stringify([
      { id: 'apt_1', doctorName: 'Dr. Evelyn Adams (Cardiology)', clinicName: 'Metro Heart Institute', scheduledTime: new Date(Date.now() + 86400000 * 2).toISOString(), status: 'scheduled' },
      { id: 'apt_2', doctorName: 'Dr. Michael Chang (Generalist)', clinicName: 'City Health Center', scheduledTime: new Date(Date.now() + 86400000 * 5).toISOString(), status: 'scheduled' }
    ]));
  }
  if (!localStorage.getItem('med_reminders')) {
    localStorage.setItem('med_reminders', JSON.stringify([
      { id: 'rem_1', medicationName: 'Lisinopril', dosage: '10mg', frequency: 'daily', scheduledTimes: ['08:00 AM'], caregiverEscalationWindowMins: 30, active: true },
      { id: 'rem_2', medicationName: 'Metformin', dosage: '500mg', frequency: 'twice daily', scheduledTimes: ['08:00 AM', '08:00 PM'], caregiverEscalationWindowMins: 30, active: true }
    ]));
  }
  if (!localStorage.getItem('med_reports')) {
    localStorage.setItem('med_reports', JSON.stringify([
      { 
        id: 'rep_1', 
        filename: 'metabolic_panel_june.pdf', 
        storagePath: 'gcs://reports/metabolic_june.pdf', 
        summaryCached: 'Blood panel results indicate normal blood sugar but elevated LDL cholesterol (145 mg/dL). Thyroid panel is balanced.', 
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        userId: 'usr_patient_1'
      }
    ]));
  }
  if (!localStorage.getItem('med_caregivers')) {
    localStorage.setItem('med_caregivers', JSON.stringify([
      { id: 'cg_link_1', patientId: 'usr_patient_1', caregiver_email: 'caregiver@example.com', relationship: 'daughter', status: 'accepted', createdAt: new Date().toISOString() },
      { id: 'cg_link_2', patientId: 'usr_patient_2', caregiver_email: 'caregiver@example.com', relationship: 'spouse', status: 'accepted', createdAt: new Date().toISOString() },
      { id: 'cg_link_3', patientId: 'usr_patient_3', caregiver_email: 'caregiver@example.com', relationship: 'son', status: 'accepted', createdAt: new Date().toISOString() }
    ]));
  }
  if (!localStorage.getItem('med_gemini_api_key')) {
    localStorage.setItem('med_gemini_api_key', 'YOUR_GEMINI_API_KEY');
  }
};

seedLocalStorage();

// Retrieve from localStorage helper
const getLocal = (key: string): any[] => JSON.parse(localStorage.getItem(key) || '[]');
const saveLocal = (key: string, data: any[]) => localStorage.setItem(key, JSON.stringify(data));

// Client-Side Mock AI State Persistence
const CONV_STATE_KEY = 'med_conversation_state';

export interface ConversationState {
  conversation_mode: string;
  awaiting_confirmation: boolean;
  awaiting_new_datetime?: boolean;
  pending_action: string | null;
  pending_entities: any | null;
  conversation_step: number;
  last_updated: string;
  last_agent_question: string | null;
  selected_appointment_id?: string | null;
}

const getInitialConversationState = (): ConversationState => ({
  conversation_mode: "none",
  awaiting_confirmation: false,
  awaiting_new_datetime: false,
  pending_action: null,
  pending_entities: null,
  conversation_step: 0,
  last_updated: new Date().toISOString(),
  last_agent_question: null,
  selected_appointment_id: null
});

const loadConversationState = (): ConversationState => {
  const data = localStorage.getItem(CONV_STATE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const lastUpdated = new Date(parsed.last_updated).getTime();
      // 300 seconds (5 minutes) timeout
      if (Date.now() - lastUpdated > 300000) {
        console.log("%c[CONVERSATION TIMEOUT] Resetting mock conversation state.", "color: #ef4444; font-weight: bold;");
        return getInitialConversationState();
      }
      return parsed;
    } catch (e) {
      return getInitialConversationState();
    }
  }
  return getInitialConversationState();
};

const saveConversationState = (state: ConversationState) => {
  localStorage.setItem(CONV_STATE_KEY, JSON.stringify(state));
};

export const apiService = {
  // --- AUTHENTICATION ---
  auth: {
    login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
      if (isBackendOnline) {
        // Live server login call
        const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
        });
        if (!response.ok) throw new Error("Authentication failed");
        return response.json();
      }
      // Mock local storage fallback login
      const users = getLocal('med_users');
      let matched = users.find(u => u.email === email);
      if (!matched) {
        if (email === 'patient@example.com') {
          matched = { id: 'usr_patient_1', email: 'patient@example.com', fullName: 'John Doe', role: 'patient', riskLevel: 'Medium', healthScore: 88, createdAt: new Date().toISOString() };
        } else if (email === 'caregiver@example.com') {
          matched = { id: 'usr_caregiver_1', email: 'caregiver@example.com', fullName: 'Sarah Smith', role: 'caregiver', createdAt: new Date().toISOString() };
        } else if (email === 'doctor@example.com') {
          matched = { id: 'usr_doctor_1', email: 'doctor@example.com', fullName: 'Dr. Evelyn Adams', role: 'doctor', createdAt: new Date().toISOString() };
        } else if (email === 'admin@example.com') {
          matched = { id: 'usr_admin_1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin', createdAt: new Date().toISOString() };
        }
        if (matched) {
          users.push(matched);
          saveLocal('med_users', users);
        }
      }
      if (!matched) throw new Error("User credentials mismatch");
      return { user: matched, token: 'mock_jwt_token_payload' };
    },
    
    register: async (email: string, fullName: string, role: 'patient' | 'caregiver'): Promise<User> => {
      const newUser = { id: `usr_${Math.random().toString(36).substr(2, 9)}`, email, fullName, role, createdAt: new Date().toISOString() };
      const users = getLocal('med_users');
      users.push(newUser);
      saveLocal('med_users', users);
      return newUser;
    }
  },

  // --- AI CHAT ASSISTANT ---
  chat: {
    sendMessage: async (sessionId: string, userId: string, message: string, history?: ChatMessage[]): Promise<AgentResponse> => {
      if (isBackendOnline) {
        const token = localStorage.getItem('medassist-auth-storage') ? JSON.parse(localStorage.getItem('medassist-auth-storage')!).state.token : '';
        const response = await fetch(`${API_BASE}/api/v1/chat/message`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message })
        });
        if (response.ok) return response.json();
      }
      
      // Client-Side Mock AI Response logic
      const cleanMsg = message.trim().toLowerCase();
      let response_text = "How can I help you coordinate your healthcare options today?";
      let suggested_actions: any[] = [];
      let active_skill = "general_chat";
      let emergency_triggered = false;

      // 1. Load Conversation State
      const state = loadConversationState();
      const stateBefore = { ...state };
      console.log("STATE BEFORE", stateBefore);

      let routerVal = "Rule-based";
      let modelVal = "None";
      let geminiStatusVal = "Offline";
      let rawGeminiOutputVal = "None";
      let fallbackActivatedVal = true;
      let fallbackReasonVal = "API key missing";

      const apiKeyEnv = import.meta.env.VITE_GEMINI_API_KEY;
      const apiKey = apiKeyEnv || localStorage.getItem('med_gemini_api_key');
      const hasKey = apiKey && apiKey !== "YOUR_GEMINI_API_KEY";

      if (!hasKey) {
        fallbackReasonVal = "API key missing";
      }

      let geminiResponse: any = null;
      let geminiReasoning: string | undefined = undefined;

      if (hasKey) {
        try {
          geminiStatusVal = "Connected";
          routerVal = "Gemini";
          modelVal = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
          
          geminiResponse = await queryGeminiRouter(message, state, history || []);
          geminiReasoning = geminiResponse.reasoning;
          rawGeminiOutputVal = JSON.stringify(geminiResponse, null, 2);
          fallbackActivatedVal = false;
          fallbackReasonVal = "None";
          console.log("%c[GEMINI ROUTER] Route succeeded", "color: #10b981; font-weight: bold;", geminiResponse);
        } catch (err: any) {
          console.warn("[GEMINI ROUTER] Route failed, falling back to rule-based parser:", err);
          fallbackActivatedVal = true;
          routerVal = "Rule-based";
          const errMsg = err?.message || String(err);
          if (errMsg.includes("API key missing") || errMsg.includes("key missing") || errMsg.includes("Key missing")) {
            fallbackReasonVal = "API key missing";
          } else if (errMsg.includes("JSON") || errMsg.includes("parse")) {
            fallbackReasonVal = "invalid response";
          } else if (errMsg.includes("timeout")) {
            fallbackReasonVal = "timeout";
          } else {
            fallbackReasonVal = "invalid response";
          }
        }
      }

      if (geminiResponse) {
        let active_skill_gemini = geminiResponse.intent;
        let response_text_gemini = "";
        let suggested_actions_gemini: any[] = [];
        let emergency_triggered_gemini = false;

        const cleanMsgLower = cleanMsg.toLowerCase();

        // Guardrails Check
        if (anyKeyword(cleanMsgLower, ["diagnose", "what is my condition", "symptoms of", "cause of"])) {
          response_text_gemini = "I cannot provide diagnostic medical advice. Please consult with a licensed healthcare provider for medical evaluations.";
          active_skill_gemini = "general_question";
          geminiResponse.next_action = "none";
        } else if (anyKeyword(cleanMsgLower, ["prescribe", "medication for", "recommend pill", "treatment for"])) {
          response_text_gemini = "I am an AI assistant and cannot prescribe medications or recommend specific drug treatments. Please speak to your physician.";
          active_skill_gemini = "general_question";
          geminiResponse.next_action = "none";
        } else if (anyKeyword(cleanMsgLower, ["chest pain", "breathing", "bleeding", "emergency"]) || geminiResponse.next_action === "emergency_escalation" || geminiResponse.intent === "emergency_guidance") {
          response_text_gemini = "CRITICAL SITUATION IDENTIFIED: If you are experiencing chest tightness or severe bleeding, call 911 immediately. I am alerting your caregivers and listing nearby clinics.";
          active_skill_gemini = "emergency_guidance";
          emergency_triggered_gemini = true;
          geminiResponse.next_action = "search_nearby_clinics";
        }

        // Apply state updates based on Gemini router
        if (active_skill_gemini === "appointment_booking") {
          state.conversation_mode = "appointment_booking";
        } else if (active_skill_gemini === "medication_reminder") {
          state.conversation_mode = "medication_reminder";
        } else if (active_skill_gemini === "report_summary") {
          state.conversation_mode = "report_summary";
        } else if (active_skill_gemini === "emergency_guidance") {
          state.conversation_mode = "emergency_guidance";
        } else {
          state.conversation_mode = "none";
        }

        // Force report_summarizer intent override if keywords match or continuing report flow
        if (
          ["summarize", "report", "pdf", "document", "uploaded file"].some(kw => cleanMsg.includes(kw)) ||
          (state.conversation_mode === "report_summary" && ![
            "chest pain", "breathing", "bleeding", "emergency",
            "reminder", "medication", "pill",
            "appointment", "booking", "schedule", "reschedule", "doctor", "physician", "clinic",
            "caregiver", "notifier", "alert", "notify", "link"
          ].some(flag => cleanMsg.includes(flag)))
        ) {
          active_skill_gemini = "report_summarizer";
          state.conversation_mode = "report_summary";
        }

        if (active_skill_gemini === "report_summarizer") {
          const reports = getLocal('med_reports') as UploadedReport[];
          
          // Extract referenced filename if present
          const pdfMatch = cleanMsg.match(/([\w\-_]+\.pdf)/i);
          const referencedFilename = pdfMatch ? pdfMatch[1] : null;
          
          let matchedRep = null;
          let isLowConfidence = false;
          
          if (referencedFilename) {
            matchedRep = reports.find(r => r.filename.toLowerCase() === referencedFilename.toLowerCase());
            if (!matchedRep) {
              isLowConfidence = true;
            } else {
              // Check if query is looking for cholesterol/glucose/etc and it is not in the text
              const contentKeywords = ["cholesterol", "glucose", "hdl", "ldl", "thyroid", "sugar", "blood"];
              const queriedKeywords = contentKeywords.filter(kw => cleanMsg.includes(kw));
              if (queriedKeywords.length > 0) {
                const textLower = (matchedRep.extractedText || "").toLowerCase();
                const hasKeyword = queriedKeywords.some(kw => textLower.includes(kw));
                if (!hasKeyword) {
                  isLowConfidence = true;
                }
              }
            }
          } else {
            // Try to retrieve from active conversation state
            const activeReportFilename = state.pending_entities?.active_report_filename;
            if (activeReportFilename) {
              matchedRep = reports.find(r => r.filename.toLowerCase() === activeReportFilename.toLowerCase());
            }
            if (!matchedRep) {
              // Fallback to the latest report (last in array)
              matchedRep = reports[reports.length - 1];
            }
          }
          
          if (referencedFilename && isLowConfidence) {
            response_text_gemini = `No information found in ${referencedFilename}`;
          } else if (matchedRep) {
            if (!state.pending_entities) {
              state.pending_entities = {};
            }
            state.pending_entities.active_report_filename = matchedRep.filename;
            
            const isSummary = ["summarize", "report", "pdf", "document", "uploaded file"].some(kw => cleanMsg.includes(kw));
            if (isSummary) {
              response_text_gemini = matchedRep.summaryCached || `### **Summary**\nSummary of the medical report '${matchedRep.filename}'.\n\n### **Key findings**\nLab metrics indicate metabolic values are in normal bounds.\n\n### **Abnormal values**\nNone noted.\n\n### **Recommendations**\nFollow up with your practitioner.\n\n### **Citations**\nSource:\n${matchedRep.filename} (Chunk 3)`;
            } else {
              let answer = "";
              if (cleanMsg.includes("cholesterol")) {
                const text = matchedRep.extractedText || "";
                for (const line of text.split("\n")) {
                  if (line.toLowerCase().includes("cholesterol")) {
                    answer = `According to the uploaded report, ${line.trim()}.`;
                    break;
                  }
                }
                if (!answer) answer = "Your LDL cholesterol level is 145 mg/dL.";
              } else {
                answer = `Based on your report '${matchedRep.filename}', everything else looks within normal parameters.`;
              }
              response_text_gemini = answer + `\n\n### **Citations**\nSource:\n${matchedRep.filename} (Chunk 3)`;
            }
            suggested_actions_gemini.push({ tool_name: "retrieve_medical_report_chunks", arguments: { query: cleanMsg } });
          } else {
            response_text_gemini = "I couldn't find any uploaded medical reports to analyze. Please upload a PDF first.";
          }
          
          if (state.conversation_mode !== "none") {
            state.conversation_step += 1;
          } else {
            state.conversation_step = 0;
          }
          state.last_updated = new Date().toISOString();
          const stateAfter = { ...state };
          saveConversationState(stateAfter);
          
          return {
            session_id: sessionId,
            response_text: response_text_gemini + "\n\nDisclaimer: I am an AI healthcare assistant, not a doctor. For serious symptoms, consult a doctor.",
            suggested_actions: suggested_actions_gemini,
            active_skill: active_skill_gemini,
            emergency_triggered: false,
            conversation_state: stateAfter,
            router: routerVal,
            model: modelVal,
            gemini_status: geminiStatusVal,
            raw_gemini_output: rawGeminiOutputVal,
            state_before: stateBefore,
            state_after: stateAfter,
            fallback_activated: fallbackActivatedVal,
            fallback_reason: fallbackReasonVal
          };
        }

        // Override action to avoid converting reschedule flow to create appointment
        if (state.pending_action === "reschedule_appointment" && geminiResponse.next_action === "create_appointment") {
          geminiResponse.next_action = "reschedule_appointment";
        }

        state.pending_action = geminiResponse.next_action;
        state.pending_entities = {
          ...(state.pending_entities || {}),
          ...(geminiResponse.updated_entities || {})
        };

        // Special handling:
        // If next_action is "reschedule_appointment"
        if (geminiResponse.next_action === "reschedule_appointment") {
          const confirmations = ["yes", "yes please", "confirm", "book it", "proceed", "okay", "y", "sure", "sounds good"];
          const isConfirm = confirmations.some(c => cleanMsg === c || cleanMsg.startsWith(c + " ") || cleanMsg.endsWith(" " + c));
          
          if (state.awaiting_confirmation && isConfirm) {
            // Confirming the change, so let it proceed to call update_calendar_event
          } else {
            state.awaiting_confirmation = false;
            state.awaiting_new_datetime = true;
            response_text_gemini = "What date and time would you like to move your appointment to?";
          }
        }

        // Action Routing
        const action = geminiResponse.next_action;

        if (action === "modify_appointment") {
          const appointments = getLocal('med_appointments');
          const activeApt = appointments.find(a => a.status === 'scheduled');
          if (activeApt) {
            const aptDate = new Date(activeApt.scheduledTime);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const weekday = days[aptDate.getDay()];
            const timeString = aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            response_text_gemini = `I found your appointment with ${activeApt.doctorName} on ${weekday} at ${timeString}.\n\nWhat would you like to change?\n\n• Date\n• Time\n• Doctor\n• Cancel Appointment`;
            
            state.conversation_mode = "appointment_booking";
            state.selected_appointment_id = activeApt.id;
            state.awaiting_confirmation = true;
            state.pending_action = "modify_appointment";
            state.pending_entities = {
              doctorName: activeApt.doctorName,
              clinicName: activeApt.clinicName,
              time_slot: `${weekday} at ${timeString}`
            };
          } else {
            response_text_gemini = "I couldn't find any active scheduled appointments for you.";
            Object.assign(state, getInitialConversationState());
          }
        } else if (action === "reschedule_appointment") {
          const confirmations = ["yes", "yes please", "confirm", "book it", "proceed", "okay", "y", "sure", "sounds good"];
          const cancellations = ["no", "cancel", "not now", "n"];
          const isConfirm = confirmations.some(c => cleanMsg === c || cleanMsg.startsWith(c + " ") || cleanMsg.endsWith(" " + c));
          const isCancel = cancellations.some(c => cleanMsg === c || cleanMsg.startsWith(c + " ") || cleanMsg.endsWith(" " + c));

          if (state.awaiting_confirmation && (isConfirm || isCancel)) {
            if (isConfirm) {
              const dateVal = state.pending_entities?.date || "Monday";
              const timeVal = state.pending_entities?.time || "09:00 AM";

              // Calculate scheduled time
              const d = new Date();
              const dayNum = d.getDay();
              let parsedDay = new Date(d.getTime() + (8 - dayNum) * 24 * 60 * 60 * 1000); // default next Monday
              
              const targetDayStr = dateVal.toLowerCase();
              if (targetDayStr.includes("tuesday")) {
                const diff = dayNum <= 1 ? 2 - dayNum : 9 - dayNum;
                parsedDay = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
              } else if (targetDayStr.includes("wednesday")) {
                const diff = dayNum <= 2 ? 3 - dayNum : 10 - dayNum;
                parsedDay = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
              } else if (targetDayStr.includes("thursday")) {
                const diff = dayNum <= 3 ? 4 - dayNum : 11 - dayNum;
                parsedDay = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
              } else if (targetDayStr.includes("friday")) {
                const diff = dayNum <= 4 ? 5 - dayNum : 12 - dayNum;
                parsedDay = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
              } else if (targetDayStr.includes("monday")) {
                const diff = dayNum === 0 ? 1 : 8 - dayNum;
                parsedDay = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
              }
              
              let hour = 9;
              let min = 0;
              const tStr = timeVal.toLowerCase();
              const match = tStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
              if (match) {
                hour = parseInt(match[1]);
                min = parseInt(match[2]);
                const ampm = match[3];
                if (ampm === "pm" && hour < 12) hour += 12;
                if (ampm === "am" && hour === 12) hour = 0;
              } else if (tStr.includes("12 pm")) {
                hour = 12;
              } else if (tStr.includes("10 pm")) {
                hour = 22;
              } else if (tStr.includes("11 am")) {
                hour = 11;
              } else if (tStr.includes("10 am")) {
                hour = 10;
              }
              parsedDay.setHours(hour, min, 0, 0);
              const scheduledTime = parsedDay.toISOString();

              const appointments = getLocal('med_appointments');
              const targetId = state.selected_appointment_id;
              const matchApt = targetId ? appointments.find(a => a.id === targetId) : appointments.find(a => a.status === 'scheduled');
              if (matchApt) {
                matchApt.scheduledTime = scheduledTime;
                saveLocal('med_appointments', appointments);
              }

              response_text_gemini = `Your appointment has been rescheduled to ${dateVal} at ${timeVal}.`;
              suggested_actions_gemini.push({
                tool_name: "update_calendar_event",
                arguments: { appointment_id: targetId || matchApt?.id, new_date_time: scheduledTime }
              });
            } else {
              response_text_gemini = "No problem. The appointment was not rescheduled.";
            }

            Object.assign(state, getInitialConversationState());
          } else {
            const dateVal = state.pending_entities?.date;
            const timeVal = state.pending_entities?.time;

            if (dateVal && timeVal) {
              const timeSlot = `${dateVal} at ${timeVal}`;
              response_text_gemini = `I see an open slot on ${timeSlot}. Would you like me to confirm the change?`;
              suggested_actions_gemini.push({
                tool_name: "check_calendar_availability",
                arguments: { doctor_name: state.pending_entities?.doctorName || "Dr. Evelyn Adams (Cardiology)", preferred_date: timeSlot }
              });
              state.awaiting_new_datetime = false;
              state.awaiting_confirmation = true;
            } else {
              state.awaiting_confirmation = false;
              state.awaiting_new_datetime = true;
              response_text_gemini = "What date and time would you like to move your appointment to?";
            }
          }
        } else if (action === "check_calendar" || action === "find_another_doctor") {
          let doctorName = state.pending_entities?.doctorName || "Dr. Evelyn Adams (Cardiology)";
          let clinicName = state.pending_entities?.clinicName || "Metro Heart Institute";
          
          if (action === "find_another_doctor") {
            if (doctorName.includes("Evelyn Adams")) {
              doctorName = "Dr. John Adams (Cardiology)";
            } else {
              doctorName = "Dr. Evelyn Adams (Cardiology)";
            }
          }

          let day = "Monday";
          let timeVal = "09:00 AM";
          
          if (state.pending_entities?.time_slot) {
            const ts = state.pending_entities.time_slot.toLowerCase();
            if (ts.includes("tuesday")) day = "Tuesday";
            else if (ts.includes("wednesday")) day = "Wednesday";
            else if (ts.includes("thursday")) day = "Thursday";
            else if (ts.includes("friday")) day = "Friday";
            
            const match = state.pending_entities.time_slot.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/i);
            if (match) {
              timeVal = match[0].toUpperCase();
            } else if (ts.includes("12 pm")) {
              timeVal = "12:00 PM";
            } else if (ts.includes("10 pm")) {
              timeVal = "10:00 PM";
            } else if (ts.includes("11 am")) {
              timeVal = "11:00 AM";
            }
          }

          if (geminiResponse.updated_entities?.time) {
            timeVal = geminiResponse.updated_entities.time;
          }
          if (geminiResponse.updated_entities?.date) {
            day = geminiResponse.updated_entities.date;
            day = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
          }
          if (geminiResponse.updated_entities?.doctorName) {
            doctorName = geminiResponse.updated_entities.doctorName;
          }

          const timeSlot = `${day} at ${timeVal}`;
          state.pending_entities = {
            doctorName,
            clinicName,
            time_slot: timeSlot
          };

          const isReschedule = state.pending_action === "reschedule_appointment" || state.pending_action === "modify_appointment";
          if (isReschedule) {
            response_text_gemini = `I see an open slot on ${timeSlot}. Would you like me to confirm the change?`;
            state.pending_action = "reschedule_appointment";
          } else {
            response_text_gemini = `I see an open slot with ${doctorName} on ${timeSlot}. Would you like me to book it?`;
            state.pending_action = "create_appointment";
          }
          suggested_actions_gemini.push({
            tool_name: "check_calendar_availability",
            arguments: { doctor_name: doctorName.replace(/\s*\(.*\)/, ""), preferred_date: timeSlot }
          });
          state.awaiting_confirmation = true;
        } else if (action === "create_appointment") {
          let doctorName = state.pending_entities?.doctorName || "Dr. Evelyn Adams (Cardiology)";
          let clinicName = state.pending_entities?.clinicName || "Metro Heart Institute";
          let timeSlot = state.pending_entities?.time_slot || "Monday at 09:00 AM";

          const d = new Date();
          const dayNum = d.getDay();
          const daysUntilNextMonday = dayNum === 0 ? 1 : 8 - dayNum;
          const nextMonday = new Date(d.getTime() + daysUntilNextMonday * 24 * 60 * 60 * 1000);

          let scheduledTime = nextMonday.toISOString();
          let parsedDay = nextMonday;
          if (timeSlot.toLowerCase().includes("tuesday")) {
            const daysUntilNextTuesday = dayNum <= 1 ? 2 - dayNum : 9 - dayNum;
            parsedDay = new Date(d.getTime() + daysUntilNextTuesday * 24 * 60 * 60 * 1000);
          }

          if (timeSlot.toLowerCase().includes("12:00 pm") || timeSlot.toLowerCase().includes("12 pm")) {
            parsedDay.setHours(12, 0, 0, 0);
          } else if (timeSlot.toLowerCase().includes("10:00 pm") || timeSlot.toLowerCase().includes("10 pm")) {
            parsedDay.setHours(22, 0, 0, 0);
          } else if (timeSlot.toLowerCase().includes("10:00 am") || timeSlot.toLowerCase().includes("10 am")) {
            parsedDay.setHours(10, 0, 0, 0);
          } else if (timeSlot.toLowerCase().includes("11:00 am") || timeSlot.toLowerCase().includes("11 am")) {
            parsedDay.setHours(11, 0, 0, 0);
          } else {
            parsedDay.setHours(9, 0, 0, 0);
          }
          scheduledTime = parsedDay.toISOString();

          const appointments = getLocal('med_appointments');
          const isConflict = appointments.some(a => 
            a.doctorName === doctorName && 
            a.status === 'scheduled' && 
            new Date(a.scheduledTime).getTime() === new Date(scheduledTime).getTime()
          );

          if (isConflict) {
            response_text_gemini = `Booking failed. You already have an appointment with ${doctorName} on ${timeSlot}. Would you like to book a different time?`;
            state.awaiting_confirmation = true;
            state.last_agent_question = response_text_gemini;

            const stateAfter = { ...state, conversation_step: state.conversation_step + 1, last_updated: new Date().toISOString() };
            console.log("STATE AFTER", stateAfter);
            saveConversationState(stateAfter);
            return {
              session_id: sessionId,
              response_text: response_text_gemini,
              suggested_actions: suggested_actions_gemini,
              active_skill: active_skill_gemini,
              emergency_triggered: emergency_triggered_gemini,
              conversation_state: stateAfter,
              gemini_reasoning: geminiReasoning,
              router: routerVal,
              model: modelVal,
              gemini_status: geminiStatusVal,
              raw_gemini_output: rawGeminiOutputVal,
              state_before: stateBefore,
              state_after: stateAfter,
              fallback_activated: fallbackActivatedVal,
              fallback_reason: fallbackReasonVal
            };
          } else {
            if (state.selected_appointment_id) {
              const oldMatch = appointments.find(a => a.id === state.selected_appointment_id);
              if (oldMatch) {
                oldMatch.status = 'cancelled';
              }
            }

            const newApt = { id: `apt_${Date.now()}`, doctorName, clinicName, scheduledTime, status: 'scheduled' as const };
            appointments.push(newApt);
            saveLocal('med_appointments', appointments);

            response_text_gemini = `Your appointment with ${doctorName} has been booked for ${timeSlot}.`;
            suggested_actions_gemini.push({
              tool_name: "book_calendar_event",
              arguments: { doctor_name: doctorName, time_slot: timeSlot, patient_email: "patient@example.com" }
            });

            Object.assign(state, getInitialConversationState());
          }
        } else if (action === "cancel_appointment") {
          const appointments = getLocal('med_appointments');
          const targetId = state.selected_appointment_id;
          const matchApt = targetId ? appointments.find(a => a.id === targetId) : appointments.find(a => a.status === 'scheduled');
          
          if (matchApt) {
            matchApt.status = 'cancelled';
            saveLocal('med_appointments', appointments);
            response_text_gemini = `Your appointment with ${matchApt.doctorName} has been cancelled successfully.`;
          } else {
            response_text_gemini = "I couldn't find any active appointments to cancel.";
          }
          Object.assign(state, getInitialConversationState());
        } else if (action === "emergency_escalation" || action === "search_nearby_clinics") {
          active_skill_gemini = "emergency_guidance";
          emergency_triggered_gemini = true;
          response_text_gemini = "CRITICAL SITUATION IDENTIFIED: If you are experiencing chest tightness or severe bleeding, call 911 immediately. I am alerting your caregivers and listing nearby clinics.";
          suggested_actions_gemini.push({ tool_name: "search_nearby_clinics", arguments: {} });
          Object.assign(state, getInitialConversationState());
        } else {
          if (!response_text_gemini) {
            response_text_gemini = "How can I help you coordinate your healthcare options today?";
          }
          if (geminiResponse.response_type === "cancellation") {
            Object.assign(state, getInitialConversationState());
          } else if (geminiResponse.response_type === "standard_response") {
            Object.assign(state, getInitialConversationState());
          }
        }

        if (["emergency_guidance", "report_summary", "medication_reminder"].includes(active_skill_gemini)) {
          response_text_gemini += "\n\nDisclaimer: I am an AI healthcare assistant, not a doctor. For serious symptoms, consult a doctor.";
        }

        if (state.conversation_mode !== "none") {
          state.conversation_step += 1;
        } else {
          state.conversation_step = 0;
        }
        state.last_updated = new Date().toISOString();
        const stateAfter = { ...state };
        console.log("STATE AFTER", stateAfter);
        saveConversationState(stateAfter);

        return {
          session_id: sessionId,
          response_text: response_text_gemini,
          suggested_actions: suggested_actions_gemini,
          active_skill: active_skill_gemini,
          emergency_triggered: emergency_triggered_gemini,
          conversation_state: stateAfter,
          gemini_reasoning: geminiReasoning,
          router: routerVal,
          model: modelVal,
          gemini_status: geminiStatusVal,
          raw_gemini_output: rawGeminiOutputVal,
          state_before: stateBefore,
          state_after: stateAfter,
          fallback_activated: fallbackActivatedVal,
          fallback_reason: fallbackReasonVal
        };
      }

      // Check continuation / awaiting confirmation
      if (state.conversation_mode === "appointment_booking" && (state.awaiting_confirmation || state.awaiting_new_datetime)) {
        active_skill = "appointment_booking";
        
        const confirmations = ["yes", "yes please", "confirm", "book it", "proceed", "okay", "y", "sure", "sounds good"];
        const cancellations = ["no", "cancel", "not now", "n"];

        const hasTimeChange = ["pm", "am", "at", "o'clock", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "next"].some(t => cleanMsg.includes(t));
        const hasDoctorChange = ["another doctor", "different doctor", "other doctor", "different physician", "change doctor"].some(d => cleanMsg.includes(d));

        const isConfirm = confirmations.some(c => cleanMsg === c || cleanMsg.startsWith(c + " ") || cleanMsg.endsWith(" " + c));
        const isCancel = cancellations.some(c => cleanMsg === c || cleanMsg.startsWith(c + " ") || cleanMsg.endsWith(" " + c));

        if (state.awaiting_new_datetime && !hasTimeChange) {
          response_text = "What date and time would you like to move your appointment to?";
          state.last_agent_question = response_text;
        } else if (hasTimeChange || hasDoctorChange) {
          const isReschedule = state.pending_action === "modify_appointment" || state.pending_action === "reschedule_appointment";
          if (isReschedule) {
            state.pending_action = "reschedule_appointment";
          }

          state.pending_entities = state.pending_entities || {
            doctorName: "Dr. Evelyn Adams (Cardiology)",
            clinicName: "Metro Heart Institute",
            time_slot: "Monday at 09:00 AM"
          };

          if (hasTimeChange) {
            let day = "";
            if (cleanMsg.includes("monday")) day = "Monday";
            else if (cleanMsg.includes("tuesday")) day = "Tuesday";
            else if (cleanMsg.includes("wednesday")) day = "Wednesday";
            else if (cleanMsg.includes("thursday")) day = "Thursday";
            else if (cleanMsg.includes("friday")) day = "Friday";
            else if (cleanMsg.includes("saturday")) day = "Saturday";
            else if (cleanMsg.includes("sunday")) day = "Sunday";
            else {
              if (state.pending_entities.time_slot?.toLowerCase().includes("tuesday")) day = "Tuesday";
              else if (state.pending_entities.time_slot?.toLowerCase().includes("wednesday")) day = "Wednesday";
              else if (state.pending_entities.time_slot?.toLowerCase().includes("thursday")) day = "Thursday";
              else if (state.pending_entities.time_slot?.toLowerCase().includes("friday")) day = "Friday";
              else if (state.pending_entities.time_slot?.toLowerCase().includes("monday")) day = "Monday";
            }

            let timeVal = "";
            if (cleanMsg.includes("12 pm")) timeVal = "12:00 PM";
            else if (cleanMsg.includes("10 pm")) timeVal = "10:00 PM";
            else if (cleanMsg.includes("10 am")) timeVal = "10:00 AM";
            else if (cleanMsg.includes("11 am")) timeVal = "11:00 AM";
            else if (cleanMsg.includes("9 am") || cleanMsg.includes("09:00 am") || cleanMsg.includes("9:00 am")) timeVal = "09:00 AM";
            else {
              const match = cleanMsg.match(/\d{1,2}:\d{2}\s*(?:am|pm)/i);
              if (match) {
                timeVal = match[0].toUpperCase();
              } else if (state.pending_entities.time_slot) {
                const matchOld = state.pending_entities.time_slot.match(/\d{2}:\d{2}\s*(?:AM|PM)/i);
                if (matchOld) timeVal = matchOld[0].toUpperCase();
              }
            }

            if (isReschedule) {
              if (day) state.pending_entities.date = day;
              if (timeVal) state.pending_entities.time = timeVal;
              
              if (state.pending_entities.date && state.pending_entities.time) {
                const timeSlot = `${state.pending_entities.date} at ${state.pending_entities.time}`;
                state.pending_entities.time_slot = timeSlot;
                response_text = `I see an open slot on ${timeSlot}. Would you like me to confirm the change?`;
                suggested_actions.push({
                  tool_name: "check_calendar_availability",
                  arguments: { doctor_name: state.pending_entities.doctorName || "Dr. Evelyn Adams (Cardiology)", preferred_date: timeSlot }
                });
                state.awaiting_new_datetime = false;
                state.awaiting_confirmation = true;
              } else {
                state.awaiting_confirmation = false;
                state.awaiting_new_datetime = true;
                response_text = "What date and time would you like to move your appointment to?";
              }
              state.last_agent_question = response_text;
            } else {
              if (day && timeVal) state.pending_entities.time_slot = `${day} at ${timeVal}`;
            }
          }

          if (!isReschedule) {
            if (hasDoctorChange) {
              if (state.pending_entities.doctorName.includes("Evelyn Adams")) {
                state.pending_entities.doctorName = "Dr. John Adams (Cardiology)";
                state.pending_entities.clinicName = "Metro Heart Institute";
              } else {
                state.pending_entities.doctorName = "Dr. Evelyn Adams (Cardiology)";
                state.pending_entities.clinicName = "Metro Heart Institute";
              }
            }

            const doctorName = state.pending_entities.doctorName;
            const timeSlot = state.pending_entities.time_slot;
            response_text = `I see an open slot with ${doctorName} on ${timeSlot}. Would you like me to book it?`;
            suggested_actions.push({
              tool_name: "check_calendar_availability",
              arguments: { doctor_name: doctorName.replace(/\s*\(.*\)/, ""), preferred_date: timeSlot }
            });
            
            state.awaiting_confirmation = true;
            state.last_agent_question = response_text;
          }
        } else if (isConfirm) {
          const doctorName = state.pending_entities?.doctorName || "Dr. Evelyn Adams (Cardiology)";
          const clinicName = state.pending_entities?.clinicName || "Metro Heart Institute";
          const timeSlot = state.pending_entities?.time_slot || "Monday at 09:00 AM";
          
          // Calculate scheduled time
          const d = new Date();
          const dayNum = d.getDay();
          const daysUntilNextMonday = dayNum === 0 ? 1 : 8 - dayNum;
          const nextMonday = new Date(d.getTime() + daysUntilNextMonday * 24 * 60 * 60 * 1000);
          
          let scheduledTime = nextMonday.toISOString();
          if (timeSlot.toLowerCase().includes("monday")) {
            const targetDay = nextMonday;
            if (timeSlot.toLowerCase().includes("10:00 pm") || timeSlot.toLowerCase().includes("10 pm")) {
              targetDay.setHours(22, 0, 0, 0);
            } else if (timeSlot.toLowerCase().includes("10:00 am") || timeSlot.toLowerCase().includes("10 am")) {
              targetDay.setHours(10, 0, 0, 0);
            } else if (timeSlot.toLowerCase().includes("11:00 am") || timeSlot.toLowerCase().includes("11 am")) {
              targetDay.setHours(11, 0, 0, 0);
            } else {
              targetDay.setHours(9, 0, 0, 0);
            }
            scheduledTime = targetDay.toISOString();
          } else if (timeSlot.toLowerCase().includes("tuesday")) {
            const daysUntilNextTuesday = dayNum <= 1 ? 2 - dayNum : 9 - dayNum;
            const nextTuesday = new Date(d.getTime() + daysUntilNextTuesday * 24 * 60 * 60 * 1000);
            if (timeSlot.toLowerCase().includes("11:00 am") || timeSlot.toLowerCase().includes("11 am")) {
              nextTuesday.setHours(11, 0, 0, 0);
            } else {
              nextTuesday.setHours(9, 0, 0, 0);
            }
            scheduledTime = nextTuesday.toISOString();
          }

          // Check conflict
          const appointments = getLocal('med_appointments');
          const isConflict = appointments.some(a => 
            a.doctorName === doctorName && 
            a.status === 'scheduled' && 
            new Date(a.scheduledTime).getTime() === new Date(scheduledTime).getTime()
          );

          if (isConflict) {
            response_text = `Booking failed. You already have an appointment with ${doctorName} on ${timeSlot}. Would you like to book a different time?`;
            state.awaiting_confirmation = true;
            state.last_agent_question = response_text;
            
            // Return early keeping conflict state active
            const stateAfter = { ...state, conversation_step: state.conversation_step + 1, last_updated: new Date().toISOString() };
            console.log("STATE AFTER", stateAfter);
            saveConversationState(stateAfter);
            return {
              session_id: sessionId,
              response_text,
              suggested_actions,
              active_skill,
              emergency_triggered,
              conversation_state: stateAfter,
              router: routerVal,
              model: modelVal,
              gemini_status: geminiStatusVal,
              raw_gemini_output: rawGeminiOutputVal,
              state_before: stateBefore,
              state_after: stateAfter,
              fallback_activated: fallbackActivatedVal,
              fallback_reason: fallbackReasonVal
            };
          } else {
            if (state.pending_action === "reschedule_appointment") {
              const targetId = state.selected_appointment_id;
              const matchApt = targetId ? appointments.find(a => a.id === targetId) : appointments.find(a => a.status === 'scheduled');
              if (matchApt) {
                matchApt.scheduledTime = scheduledTime;
                saveLocal('med_appointments', appointments);
              }
              response_text = `Your appointment has been rescheduled to ${timeSlot}.`;
              suggested_actions.push({
                tool_name: "update_calendar_event",
                arguments: { appointment_id: targetId || matchApt?.id, new_date_time: scheduledTime }
              });
            } else {
              // Success booking
              const newApt = { id: `apt_${Date.now()}`, doctorName, clinicName, scheduledTime, status: 'scheduled' as const };
              appointments.push(newApt);
              saveLocal('med_appointments', appointments);

              response_text = `Your appointment with ${doctorName} has been booked for ${timeSlot}.`;
              suggested_actions.push({
                tool_name: "book_calendar_event",
                arguments: { doctor_name: doctorName, time_slot: timeSlot, patient_email: "patient@example.com" }
              });
            }
            
            // Clear / reset state
            Object.assign(state, getInitialConversationState());
          }
        } else if (isCancel) {
          response_text = "No problem. The appointment was not booked.";
          // Clear / reset state
          Object.assign(state, getInitialConversationState());
        } else {
          // Unrelated query: reset confirmation context and fall through to classification
          Object.assign(state, getInitialConversationState());
          active_skill = "general_chat";
        }
      }

      // If we did not handle confirmation (or it was reset above), proceed to standard keywords
      if (active_skill === "general_chat") {
        if (anyKeyword(cleanMsg, ["chest pain", "breathing", "bleeding", "emergency"])) {
          active_skill = "emergency_guidance";
          emergency_triggered = true;
          response_text = "CRITICAL SITUATION IDENTIFIED: If you are experiencing chest tightness or severe bleeding, call 911 immediately. I am alerting your caregivers and listing nearby clinics.";
          suggested_actions.push({ tool_name: "search_nearby_clinics", arguments: {} });
        } else if (anyKeyword(cleanMsg, ["update", "modify", "change"]) && anyKeyword(cleanMsg, ["appointment", "booking"])) {
          active_skill = "appointment_booking";
          const appointments = getLocal('med_appointments');
          const activeApt = appointments.find(a => a.status === 'scheduled');
          if (activeApt) {
            const aptDate = new Date(activeApt.scheduledTime);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const weekday = days[aptDate.getDay()];
            const timeString = aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            response_text = `I found your appointment with ${activeApt.doctorName} on ${weekday} at ${timeString}.\n\nWhat would you like to change?\n\n• Date\n• Time\n• Doctor\n• Cancel Appointment`;
            
            state.conversation_mode = "appointment_booking";
            state.selected_appointment_id = activeApt.id;
            state.awaiting_confirmation = true;
            state.pending_action = "modify_appointment";
            state.pending_entities = {
              doctorName: activeApt.doctorName,
              clinicName: activeApt.clinicName,
              time_slot: `${weekday} at ${timeString}`
            };
          } else {
            response_text = "I couldn't find any active scheduled appointments for you.";
            Object.assign(state, getInitialConversationState());
          }
        } else if (anyKeyword(cleanMsg, ["cancel", "delete"]) && anyKeyword(cleanMsg, ["appointment", "booking"])) {
          active_skill = "appointment_booking";
          const appointments = getLocal('med_appointments');
          const activeApt = appointments.find(a => a.status === 'scheduled');
          if (activeApt) {
            activeApt.status = 'cancelled';
            saveLocal('med_appointments', appointments);
            response_text = `Your appointment with ${activeApt.doctorName} has been cancelled successfully.`;
          } else {
            response_text = "I couldn't find any active appointments to cancel.";
          }
          Object.assign(state, getInitialConversationState());
        } else if (anyKeyword(cleanMsg, ["book", "appointment", "schedule"])) {
          active_skill = "appointment_booking";
          
          let doctorName = "Dr. Evelyn Adams (Cardiology)";
          let clinicName = "Metro Heart Institute";
          if (cleanMsg.includes("chang")) {
            doctorName = "Dr. Michael Chang (Generalist)";
            clinicName = "City Health Center";
          } else if (cleanMsg.includes("johnson") || cleanMsg.includes("sarah")) {
            doctorName = "Dr. Sarah Johnson (Neurology)";
            clinicName = "Neuroscience Center";
          } else if (cleanMsg.includes("adams")) {
            doctorName = "Dr. Evelyn Adams (Cardiology)";
            clinicName = "Metro Heart Institute";
          }

          let day = "Monday";
          if (cleanMsg.includes("tuesday")) day = "Tuesday";
          else if (cleanMsg.includes("wednesday")) day = "Wednesday";
          else if (cleanMsg.includes("thursday")) day = "Thursday";
          else if (cleanMsg.includes("friday")) day = "Friday";

          let timeVal = "09:00 AM";
          if (cleanMsg.includes("10 pm") || cleanMsg.includes("10:00 pm")) timeVal = "10:00 PM";
          else if (cleanMsg.includes("10 am") || cleanMsg.includes("10:00 am")) timeVal = "10:00 AM";
          else if (cleanMsg.includes("11 am") || cleanMsg.includes("11:00 am")) timeVal = "11:00 AM";
          else if (cleanMsg.includes("9 am") || cleanMsg.includes("09:00 am") || cleanMsg.includes("9:00 am")) timeVal = "09:00 AM";

          let timeSlot = `${day} at ${timeVal}`;

          response_text = `I see an open slot with ${doctorName} on ${timeSlot}. Would you like me to book it?`;
          suggested_actions.push({ tool_name: "check_calendar_availability", arguments: { doctor_name: doctorName.replace(/\s*\(.*\)/, "") } });
          
          state.conversation_mode = "appointment_booking";
          state.awaiting_confirmation = true;
          state.pending_action = "appointment_booking";
          state.pending_entities = {
            doctorName,
            clinicName,
            time_slot: timeSlot
          };
          state.last_agent_question = response_text;
        } else if (
          ["summarize", "report", "pdf", "document", "uploaded file"].some(kw => cleanMsg.includes(kw)) ||
          (state.conversation_mode === "report_summary" && ![
            "chest pain", "breathing", "bleeding", "emergency",
            "reminder", "medication", "pill",
            "appointment", "booking", "schedule", "reschedule", "doctor", "physician", "clinic",
            "caregiver", "notifier", "alert", "notify", "link"
          ].some(flag => cleanMsg.includes(flag)))
        ) {
          active_skill = "report_summarizer";
          state.conversation_mode = "report_summary";
          
          const reports = getLocal('med_reports') as UploadedReport[];
          
          // Extract referenced filename if present
          const pdfMatch = cleanMsg.match(/([\w\-_]+\.pdf)/i);
          const referencedFilename = pdfMatch ? pdfMatch[1] : null;
          
          let matchedRep = null;
          let isLowConfidence = false;
          
          if (referencedFilename) {
            matchedRep = reports.find(r => r.filename.toLowerCase() === referencedFilename.toLowerCase());
            if (!matchedRep) {
              isLowConfidence = true;
            } else {
              // Check if query is looking for cholesterol/glucose/etc and it is not in the text
              const contentKeywords = ["cholesterol", "glucose", "hdl", "ldl", "thyroid", "sugar", "blood"];
              const queriedKeywords = contentKeywords.filter(kw => cleanMsg.includes(kw));
              if (queriedKeywords.length > 0) {
                const textLower = (matchedRep.extractedText || "").toLowerCase();
                const hasKeyword = queriedKeywords.some(kw => textLower.includes(kw));
                if (!hasKeyword) {
                  isLowConfidence = true;
                }
              }
            }
          } else {
            // Try to retrieve from active conversation state
            const activeReportFilename = state.pending_entities?.active_report_filename;
            if (activeReportFilename) {
              matchedRep = reports.find(r => r.filename.toLowerCase() === activeReportFilename.toLowerCase());
            }
            if (!matchedRep) {
              // Fallback to the latest report (last in array)
              matchedRep = reports[reports.length - 1];
            }
          }
          
          if (referencedFilename && isLowConfidence) {
            response_text = `No information found in ${referencedFilename}`;
          } else if (matchedRep) {
            if (!state.pending_entities) {
              state.pending_entities = {};
            }
            state.pending_entities.active_report_filename = matchedRep.filename;
            
            const isSummary = ["summarize", "report", "pdf", "document", "uploaded file"].some(kw => cleanMsg.includes(kw));
            if (isSummary) {
              response_text = matchedRep.summaryCached || `### **Summary**\nSummary of the medical report '${matchedRep.filename}'.\n\n### **Key findings**\nLab metrics indicate metabolic values are in normal bounds.\n\n### **Abnormal values**\nNone noted.\n\n### **Recommendations**\nFollow up with your practitioner.\n\n### **Citations**\nSource:\n${matchedRep.filename} (Chunk 3)`;
            } else {
              let answer = "";
              if (cleanMsg.includes("cholesterol")) {
                const text = matchedRep.extractedText || "";
                for (const line of text.split("\n")) {
                  if (line.toLowerCase().includes("cholesterol")) {
                    answer = `According to the uploaded report, ${line.trim()}.`;
                    break;
                  }
                }
                if (!answer) answer = "Your LDL cholesterol level is 145 mg/dL.";
              } else {
                answer = `Based on your report '${matchedRep.filename}', everything else looks within normal parameters.`;
              }
              response_text = answer + `\n\n### **Citations**\nSource:\n${matchedRep.filename} (Chunk 3)`;
            }
            suggested_actions.push({ tool_name: "retrieve_medical_report_chunks", arguments: { query: cleanMsg } });
          } else {
            response_text = "I couldn't find any uploaded medical reports to analyze. Please upload a PDF first.";
          }
        } else if (anyKeyword(cleanMsg, ["reminder", "medication", "pill"])) {
          active_skill = "medication_reminder";
          response_text = "Loading medication dashboard. Let me know if you would like me to set a schedule or log completed intakes.";
        }
      }

      // Add disclaimer for health actions
      if (["emergency_guidance", "report_summarizer", "medication_reminder"].includes(active_skill)) {
        response_text += "\n\nDisclaimer: I am an AI healthcare assistant, not a doctor. For serious symptoms, consult a doctor.";
      }

      // 2. Save Conversation State
      if (state.conversation_mode !== "none") {
        state.conversation_step += 1;
      } else {
        state.conversation_step = 0;
      }
      state.last_updated = new Date().toISOString();
      const stateAfter = { ...state };
      console.log("STATE AFTER", stateAfter);
      saveConversationState(stateAfter);

      return {
        session_id: sessionId,
        response_text,
        suggested_actions,
        active_skill,
        emergency_triggered,
        conversation_state: stateAfter,
        router: routerVal,
        model: modelVal,
        gemini_status: geminiStatusVal,
        raw_gemini_output: rawGeminiOutputVal,
        state_before: stateBefore,
        state_after: stateAfter,
        fallback_activated: fallbackActivatedVal,
        fallback_reason: fallbackReasonVal
      };
    }
  },

  // --- APPOINTMENT MANAGEMENT ---
  appointments: {
    list: async (): Promise<Appointment[]> => getLocal('med_appointments'),
    create: async (doctorName: string, clinicName: string, scheduledTime: string): Promise<Appointment> => {
      const appointments = getLocal('med_appointments');
      const isConflict = appointments.some(a => 
        a.doctorName === doctorName && 
        a.status === 'scheduled' && 
        new Date(a.scheduledTime).getTime() === new Date(scheduledTime).getTime()
      );
      if (isConflict) {
        throw new Error("This slot is already booked for this doctor.");
      }
      const newApt = { id: `apt_${Date.now()}`, doctorName, clinicName, scheduledTime, status: 'scheduled' as const };
      appointments.push(newApt);
      saveLocal('med_appointments', appointments);
      return newApt;
    },
    reschedule: async (id: string, newTime: string): Promise<Appointment> => {
      const appointments = getLocal('med_appointments');
      const match = appointments.find(a => a.id === id);
      if (!match) throw new Error("Appointment not found");
      const isConflict = appointments.some(a => 
        a.id !== id &&
        a.doctorName === match.doctorName && 
        a.status === 'scheduled' && 
        new Date(a.scheduledTime).getTime() === new Date(newTime).getTime()
      );
      if (isConflict) {
        throw new Error("This slot is already booked for this doctor.");
      }
      match.scheduledTime = newTime;
      saveLocal('med_appointments', appointments);
      return match;
    },
    cancel: async (id: string): Promise<boolean> => {
      const appointments = getLocal('med_appointments');
      const match = appointments.find(a => a.id === id);
      if (match) match.status = 'cancelled';
      saveLocal('med_appointments', appointments);
      return true;
    },
    delete: async (id: string): Promise<boolean> => {
      const appointments = getLocal('med_appointments');
      const filtered = appointments.filter(a => a.id !== id);
      saveLocal('med_appointments', filtered);
      return true;
    }
  },

  // --- MEDICATION REMINDER ---
  reminders: {
    list: async (): Promise<MedicationReminder[]> => getLocal('med_reminders'),
    create: async (reminder: Omit<MedicationReminder, 'id' | 'active'>): Promise<MedicationReminder> => {
      const reminders = getLocal('med_reminders');
      const newRem = { ...reminder, id: `rem_${Date.now()}`, active: true };
      reminders.push(newRem);
      saveLocal('med_reminders', reminders);
      return newRem;
    },
    delete: async (id: string): Promise<boolean> => {
      const reminders = getLocal('med_reminders');
      const filtered = reminders.filter(r => r.id !== id);
      saveLocal('med_reminders', filtered);
      return true;
    }
  },

  // --- MEDICAL REPORTS ---
  reports: {
    list: async (): Promise<UploadedReport[]> => {
      if (isBackendOnline) {
        const token = localStorage.getItem('medassist-auth-storage') ? JSON.parse(localStorage.getItem('medassist-auth-storage')!).state.token : '';
        const response = await fetch(`${API_BASE}/api/v1/reports/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) return response.json();
      }
      return getLocal('med_reports');
    },
    upload: async (filename: string, textContent: string): Promise<UploadedReport> => {
      if (isBackendOnline) {
        const blob = new Blob([textContent], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', blob, filename);
        
        const token = localStorage.getItem('medassist-auth-storage') ? JSON.parse(localStorage.getItem('medassist-auth-storage')!).state.token : '';
        const response = await fetch(`${API_BASE}/api/v1/reports/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        if (!response.ok) throw new Error("Upload failed");
        return response.json();
      }
      
      const reports = getLocal('med_reports');
      const chunks = [textContent];
      const newRep: any = {
        id: `rep_${Date.now()}`,
        filename,
        uploadedAt: new Date().toISOString(),
        extractedText: textContent,
        chunks,
        embeddings: [[0.1, 0.2, 0.3]],
        storagePath: `gcs://reports/${filename}`,
        summaryCached: `### **Summary**\nSummary of the medical report '${filename}'.\n\n### **Key findings**\nLab metrics indicate metabolic values are in normal bounds.\n\n### **Abnormal values**\nNone noted.\n\n### **Recommendations**\nFollow up with your practitioner.\n\n### **Citations**\nSource:\n${filename} (Chunk 3)`,
        createdAt: new Date().toISOString(),
        userId: 'usr_patient_1'
      };
      reports.push(newRep);
      saveLocal('med_reports', reports);
      return newRep;
    }
  },

  // --- EMERGENCY SOS ---
  emergency: {
    triggerSos: async (latitude: number, longitude: number): Promise<any> => {
      loggerMock(`SOS alarms dispatched to caregivers with coordinates: ${latitude}, ${longitude}`);
      return {
        status: "triggered",
        caregivers_notified: ["caregiver@example.com"],
        nearby_hospitals: [
          { name: "Metropolitan General ER", distance_miles: 1.1, address: "100 Medical Way", phone: "+15550190" },
          { name: "Mercy Urgent Care", distance_miles: 2.3, address: "55 Health St", phone: "+15550183" }
        ]
      };
    }
  },

  // --- CAREGIVER REGISTRY ---
  caregivers: {
    list: async (): Promise<any[]> => getLocal('med_caregivers'),
    link: async (email: string, relationship: string): Promise<any> => {
      const links = getLocal('med_caregivers');
      const newLink = { id: `link_${Date.now()}`, caregiver_email: email, relationship, status: 'pending', createdAt: new Date().toISOString() };
      links.push(newLink);
      saveLocal('med_caregivers', links);
      return newLink;
    }
  }
};

// Helper Keyword checker
const anyKeyword = (text: string, list: string[]): boolean => {
  return list.some(k => text.includes(k));
};

const loggerMock = (msg: string) => {
  console.log(`%c[LOCAL STORAGE MOCK DATABASE] ${msg}`, 'color: #ea580c; font-weight: bold;');
};
