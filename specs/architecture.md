# Architecture Specification: MedAssist AI (Revised)

This document details the high-level architecture, container relations, data flows, and Cloud Run deployment mapping for the MedAssist AI application incorporating the Calendar, Gmail, and Maps MCP servers.

## 1. System Context & Container Diagram

The diagram below shows the containerized boundaries of the application and the interaction between the user interface, backend server, orchestrator, external MCP services, and persistence layers.

```mermaid
graph TD
    %% Styling
    classDef primary fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef secondary fill:#f1f8e9,stroke:#558b2f,stroke-width:2px;
    classDef storage fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
    classDef agent fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px;

    User[("Patient / Caregiver\n(Web Browser & Email)")]:::primary
    
    subgraph Frontend_App ["Frontend (React SPA)"]
        UI["React SPA\n(Vite + TS + TailwindCSS)"]:::primary
        State["State Management\n(Context/Query)"]:::primary
    end

    subgraph Backend_App ["Backend (FastAPI Container)"]
        API["FastAPI App\n(Endpoints, Auth, Middleware)"]:::secondary
        ADK["Google ADK Orchestrator\n(Agent Router)"]:::agent
        Skills["Agent Skills Layer\n(Context Prompts & Local Logic)"]:::agent
        NotifySvc["Abstract Notification Service\n(BaseNotificationService)"]:::secondary
        GmailNotify["Gmail SMTP Provider\n(Concrete Implementation)"]:::secondary
    end

    subgraph MCP_Layer ["Model Context Protocol (MCP)"]
        CalendarMCP["Calendar MCP Server\n(Google Calendar API Integration)"]:::agent
        GmailMCP["Gmail MCP Server\n(Google Mail API Integration)"]:::agent
        MapsMCP["Maps MCP Server\n(Google Maps Places & Geocoding)"]:::agent
    end

    subgraph Storage_Layer ["Data & Vector Storage"]
        Postgres[("PostgreSQL\n(Transactional DB)")]:::storage
        Chroma[("ChromaDB\n(Vector DB for RAG)")]:::storage
    end

    subgraph External_APIs ["External Google APIs"]
        GoogleCalendarAPI["Google Calendar API"]:::secondary
        GoogleGmailAPI["Google Gmail API"]:::secondary
        GoogleMapsAPI["Google Maps API"]:::secondary
    end

    %% Flows
    User -->|HTTPS| UI
    UI -->|API Requests| API
    API -->|Route to Agent| ADK
    ADK -->|Evaluate Skills| Skills
    
    %% MCP Integrations
    ADK -->|Fetch Tools| CalendarMCP
    ADK -->|Draft/Send Emails| GmailMCP
    ADK -->|Search Locations| MapsMCP
    
    %% Storage Connections
    API -->|Read/Write User/Reminders| Postgres
    API -->|Chunk/Query Reports| Chroma
    
    %% MCP to External Services
    CalendarMCP -->|OAuth API Call| GoogleCalendarAPI
    GmailMCP -->|OAuth API Call| GoogleGmailAPI
    MapsMCP -->|Geocoding / Places| GoogleMapsAPI
    
    %% Alerts
    API -->|Dispatch Alert| NotifySvc
    NotifySvc -->|Load Concrete| GmailNotify
    GmailNotify -->|SMTP / SMTP SSL| User
```

## 2. Component Design & Responsibilities

### Frontend (React + TypeScript + TailwindCSS)
- **Role**: Responsive and accessible dashboard for managing healthcare reminders, chats with the agent, uploading documents, and setting caregiver alerts.
- **Styling**: Utilizes TailwindCSS utility framework to construct a high-fidelity, accessible interface.
- **Key Modules**:
  - `ChatWidget`: Real-time streaming interface for patient interactions.
  - `MedicationSchedule`: Calendar visualization showing past intake compliance and upcoming reminders.
  - `EmergencySOSButton`: Immediate visual trigger for alerting caregivers and displaying nearby hospitals.

### Backend (FastAPI)
- **Role**: Exposes secure API endpoints, handles file uploads (summarization RAG pipeline), manages token-based authentication, and coordinates the Google ADK lifecycle.
- **Notification Abstraction**:
  - Exposes an abstract base class `BaseNotificationService`.
  - Exposes `GmailNotificationService` concrete class implementation for the hackathon version.
  - Allows easy drop-in of custom SMS services (e.g. Twilio) later without modifying core alert logic.

### MCP Server Layer
- **Role**: Standardized tool-calling interface for LLMs using the Model Context Protocol.
- **Servers**:
  - `Calendar MCP`: Interfaces with Google Calendar endpoints to schedule doctor appointments directly into calendars.
  - `Gmail MCP`: Enables the agent to query emails or draft follow-up templates directly to medical personnel or caregivers.
  - `Maps MCP`: Interfaces with Google Maps Places and Geocoding APIs to fetch real-world clinic distances.

### Persistence Layer
- **PostgreSQL**: Stores relational structures: users, user-caregiver relations, medication schedules, intake compliance records, and scheduled appointments.
- **ChromaDB**: In-memory or persistent vector database to index parsed medical reports. Standard text embedding models (e.g., Google Vertex AI or OpenAI embeddings) are used to map text chunks.

---

## 3. Cloud Run Deployment Architecture

The production environment maps container instances onto Google Cloud Run, utilizing serverless scalability and secure secrets management.

```mermaid
graph LR
    subgraph Google_Cloud_Platform ["Google Cloud Platform (GCP)"]
        LB["Cloud Load Balancer\n(HTTPS Entry)"]
        
        subgraph Cloud_Run_Services ["Cloud Run"]
            FrontendSvc["Frontend Service\n(Static Assets/SPA Container)"]
            BackendSvc["Backend API Service\n(FastAPI Container)"]
            MCPSvc["MCP Integration Service\n(Calendar/Gmail/Maps Container)"]
        end
        
        subgraph Cloud_Run_Jobs ["Async & Jobs"]
            ReminderJob["Reminder Cron Job\n(Dispatched hourly)"]
        end

        Scheduler["Cloud Scheduler"]
        PubSub["Cloud Pub/Sub"]
        
        subgraph Database_Management ["Managed Databases"]
            CloudSQL[("Cloud SQL\n(PostgreSQL)")]
            AlloyDB[("AlloyDB / ChromaDB Instance\n(Vector Storage)")]
        end

        VPC["Serverless VPC Connector"]
        SecretManager["GCP Secret Manager"]
    end

    %% Routing
    LB -->|| FrontendSvc
    LB -->|/api/*| BackendSvc
    BackendSvc -->|Internal HTTP| MCPSvc
    
    %% Jobs & PubSub
    Scheduler -->|Trigger| ReminderJob
    BackendSvc -->|Publish Event| PubSub
    PubSub -->|Trigger Alert| BackendSvc
    
    %% VPC networking
    BackendSvc --> VPC
    ReminderJob --> VPC
    VPC --> CloudSQL
    VPC --> AlloyDB
    
    %% Security
    SecretManager -.->|Injects DB/API Secrets| BackendSvc
```
