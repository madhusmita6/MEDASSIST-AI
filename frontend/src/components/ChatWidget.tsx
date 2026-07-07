import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, AlertCircle, Bot, User, FileText, ChevronDown, Sparkles } from 'lucide-react';
import { ChatMessage, Citation } from '../types';
import { apiService } from '../services/api';
import DemoScenarios from './DemoScenarios';

interface ChatWidgetProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export default function ChatWidget({ onSuccessToast, onErrorToast }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: 'Hello! I am your MedAssist AI concierge. I can help book appointments, summarize reports, set medication reminders, or provide emergency guidance. What can I do for you today?', 
      timestamp: new Date().toISOString() 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolIndicator, setToolIndicator] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, toolIndicator]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    try {
      // Simulate intent analysis tools
      setToolIndicator("Analyzing intent with Vertex AI...");
      await delay(1000);
      
      const response = await apiService.chat.sendMessage("sess_client_1", "usr_patient_1", text, messages);
      
      // Update tool indicators based on mock action returns
      if (response.suggested_actions.length > 0) {
        const action = response.suggested_actions[0];
        if (action.tool_name === "check_calendar_availability") {
          setToolIndicator("Accessing Calendar MCP server to fetch open slots...");
        } else if (action.tool_name === "book_calendar_event") {
          setToolIndicator("Writing event to Google Calendar via Calendar MCP...");
        } else if (action.tool_name === "update_calendar_event") {
          setToolIndicator("Updating event in Google Calendar via Calendar MCP...");
        } else if (action.tool_name === "retrieve_medical_report_chunks") {
          setToolIndicator("Executing ChromaDB query to fetch report segments...");
        } else if (action.tool_name === "send_caregiver_alert_email") {
          setToolIndicator("Calling Gmail MCP to notify caregiver...");
        }
        await delay(1200);
      }
      
      // Parse mock citations for cholesterols
      let citations: Citation[] = [];
      let thinkingData: ChatMessage['thinking'] = {
        intent: "General Inquiry",
        skill: "general_chat",
        tool: "None",
        mcp: "None",
        status: "Success",
        time: "0.6 seconds",
        safetyChecks: "PII Masking applied"
      };

      if (response.active_skill === "report_summarizer" && !response.response_text.includes("No information found in")) {
        let resolvedFilename = "metabolic_panel_june.pdf";
        const pdfMatch = text.match(/([\w\-_]+\.pdf)/i);
        if (pdfMatch) {
          resolvedFilename = pdfMatch[1];
        } else {
          for (let i = messages.length - 1; i >= 0; i--) {
            const histMatch = messages[i].content.match(/([\w\-_]+\.pdf)/i);
            if (histMatch) {
              resolvedFilename = histMatch[1];
              break;
            }
          }
        }
        citations = [{
          text: "LDL cholesterol is elevated at 145 mg/dL. Reference limit is <100 mg/dL.",
          source: resolvedFilename,
          chunkIndex: 3,
          distance: 0.12
        }];
        thinkingData = {
          intent: "Report Query",
          skill: "report_summarizer",
          tool: "retrieve_medical_report_chunks",
          mcp: "ChromaDB RAG Vector Store",
          status: "Found matches (92% confidence)",
          time: "1.4 seconds",
          safetyChecks: "User Isolation Verified, Disclaimer Appended"
        };
      } else if (response.active_skill === "emergency_guidance") {
        thinkingData = {
          intent: "Emergency guidance / SOS",
          skill: "emergency_guidance",
          tool: "search_nearby_clinics, send_caregiver_alert_email",
          mcp: "Maps MCP, Gmail MCP",
          status: "CRITICAL symptoms triaged",
          time: "1.1 seconds",
          safetyChecks: "Direct SOS escalation, Gmail trigger approved"
        };
      } else if (response.active_skill === "appointment_booking") {
        const isConfirming = response.suggested_actions.some(a => a.tool_name === "book_calendar_event" || a.tool_name === "update_calendar_event");
        const isUpdate = response.suggested_actions.some(a => a.tool_name === "update_calendar_event");
        thinkingData = {
          intent: isConfirming ? (isUpdate ? "Confirm Reschedule Appointment" : "Confirm Appointment Booking") : "Appointment Booking",
          skill: "appointment_booking",
          tool: isConfirming ? (isUpdate ? "update_calendar_event" : "book_calendar_event") : "check_calendar_availability",
          mcp: "Calendar MCP (Google Calendar)",
          status: "Success",
          time: isConfirming ? "1.2 seconds" : "0.9 seconds",
          safetyChecks: "Tool allowlist validated"
        };
      } else if (response.active_skill === "medication_reminder") {
        thinkingData = {
          intent: "Medication Reminder configuration",
          skill: "medication_reminder",
          tool: "db_write_reminder",
          mcp: "PostgreSQL Database",
          status: "Success",
          time: "0.5 seconds",
          safetyChecks: "Disclaimer appended"
        };
      }

      if (response.conversation_state) {
        thinkingData.conversationState = response.conversation_state;
      }
      if (response.gemini_reasoning) {
        thinkingData.geminiReasoning = response.gemini_reasoning;
      }
      thinkingData.router = response.router;
      thinkingData.model = response.model;
      thinkingData.geminiStatus = response.gemini_status;
      thinkingData.rawGeminiOutput = response.raw_gemini_output;
      thinkingData.stateBefore = response.state_before;
      thinkingData.stateAfter = response.state_after;
      thinkingData.fallbackActivated = response.fallback_activated;
      thinkingData.fallbackReason = response.fallback_reason;

      setToolIndicator(null);
      
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_res`,
        role: 'assistant',
        content: response.response_text,
        timestamp: new Date().toISOString(),
        citations: citations.length > 0 ? citations : undefined,
        thinking: thinkingData
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
      if (response.emergency_triggered) {
        onSuccessToast("SOS Emergency Alarm Broadcasted!");
      }
    } catch (e) {
      setToolIndicator(null);
      onErrorToast("Failed to reach agent core.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setToolIndicator(`Parsing PDF file: ${file.name}...`);
    
    try {
      await delay(1200);
      await apiService.reports.upload(file.name, "metabolic details");
      onSuccessToast(`Report '${file.name}' uploaded and indexed to ChromaDB!`);
      handleSend(`Summarize document '${file.name}'`);
    } catch (err) {
      onErrorToast("Failed to parse report file.");
    } finally {
      setLoading(false);
    }
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  return (
    <div className="flex flex-col h-[700px] glass-panel rounded-2xl overflow-hidden border border-slate-800">
      {/* Widget Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
          <Bot size={22} />
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-100">Healthcare Agent Chat</h3>
          <p className="text-xs text-indigo-400 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Online & Guardrails Guarded
          </p>
        </div>
      </div>

      {/* Messages Log Panel */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-slate-950/20">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-200 border shrink-0 ${
                isUser 
                  ? 'bg-slate-900 border-slate-800' 
                  : 'bg-indigo-600/15 border-indigo-500/25'
              }`}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : ''} min-w-0 flex-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  isUser 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-900/90 border border-slate-800 rounded-tl-none'
                }`}>
                  {msg.content.split('\n\nDisclaimer:').map((section, idx) => {
                    if (idx === 1) {
                      return (
                        <div key={idx} className="mt-3 p-3 bg-red-950/25 border border-red-900/35 rounded-xl text-xs text-red-300 flex gap-2">
                          <AlertCircle size={16} className="shrink-0 text-red-400" />
                          <span>Disclaimer: {section}</span>
                        </div>
                      );
                    }
                    return <p key={idx} className="whitespace-pre-line">{section}</p>;
                  })}
                </div>

                {/* Collapsible AI Thinking Panel */}
                {!isUser && msg.thinking && (
                  <details className="mt-2 text-xs border border-slate-800/80 bg-slate-950/45 rounded-xl overflow-hidden w-full">
                    <summary className="px-4 py-2.5 cursor-pointer font-bold text-slate-400 hover:text-slate-200 select-none flex items-center justify-between bg-slate-900/35">
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
                        <Sparkles size={12} className="text-indigo-400" />
                        AI Thinking Panel
                      </span>
                      <ChevronDown size={14} className="text-slate-500" />
                    </summary>
                    <div className="p-4 space-y-2 border-t border-slate-900/60 font-mono text-[10px] text-slate-400">
                      <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Intent:</span> <span className="text-slate-200 font-semibold">{msg.thinking.intent}</span></div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Active Skill:</span> <span className="text-indigo-400 font-semibold">{msg.thinking.skill}</span></div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Tool Invoked:</span> <span className="text-purple-400 font-semibold">{msg.thinking.tool}</span></div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">MCP Server:</span> <span className="text-blue-400 font-semibold">{msg.thinking.mcp}</span></div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Execution time:</span> <span className="text-slate-300">{msg.thinking.time}</span></div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Safety Checks:</span> <span className="text-rose-400 font-semibold">{msg.thinking.safetyChecks}</span></div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Status:</span> <span className="text-emerald-400 font-semibold">{msg.thinking.status}</span></div>
                      {msg.thinking.router && (
                        <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Router:</span> <span className="text-slate-200 font-semibold">{msg.thinking.router}</span></div>
                      )}
                      {msg.thinking.model && (
                        <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Model:</span> <span className="text-slate-200 font-semibold">{msg.thinking.model}</span></div>
                      )}
                      {msg.thinking.geminiStatus && (
                        <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Gemini Status:</span> <span className="text-slate-200 font-semibold">{msg.thinking.geminiStatus}</span></div>
                      )}
                      {msg.thinking.fallbackActivated !== undefined && (
                        <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Fallback Activated:</span> <span className={msg.thinking.fallbackActivated ? "text-amber-400 font-semibold" : "text-slate-300"}>{msg.thinking.fallbackActivated ? "true" : "false"}</span></div>
                      )}
                      {msg.thinking.fallbackReason && msg.thinking.fallbackReason !== "None" && (
                        <div className="flex justify-between border-b border-slate-900 pb-1.5"><span className="text-slate-500">Fallback Reason:</span> <span className="text-red-400 font-semibold">{msg.thinking.fallbackReason}</span></div>
                      )}
                      {msg.thinking.rawGeminiOutput && msg.thinking.rawGeminiOutput !== "None" && (
                        <div className="border-t border-slate-800/80 mt-2.5 pt-2.5 space-y-1 text-[9px] w-full">
                          <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">Gemini Output:</span>
                          <pre className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-40 font-mono">
                            {msg.thinking.rawGeminiOutput}
                          </pre>
                        </div>
                      )}
                      {msg.thinking.stateBefore && msg.thinking.stateAfter && (
                        <div className="border-t border-slate-800/80 mt-2.5 pt-2.5 space-y-1 text-[9px] w-full">
                          <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">Applied State Transition:</span>
                          <pre className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-40 font-mono">
                            {(() => {
                              const before = msg.thinking.stateBefore;
                              const after = msg.thinking.stateAfter;
                              const lines: string[] = [];
                              const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
                              for (const k of allKeys) {
                                if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
                                  const bVal = before[k] === undefined || before[k] === null ? "null" : JSON.stringify(before[k]);
                                  const aVal = after[k] === undefined || after[k] === null ? "null" : JSON.stringify(after[k]);
                                  lines.push(`${k}: ${bVal} ➔ ${aVal}`);
                                }
                              }
                              return lines.length > 0 ? lines.join("\n") : "No state changes";
                            })()}
                          </pre>
                        </div>
                      )}
                      {msg.thinking.stateBefore && (
                        <div className="border-t border-slate-800/80 mt-2.5 pt-2.5 space-y-1 text-[9px] w-full">
                          <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">State Before:</span>
                          <pre className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-40 font-mono">
                            {JSON.stringify(msg.thinking.stateBefore, null, 2)}
                          </pre>
                        </div>
                      )}
                      {msg.thinking.stateAfter && (
                        <div className="border-t border-slate-800/80 mt-2.5 pt-2.5 space-y-1 text-[9px] w-full">
                          <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">State After:</span>
                          <pre className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-40 font-mono">
                            {JSON.stringify(msg.thinking.stateAfter, null, 2)}
                          </pre>
                        </div>
                      )}
                      {msg.thinking.geminiReasoning && (
                        <div className="border-t border-slate-800/80 mt-2.5 pt-2.5 space-y-1 text-[9px] w-full">
                          <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">Gemini Router Reasoning:</span>
                          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 font-semibold leading-normal whitespace-pre-line">
                            {msg.thinking.geminiReasoning}
                          </div>
                        </div>
                      )}
                      {msg.thinking.conversationState && (
                        <div className="border-t border-slate-800/80 mt-2.5 pt-2.5 space-y-1.5 text-[9px] w-full">
                          <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">Conversation State:</span>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                            <span className="text-slate-500">Mode:</span> <span className="text-slate-300 font-semibold">{msg.thinking.conversationState.conversation_mode}</span>
                            <span className="text-slate-500">Awaiting Conf:</span> <span className="text-slate-300 font-semibold">{msg.thinking.conversationState.awaiting_confirmation ? "true" : "false"}</span>
                            <span className="text-slate-500">Pending Action:</span> <span className="text-slate-300 font-semibold">{msg.thinking.conversationState.pending_action || "null"}</span>
                            <span className="text-slate-500">Step:</span> <span className="text-slate-300 font-semibold">{msg.thinking.conversationState.conversation_step}</span>
                            <span className="text-slate-500">Last Updated:</span> <span className="text-slate-300 truncate font-semibold" title={msg.thinking.conversationState.last_updated}>{msg.thinking.conversationState.last_updated}</span>
                            {msg.thinking.conversationState.pending_entities && (
                              <>
                                <span className="text-slate-500 col-span-2 border-t border-slate-800/80 my-1"></span>
                                <span className="text-slate-500 col-span-2 block font-semibold text-indigo-400">Pending Entities:</span>
                                {Object.entries(msg.thinking.conversationState.pending_entities).map(([k, v]: [string, any]) => (
                                  <React.Fragment key={k}>
                                    <span className="text-slate-500 pl-1">{k}:</span>
                                    <span className="text-slate-300 truncate font-semibold" title={typeof v === 'object' ? JSON.stringify(v) : String(v)}>
                                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Citations block */}
                {!isUser && msg.citations && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {msg.citations.map((cit, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/60 border border-slate-800 text-slate-400 text-xs rounded-lg hover:border-indigo-500/30 transition-all cursor-pointer group">
                        <FileText size={12} className="text-slate-500 group-hover:text-indigo-400" />
                        <span>Source: <strong className="text-slate-300 font-medium">{cit.source}</strong> (Chunk {cit.chunkIndex})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loader tool logs */}
        {toolIndicator && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 animate-spin">
              🩺
            </div>
            <span className="text-xs text-slate-500 font-mono italic animate-pulse-soft">{toolIndicator}</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Demo Scenario populator buttons */}
      <div className="px-6 py-3 border-t border-slate-900 bg-slate-950/40">
        <DemoScenarios onSelectScenario={(text) => setInput(text)} />
      </div>

      {/* Input Bar */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        className="px-6 py-4 border-t border-slate-800 bg-slate-900/40 flex items-center gap-3"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept=".pdf,.txt"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          title="Upload Medical Report"
          disabled={loading}
        >
          <Upload size={18} />
        </button>
        
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask MedAssist (e.g. 'book appointment next Monday' or 'Summarize blood report')"
          className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
          disabled={loading}
        />
        
        <button
          type="submit"
          className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
