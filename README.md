# 👁️ Campus-Eye
> **Next-Generation Smart Campus Grievance Intelligence & Autonomous Facilities Surveillance Command Center**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Frontend_Live-000000?logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-Backend_Live-46E3B7?logo=render&logoColor=black)
![NLP](https://img.shields.io/badge/AI-Natural_NLP_Engine-8B5CF6)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🌟 Overview

**Campus-Eye** is an intelligent, full-stack campus operations and grievance surveillance platform designed for universities and modern institutions. It bridges the gap between student complaints and facilities resolution through automated **NLP text classification**, **real-time SLA breach countdowns**, **dynamic incident triage**, and a **cybernetic operations command center**.

Unlike legacy ticketing systems, **Campus-Eye** functions with **zero external API costs ($0)** by running a localized statistical NLP engine (Multinomial Naive Bayes + Porter Stemmer) that automatically categorizes issues, scores emotional urgency, and calculates SLA risk thresholds.

---

## 🚀 Key Highlights & Architecture

### 🧠 1. Localized Campus-Eye NLP Intelligence Engine
- **Zero-Cost Operation:** No external cloud bills or quota limits. Runs locally in Node.js with < 50MB RAM footprint.
- **Statistical Naive Bayes Classifier:** Tokenizes and stems words down to root forms (`PorterStemmer`) trained on 150+ campus-specific incident records.
- **Multi-Factor Domain Categorization:**
  - 🚨 `Emergency` (Fire, chemical spills, safety hazards)
  - ⚡ `Electrical` (Power outages, MCB trips, AC failures)
  - 🌐 `Network` (Campus Wi-Fi, DNS, captive portal, packet drops)
  - 🚰 `Plumbing` (Pipeline bursts, water contamination, washroom fixtures)
  - 🎓 `Academic` (Projectors, classroom sound, interactive smartboards)
  - 🧹 `Housekeeping` (Hygiene, sanitation, pest control)
  - 🍱 `Hostel & Mess` (Food quality, laundry automation, room access)
  - 🛡️ `Security & Infra` (CCTV blindspots, turnstiles, road safety)
- **Sentiment & Urgency Scoring:** Detects critical urgency tokens (`urgent`, `asap`, `exam tomorrow`), uppercase shouting, and punctuation intensity to auto-boost priority.
- **Dynamic Continual Learning:** Administrators can feed custom training samples and override classifications on the fly.

### ⚡ 2. Urgent Dispatch Radar (Telemetry HUD)
- **Live Radar Beacon:** Pulsing telemetry indicator monitoring real-time campus risk.
- **Dynamic SLA Countdown Clocks:** Displays relative time remaining or imminent escalation warnings (`⏱️ 42m remaining` / `⚠️ Breached`).
- **One-Click Incident Triage:** Direct modal access for instant technician assignment and administrative priority override.

### 🔥 3. Zone Problem Heatmap (Dual View)
- **Density Grid Matrix:** Clean, non-overlapping progress tracks color-coded by severity (`High`, `Moderate`, `Low`).
- **Interactive Zone Filtering:** Click any campus building in the heatmap to isolate complaints in the command center.
- **Hotspot Bar Chart:** Visualizes top incident-heavy blocks with gradient density meters.

### ⏱️ 4. Autonomous SLA Engine & Cron Escalations
- Automated background worker (`node-cron`) checks ticket SLA deadlines every minute.
- Automatically marks breached tickets as `escalated` and logs system activity.
- Auto-reassigns unresolved tickets if staff inactivity exceeds threshold.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, Recharts, Lucide Icons, Date-fns, Vanilla Modern CSS (Glassmorphism & Cyberpunk Dark Mode).
- **Backend:** Node.js, Express, `mysql2`, `natural` (NLP library), `node-cron`, `dotenv`.
- **Database:** MySQL 8.0 (Relational schema with activity logs, feedback tables, and automated migrations).

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** (v18+)
- **MySQL Server** running locally or in cloud (Port 3306)

### 2. Database Configuration
Create a `.env` file in the `backend/` directory (or copy `backend/.env.example`):

```env
PORT=5000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_complaints
DB_PORT=3306
```

### 3. One-Command Launch
Run the provided unified startup script:

```bash
chmod +x run.sh
./run.sh
```

Both servers will start concurrently:
- 🌐 **Frontend App:** [http://localhost:5173](http://localhost:5173)
- 🔌 **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## 🔐 Default Credentials

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin` | Full Campus-Eye Operations Command Center, Heatmaps, Analytics, Dispatch |
| **Student** | `student` | `student123` | Student Complaint Portal, Voice-to-Text, Real-time AI Preview |

*(New student accounts can also be created via the Register tab on the UI).*

---

## 📂 Project Structure

```text
├── backend/
│   ├── nlp/
│   │   ├── nlpEngine.js        # Naive Bayes classifier & sentiment analyzer
│   │   └── trainingData.js     # 150+ curated domain incident samples
│   ├── db.js                   # Dual-engine connection pool & automatic table schema migrator
│   └── server.js               # Express REST API & cron workers
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx    # Campus-Eye Command Center, Heatmap & Radar
│   │   │   ├── StudentDashboard.jsx  # Student filing portal & live AI suggestion HUD
│   │   │   ├── Login.jsx             # Dual-role authentication screen
│   │   │   └── ProfileModal.jsx      # Student profile & points gamification
│   │   ├── App.jsx
│   │   └── index.css                 # Glassmorphic design tokens & animations
└── run.sh                            # One-click startup runner
```

---

## 🌐 100% Free Live Cloud Deployment Guide

Campus-Eye is pre-configured for instant zero-cost hosting using **Neon DB**, **Render**, and **Vercel**:

```text
[ Vercel (Frontend) ] ─── HTTPS API ───> [ Render (Backend) ] ─── SSL ───> [ Neon DB (PostgreSQL) ]
```

### 1️⃣ Step 1: Database Setup on Neon (PostgreSQL)
1. Sign up for free at **[neon.tech](https://neon.tech)**.
2. Click **Create Project** (Name: `campus-eye`).
3. Copy the generated **Postgres Connection URI** (it looks like `postgresql://neondb_owner:PASSWORD@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require`).
4. *That's it!* Campus-Eye automatically builds the entire relational schema and seeds default users on first boot.

### 2️⃣ Step 2: Backend Web Service on Render
1. Sign up for free at **[render.com](https://render.com)**.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository: `<your-username>/Campus-Eye`.
4. Configure settings:
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `PORT` = `5000`
   - `DATABASE_URL` = *(Paste your Neon DB connection URI from Step 1)*
6. Click **Deploy Web Service**.
7. Once deployed, copy your Render Service URL (e.g., `https://campus-eye-backend.onrender.com`).

### 3️⃣ Step 3: Frontend Web App on Vercel
1. Sign up for free at **[vercel.com](https://vercel.com)**.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository: `<your-username>/Campus-Eye`.
4. Configure settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit and set to `frontend`
5. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://your-backend-name.onrender.com` *(Your Render URL from Step 2, without a trailing slash)*
6. Click **Deploy**.
7. Your app is now **LIVE** on the internet! 🚀

---

## 📄 License
This project is licensed under the MIT License.

