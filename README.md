# Sangam Community WhatsApp Support POC

A unified full-stack application built with **React (Vite)** and **Node.js (Express)**, integrated with **Meta WhatsApp Cloud API**, **WhatsApp Flows**, and **Supabase PostgreSQL**.

---

## 📁 Clean Directory Structure

```text
sangam-poc/
├── client/                     # ⚛️ React UI (Vite)
│   ├── src/
│   │   ├── components/         # Modular UI Components
│   │   │   ├── Navbar.jsx          # Header, Sync & Logout
│   │   │   ├── KpiCards.jsx        # Real-time KPI Metric cards
│   │   │   ├── TicketList.jsx      # Ticket queue with search & filters
│   │   │   ├── MemberUpdatesList.jsx# Member profile change logs
│   │   │   └── LiveChat.jsx        # Two-way WhatsApp chat console
│   │   ├── services/
│   │   │   └── api.js              # Centralized backend API client
│   │   ├── App.jsx             # Main dashboard layout & state machine
│   │   ├── index.css           # Global theme variables & styles
│   │   └── main.jsx            # React root entry
│   ├── package.json            # Client dependencies (React, Lucide)
│   └── vite.config.js          # Vite config (proxies /admin to Express)
│
├── public/                     # 📦 Bundled Static Assets (Served by Express)
│   ├── index.html
│   └── assets/
│
├── src/                        # 🚀 Node.js / Express Server
│   ├── config/
│   │   ├── env.js              # Environment variable validation
│   │   └── supabase.js         # Supabase client initializer
│   ├── controllers/
│   │   ├── admin.controller.js     # Ticket resolution & live chat APIs
│   │   ├── auth.controller.js      # Session login & cookie management
│   │   ├── dashboard.controller.js # Serves built React SPA
│   │   ├── flow.controller.js      # Meta WhatsApp Flows endpoint handler
│   │   └── webhook.controller.js   # WhatsApp webhook verification & receiver
│   ├── middlewares/
│   │   └── auth.middleware.js      # JWT & HTTP-only cookie protection
│   ├── routes/
│   │   ├── admin.routes.js         # /admin/tickets, /admin/chat/*
│   │   ├── auth.routes.js          # /login, /api/login, /logout
│   │   ├── dashboard.routes.js     # /dashboard
│   │   ├── flow.routes.js          # /whatsapp/flow-endpoint
│   │   └── webhook.routes.js       # /webhook/whatsapp
│   ├── services/
│   │   ├── chatbot.service.js      # Conversational state machine & menus
│   │   └── whatsapp.service.js     # Meta Cloud API message dispatcher
│   ├── stores/
│   │   └── dataStore.js            # Hybrid Supabase DB + In-Memory fallback
│   ├── views/
│   │   ├── login.html              # Secure admin login view
│   │   └── dashboard.html          # HTML fallback console
│   └── app.js                  # Express app & middleware setup
│
├── .env                        # Local secret keys (ignored by git)
├── .env.example                # Sample environment template
├── create-admin.js             # 🔐 Secure CLI tool to create admins (masked)
├── package.json                # Root scripts (start, build:client, create-admin)
├── server.js                   # Server bootstrap entry point
├── start-tunnel.bat            # Local ngrok tunnel runner
└── supabase-schema.sql         # Supabase PostgreSQL schema with RLS
```

---

## ⚡ Quick Start

### 1. Install & Setup
```bash
# In project root
npm install
cd client && npm install && cd ..
```

### 2. Configure `.env`
Create `.env` using `.env.example`:
```env
PORT=3000
VERIFY_TOKEN=1325
PHONE_NUMBER_ID=1224209670779871
WHATSAPP_ACCESS_TOKEN=your_token
FLOW_ID=2346029172866499
FLOW_MODE=published
JWT_SECRET=super_secret_jwt_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Create Admin User (CLI)
```bash
npm run create-admin
```
Prompts for username and password with hidden terminal masking (`*`).

### 4. Build & Run Full-Stack App
```bash
# Build React client into public/
npm run build:client

# Start unified Express server
npm start
```
Open **`http://localhost:3000/dashboard`** to log in and use the console!

---

## 🛠️ Development Mode (With Hot-Reload)
Run server and React client concurrently:
- **Terminal 1 (Server):** `npm start` (Runs on port 3000)
- **Terminal 2 (Client):** `npm run dev:client` (Vite dev server at `http://localhost:5173`)
