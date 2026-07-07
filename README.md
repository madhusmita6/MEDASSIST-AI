# 🩺 MedAssist AI: The Agentic Healthcare Concierge

MedAssist AI is a secure, production-grade clinical assistant and healthcare concierge system designed to support patients, caregivers, and medical practitioners. Built using the **Google ADK (Agent Development Kit)**, **Gemini Models**, **ChromaDB RAG**, and **Model Context Protocol (MCP)** gateways, it coordinates scheduling, medication adherence, health panels, and emergency alarms via natural language.

---

## 🚀 Key Features

*   **Gemini Orchestrator**: Converts conversational chat turns into robust workflow actions (booking, rescheduling, pathology vector searches, and emergency vitals triage) with full dialog state persistence.
*   **Role-Based Dashboards**:
    *   **Patient Dashboard**: View personalized health insights, upcoming appointments, med reminders, recent reports, and trigger emergency SOS alarms (completely cleaned of technical system badges).
    *   **Caregiver Dashboard**: Select and monitor linked patients, compliance ratings, missed medications, critical alerts timelines, and email settings.
    *   **Doctor Dashboard**: Review patient lists with vital health scores and risk indicators, manage consultation scheduling approvals, and audit laboratory report PDFs.
    *   **Admin Dashboard**: Audit system metrics (e.g. SOS latency, active sessions), manage accounts registry, verify System Health status checks (API, ChromaDB, Gemini connection, guardrails logs), and view core system architecture badges.
*   **Dialogue Rescheduling Logic**: State machine preserves appointment IDs and metadata, performing in-place rescheduling instead of creating duplicates.
*   **Isolated Vector Search (RAG)**: Prevents cross-document citation leakage by scoping vector retrieval with file-specific metadata queries.
*   **Clinical Guardrails**: Intercepts diagnostics and prescription prompts, redirecting users to medical practitioners.

---

## 🔑 Demo Access Accounts

Use the **Demo Switcher** in the top header of the application to instantly hot-swap roles, or sign in using these default credentials:
*   **Patient Portal**: `patient@example.com` (John Doe)
*   **Caregiver Portal**: `caregiver@example.com` (Sarah Smith)
*   **Doctor Portal**: `doctor@example.com` (Dr. Adams)
*   **Admin Portal**: `admin@example.com` (Admin User)

---

## 🛠️ Quick Start & Setup

### 1. Backend Service (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend service in fallback mode
export DATABASE_URL="sqlite:///./test.db"
uvicorn app.main:app --reload --port 8080
```

### 2. Frontend Client (React + Vite + TypeScript)
```bash
# Navigate to frontend directory
cd frontend

# Install Node modules
npm install

# Start local dev server
npm run dev
```

### 3. Running Automated Tests
```bash
# Run pytest with SQLite database
export DATABASE_URL="sqlite:///./test.db"
.venv/Scripts/pytest
```

---

## 📂 Directory Structure

```text
medassist-ai/
├── .agents/                      # Workspace Agent Customizations
│   ├── AGENTS.md                 # Agent-specific rules and constraints
│   └── skills/                   # Domain-specific Agent Skills
│       ├── appointment_management/
│       │   └── SKILL.md          # Skill for booking, listing, and rescheduling
│       ├── medication_reminder/
│       │   └── SKILL.md          # Skill for configuring medication compliance
│       ├── medical_summarization/
│       │   └── SKILL.md          # Skill for uploading and summarising medical reports
│       ├── facility_locator/
│       │   └── SKILL.md          # Skill for looking up nearby hospitals/clinics via MCP
│       ├── emergency_handler/
│       │   └── SKILL.md          # Skill for triaging, guidance, and caregiver escalation
│       └── caregiver_alert/
│           └── SKILL.md          # Skill for managing alert preferences
├── specs/                        # Design Specifications
│   ├── architecture.md           # System Architecture & Diagrams
│   ├── api_specification.md      # FastAPI Endpoint Schemas
│   └── database_schema.md        # PostgreSQL Schema & ChromaDB Vector Layout
├── backend/                      # FastAPI Backend Application
│   ├── app/                      # Main Python application packages
│   │   ├── services/
│   │   │   ├── llm_service.py    # LLM integration service
│   │   │   └── rag_service.py    # ChromaDB integration service
│   │   └── main.py
│   ├── tests/                    # Backend test suites
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                     # React Frontend Application (Vite + TS)
│   ├── src/                      # UI components, pages, stores
│   │   ├── components/
│   │   │   └── Layout.tsx        # Role-based Layout and Switcher
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx     # Patient Dashboard page
│   │   │   ├── CaregiverDashboard.tsx
│   │   │   ├── DoctorDashboard.tsx
│   │   │   └── AdminDashboard.tsx
│   │   ├── stores/
│   │   │   └── authStore.ts      # Zustand role persistence
│   │   └── App.tsx               # Main Router
│   ├── Dockerfile
│   └── package.json
└── README.md                     # Project documentation
```
