# 👁️ Campus-Eye
> **Autonomous Smart Campus Grievance Intelligence & Facilities Surveillance Command Center**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-campus--eyes--w82a.vercel.app-00df9a?style=for-the-badge&logo=vercel&logoColor=white)](https://campus-eyes-w82a.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-campus--eyes-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yashasgowdacr/campus-eyes)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?logo=postgresql&logoColor=white)
[![Vercel](https://img.shields.io/badge/Vercel-Live-000000?logo=vercel&logoColor=white)](https://campus-eyes-w82a.vercel.app/)
![Render](https://img.shields.io/badge/Render-Live-46E3B7?logo=render&logoColor=black)
![NLP](https://img.shields.io/badge/AI-Natural_NLP_Engine-8B5CF6)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🌐 Live Access & Demo Credentials

Access the live cloud deployment directly in your browser:  
👉 **[https://campus-eyes-w82a.vercel.app/](https://campus-eyes-w82a.vercel.app/)**

| Portal | Username | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **[Admin Command Center](https://campus-eyes-w82a.vercel.app/)** | `admin` | `admin` | Operations HUD, Heatmaps, Urgency Radar, SLA Escalations, AI Model Training |
| **[Student Portal](https://campus-eyes-w82a.vercel.app/)** | `student` | `student123` | Complaint Submission, Voice Input, Real-Time AI Suggestion, Profile Points |

*(New student accounts can also be created instantly via the Register tab).*

---

## 🏛️ System Architecture

Campus-Eye operates on a high-availability, zero-cost cloud architecture:

```mermaid
graph TD
    subgraph Client Layer
        A["🌐 Vercel SPA (React 18 + Vite)"]
    end

    subgraph API & Intelligence Layer
        B["⚡ Render Web Service (Node.js + Express)"]
        C["🧠 Local NLP Engine (Naive Bayes + Stemmer)"]
        D["⏱️ Autonomous SLA Cron Worker"]
        B <--> C
        B <--> D
    end

    subgraph Data Layer
        E[("🐘 Neon DB (Serverless PostgreSQL)")]
        F[("🐬 Local MySQL (Development Fallback)")]
        B <--> E
        B -.-> F
    end

    A -- "HTTPS / REST API" --> B
```

- **Frontend (Vercel):** Single-page application built with React 18, Vite, Lucide Icons, and Recharts.
- **Backend (Render):** Express API providing complaint triage, live timeline auditing, and continual NLP training.
- **AI Intelligence ($0 Cost):** Offline statistical NLP classifier (Multinomial Naive Bayes + Porter Stemmer) running in-memory with < 50MB RAM footprint.
- **Database (Neon DB / PostgreSQL):** Dual-engine connection pool supporting cloud serverless PostgreSQL with automatic schema migration and fallback to local MySQL.

---

## 🔄 Workflow Steps Taken to Build Campus-Eye

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as Student Portal
    participant API as Express API
    participant NLP as Natural NLP Engine
    participant DB as Neon Database
    participant Cron as SLA Background Worker
    actor Admin as Facilities Admin

    Student->>UI: Types complaint description (or uses voice-to-text)
    UI->>NLP: Real-time debounced analysis
    NLP-->>UI: Live category, priority score & explanation preview
    Student->>UI: Submits ticket with location (Block/Floor/Room) & photo
    UI->>API: POST /api/complaints
    API->>NLP: Classifies domain & emotional urgency tokens
    API->>DB: Stores ticket + calculates SLA deadline timestamp
    Admin->>API: Opens Command Center / Urgent Dispatch Radar
    API->>Admin: Telemetry HUD, zone heatmap & active tickets
    Admin->>API: Assigns technician or overrides priority
    Cron->>DB: Checks tickets every minute for breach threshold
    Cron->>DB: Auto-escalates breached tickets & updates activity audit logs
```

### 1. Ingestion & Multi-Modal Input
Students register grievances via text or browser voice-to-text, attaching location metadata (Block, Floor, Room) and optional image evidence.

### 2. Live Zero-Cost AI Classification
As the student types, the localized NLP engine analyzes linguistic tokens, evaluates urgency triggers (`fire`, `urgent`, `asap`, `leak`), scores sentiment, and recommends the category and priority in real-time.

### 3. Dynamic Incident Triage & Telemetry Radar
Submitted grievances enter the Command Center with SLA countdown clocks (`⏱️ 42m remaining` / `⚠️ Breached`). Critical incidents are highlighted on the pulsing Urgent Dispatch Radar.

### 4. Zone Hotspot Heatmap
Facilities managers visualize issue density across campus blocks in real-time, allowing maintenance teams to address root-cause infrastructure failures before escalating.

### 5. Autonomous SLA Worker & Audit Trail
A background worker (`node-cron`) audits active tickets every 60 seconds. Breached deadlines are automatically flagged as `escalated`, auto-reassigned if inactive, and permanently recorded in immutable activity logs.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons, Recharts, Date-fns, Vanilla Modern CSS |
| **Backend** | Node.js, Express, `node-cron`, `cors`, `dotenv` |
| **AI / NLP** | `natural` (Multinomial Naive Bayes, Porter Stemmer, Tokenizer) — $0 API cost |
| **Database** | PostgreSQL (Neon Cloud) / MySQL 8.0, connection pooling, automated schema migration |
| **Hosting** | Vercel (Frontend SPA) + Render (Backend Web Service) |

---

## ⚡ Quick Local Launch

```bash
# 1. Clone repository
git clone https://github.com/yashasgowdacr/campus-eyes.git
cd campus-eyes

# 2. Start both frontend & backend with one command
chmod +x run.sh
./run.sh
```



---

## 📄 License
MIT License
