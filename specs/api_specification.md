# API Specification: MedAssist AI Backend (Revised)

The backend is built with FastAPI, utilizing asynchronous request handling, Pydantic schemas, and routers grouping functional resources.

## 1. Directory Layout

```text
backend/app/
├── main.py                   # FastAPI application initialization
├── core/
│   ├── config.py             # Environment configuration (Pydantic BaseSettings)
│   ├── security.py           # JWT encryption, hashing, and token validation
│   └── database.py           # PostgreSQL (SQLAlchemy) connection manager
├── api/
│   ├── v1/
│   │   ├── auth.py           # Authentication routes
│   │   ├── chat.py           # Agent interaction and streaming routes
│   │   ├── appointments.py   # Scheduling routes
│   │   ├── medications.py    # Medication logger and reminders
│   │   ├── reports.py        # PDF summarization and file upload pipeline
│   │   └── emergency.py      # SOS trigger and caregiver notifier
│   └── deps.py               # Dependency injection utilities (get_db, get_current_user)
├── services/
│   ├── agent_orchestrator.py # Google ADK configuration and execution manager
│   ├── rag_service.py        # ChromaDB interaction, document chunking, and embeddings
│   └── notification/         # Abstract Notification services
│       ├── base.py           # BaseNotificationService class
│       └── gmail.py          # GmailNotificationService concrete class (SMTP-based)
├── models/                   # SQLAlchemy ORM models
│   ├── user.py
│   ├── appointment.py
│   ├── medication.py
│   └── caregiver.py
└── schemas/                  # Pydantic schemas for payload validation
    ├── auth.py
    ├── chat.py
    ├── appointment.py
    ├── medication.py
    └── report.py
```

---

## 2. API Endpoint Protocols

All APIs return JSON payloads and use standard HTTP status codes:
- `200 OK`: Successful fetch or action.
- `211 Created`: Resource successfully written.
- `400 Bad Request`: Validation failure or semantic issue.
- `401 Unauthorized`: Missing or expired Bearer token.
- `403 Forbidden`: Insufficient permissions (e.g., patient trying to access another's record).
- `404 Not Found`: Target resource missing.
- `500 Internal Server Error`: Backend crash.

---

## 3. Endpoints Listing

### Authentication
#### Register User
- **Endpoint**: `POST /api/v1/auth/register`
- **Request Body**:
  ```json
  {
    "email": "patient@example.com",
    "password": "strongpassword123",
    "full_name": "John Doe",
    "role": "patient" 
  }
  ```
  *(Role can be either `patient` or `caregiver`)*
- **Response (211 Created)**:
  ```json
  {
    "id": "usr_9018402",
    "email": "patient@example.com",
    "full_name": "John Doe",
    "role": "patient",
    "created_at": "2026-06-23T09:50:00Z"
  }
  ```

#### Login / Token Generation
- **Endpoint**: `POST /api/v1/auth/login`
- **Request Body (URL Encoded / Form Data)**:
  ```text
  username=patient@example.com&password=strongpassword123
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer"
  }
  ```

---

### Agent Chat
#### Send Message to Agent
- **Endpoint**: `POST /api/v1/chat/message`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "message": "Can you book an appointment with Dr. Smith for next Tuesday morning?",
    "stream": false
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "session_id": "sess_810948",
    "agent_response": "I can check Dr. Smith's availability via the Calendar MCP. I see an open slot on Tuesday, June 30 at 9:00 AM. Would you like me to book it?",
    "suggested_actions": [
      {
        "type": "book_appointment",
        "params": {
          "doctor_name": "Dr. Smith",
          "time": "2026-06-30T09:00:00Z"
        }
      }
    ]
  }
  ```

---

### Appointments
#### List Scheduled Appointments
- **Endpoint**: `GET /api/v1/appointments`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "apt_309204",
      "doctor_name": "Dr. Smith",
      "clinic_name": "City Health Center",
      "scheduled_time": "2026-06-30T09:00:00Z",
      "status": "scheduled"
    }
  ]
  ```

#### Book Appointment
- **Endpoint**: `POST /api/v1/appointments`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "doctor_name": "Dr. Smith",
    "clinic_name": "City Health Center",
    "scheduled_time": "2026-06-30T09:00:00Z"
  }
  ```
- **Response (211 Created)**:
  ```json
  {
    "id": "apt_309204",
    "doctor_name": "Dr. Smith",
    "clinic_name": "City Health Center",
    "scheduled_time": "2026-06-30T09:00:00Z",
    "status": "scheduled"
  }
  ```

---

### Medication Reminders
#### List & Set Reminders
- **Endpoint**: `GET /api/v1/medications` / `POST /api/v1/medications`
- **Headers**: `Authorization: Bearer <token>`
- **Post Body**:
  ```json
  {
    "medication_name": "Lisinopril",
    "dosage": "10mg",
    "frequency": "daily",
    "scheduled_times": ["08:00:00"],
    "caregiver_escalation_window_mins": 30
  }
  ```

#### Log Intake Compliance
- **Endpoint**: `POST /api/v1/medications/{med_id}/log`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "logged_time": "2026-06-23T08:15:00Z",
    "status": "taken" 
  }
  ```
  *(Status choices: `taken`, `skipped`, `missed`)*

---

### Medical Reports (RAG Pipeline)
#### Upload PDF Report
- **Endpoint**: `POST /api/v1/reports/upload`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: `Multipart/form-data` containing `file`
- **Response (211 Created)**:
  ```json
  {
    "report_id": "rep_781903",
    "filename": "blood_panel_june.pdf",
    "status": "processing",
    "message": "File uploaded successfully. Document chunking and embedding generation in progress."
  }
  ```

#### Retrieve Summarized Analysis
- **Endpoint**: `GET /api/v1/reports/{report_id}/summary`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "report_id": "rep_781903",
    "summary": "The blood panel results show normal range for glucose and thyroid panel. However, LDL cholesterol is slightly elevated at 145 mg/dL.",
    "key_metrics": [
      { "name": "LDL Cholesterol", "value": "145 mg/dL", "status": "high" }
    ],
    "recommendations": [
      "Consult physician regarding cholesterol levels.",
      "Check back on compliance details with medication."
    ]
  }
  ```

---

### Emergency Services & Caregivers
#### Trigger SOS Emergency
- **Endpoint**: `POST /api/v1/emergency/sos`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "triggered",
    "caregivers_notified": ["caregiver@example.com"],
    "nearby_hospitals": [
      {
        "name": "General Hospital Emergency Room",
        "distance_miles": 1.2,
        "address": "100 Medical Plaza, SF",
        "phone": "+15550183049"
      }
    ]
  }
  ```
