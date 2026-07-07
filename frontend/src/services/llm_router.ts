import { ConversationState } from './api';
import { ChatMessage } from '../types';

export interface LLMRouterResponse {
  intent: "appointment_booking" | "medication_reminder" | "report_summary" | "emergency_guidance" | "caregiver_notification" | "general_question" | "unknown";
  is_continuation: boolean;
  next_action: "check_calendar" | "create_appointment" | "modify_appointment" | "cancel_appointment" | "find_another_doctor" | "reschedule_appointment" | "ask_clarification" | "emergency_escalation" | "none";
  updated_entities: {
    time?: string;
    date?: string;
    doctorName?: string;
    clinicName?: string;
    appointment_id?: string;
    [key: string]: any;
  } | null;
  reasoning: string;
}

export const queryGeminiRouter = async (
  message: string,
  state: ConversationState,
  history: ChatMessage[]
): Promise<LLMRouterResponse> => {
  const apiKeyEnv = import.meta.env.VITE_GEMINI_API_KEY;
  console.log("Gemini Key Loaded:", !!apiKeyEnv);
  const apiKey = apiKeyEnv || localStorage.getItem('med_gemini_api_key');
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    throw new Error("API key missing");
  }

  const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // Build simple chat history logs for Gemini context
  const historyLogs = history.slice(-8).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    content: m.content
  }));

  const systemInstruction = `You are MedAssist AI, a healthcare concierge agent.
Your responsibilities:
1. Detect user intent.
2. Determine whether the message is a continuation.
3. Extract entities.
4. Determine the next action.
5. Update the conversation state.

You MUST respond with a valid JSON object matching this schema (do NOT wrap it in markdown block tags like \`\`\`json):
{
  "intent": "appointment_booking" | "medication_reminder" | "report_summary" | "emergency_guidance" | "caregiver_notification" | "general_question" | "unknown",
  "is_continuation": boolean,
  "next_action": "check_calendar" | "create_appointment" | "modify_appointment" | "cancel_appointment" | "find_another_doctor" | "reschedule_appointment" | "ask_clarification" | "emergency_escalation" | "none",
  "updated_entities": {
    "time"?: string,
    "date"?: string,
    "doctorName"?: string,
    "clinicName"?: string,
    "appointment_id"?: string
  },
  "reasoning": string
}

Deterministic Guardrails (MUST BE STRICTLY ENFORCED):
1. NO DIAGNOSIS: If the user asks for diagnosis or symptoms of a condition, state that you cannot diagnose, recommend consulting a licensed healthcare provider, set intent to "general_question", next_action to "none".
2. NO PRESCRIPTIONS: If the user asks for prescriptions or medication recommendations, state that you cannot prescribe or recommend medications, recommend consulting a doctor, set intent to "general_question", next_action to "none".
3. EMERGENCY ESCALATION: If the user describes emergency symptoms (e.g. chest pain, breathing difficulty, severe bleeding), set intent to "emergency_guidance", next_action to "emergency_escalation".
4. PII MASKING: Ensure any reasoning or text does not expose sensitive personal credentials or raw tokens.
`;

  const prompt = `Current Conversation State:
${JSON.stringify(state, null, 2)}

Chat History:
${JSON.stringify(historyLogs, null, 2)}

Latest User Message:
"${message}"

Analyze and output routing JSON matching the schema.`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API failed with status ${response.status}: ${errText}`);
  }

  const resJson = await response.json();
  const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Empty response from Gemini.");
  }

  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned) as LLMRouterResponse;

  // Enforce strictly allowed values
  const validIntents = ["appointment_booking", "medication_reminder", "report_summary", "emergency_guidance", "caregiver_notification", "general_question", "unknown"];
  const validActions = ["check_calendar", "create_appointment", "modify_appointment", "cancel_appointment", "find_another_doctor", "reschedule_appointment", "ask_clarification", "emergency_escalation", "none"];

  if (!validIntents.includes(parsed.intent)) parsed.intent = "unknown";
  if (!validActions.includes(parsed.next_action)) parsed.next_action = "none";

  return parsed;
};
