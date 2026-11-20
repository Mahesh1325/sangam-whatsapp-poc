# Sangam WhatsApp Cloud API Support Bot (POC)

A production-structured Node.js Express service for **Sangam Community Association**, integrating Meta WhatsApp Cloud API, interactive native **WhatsApp Flows**, and a **Live Admin Operations Console**.

---

## ⏱️ WhatsApp 24-Hour Conversation Window & Count Mechanics

### 1. Session Activation
A **24-hour customer service window** opens immediately when:
* Your business responds to a user message, OR
* A template message is delivered.

### 2. Initial Count (Hour 0–24)
* All free-form messages, buttons, WhatsApp Flows, and back-and-forth exchanges within this active 24-hour period are **bundled together and counted as 1 single conversation**.
* You are **not** charged per individual message sent.

### 3. In-Between Quiet Period (No Count)
* If messages continue back and forth or if there is a lull with zero messaging within that 24-hour block, **no new conversation counts or charges occur**.

### 4. Second Conversation Count (After 24 Hours)
* If the 24-hour window fully elapses and a new message is subsequently sent or received, a **fresh 24-hour session starts**, incrementing the log to **2 conversations**.

---

## 💰 WhatsApp Cloud API Pricing Summary

* **Free Tier:** Every WhatsApp Business Account receives **1,000 FREE Service (user-initiated) Conversations every single month**.
* **Flows Surcharge:** **₹0.00** (Meta charges zero extra fees for WhatsApp Flows).
* **Cost Outside Free Tier (India approx.):**
  * **Service (Support/Inbound):** ~₹0.35 per 24-hour window.
  * **Utility (Receipts/Status):** ~₹0.12–₹0.15 per 24-hour window.
  * **Marketing (Promotions/Broadcasts):** ~₹0.70–₹0.80 per 24-hour window.

---

## 🚀 Quick Start Guide

### 1. Installation & Environment
Ensure dependencies are installed and `.env` is configured:

```bash
npm install
```

Configure your `.env` variables:
```env
PORT=3000
VERIFY_TOKEN=1325
PHONE_NUMBER_ID=1224209670779871
WHATSAPP_ACCESS_TOKEN=EAAT5Tq...
FLOW_ID=2346029172866499
FLOW_MODE=published
```

### 2. Run the Server
```bash
node server.js
```
* **Live Admin Console:** `http://localhost:3000/dashboard`
* **Webhook URL:** `http://localhost:3000/webhook/whatsapp`
* **Flow Endpoint:** `http://localhost:3000/whatsapp/flow-endpoint`

### 3. Start Public Tunnel (ngrok)
Run the pre-configured starter script:
```powershell
.\start-tunnel.bat
```
Configure your public URL in Meta Developer Portal:
* **Callback URL:** `https://<your-tunnel-domain>/webhook/whatsapp`
* **Verify Token:** `1325` (must match `.env`)
* **Webhook Fields:** Subscribe to `messages`

---

## 📱 Bot Capabilities & User Flows

1. **Main Menu (`"Hi"`, `"Menu"`, `"Start"`):**
   * Reply buttons: **[ Info ]**, **[ Update Details ]**, **[ Raise a Ticket ]**.
2. **Interactive Directory ("Info"):**
   * Native WhatsApp List with **Membership Rules**, **Upcoming Events**, and **Office Contact**.
3. **Multi-Step Member Updates ("Update Details"):**
   * Interactive buttons for **Phone/Email**, **Address**, and **Family Info**.
   * Logs updates in real-time to memory and the Admin Dashboard.
4. **WhatsApp Flows ("Raise a Ticket"):**
   * Renders native in-app form for **Category**, **Priority**, and **Issue Description**.
   * Emits dynamic `flow_token` (`flow_<phone>_<timestamp>`) to associate incoming submissions with the member.
   * Auto-generates Ticket ID (`#TKT-501`) and sends a terminal success screen.
5. **Check My Tickets:**
   * Shows historical tickets, open/closed status, and admin closing remarks directly in WhatsApp.

---

## 🖥️ Live Operations Dashboard (`GET /dashboard`)

* **Real-time Live Polling:** Auto-refreshes every 5 seconds.
* **KPI Metrics:** Displays Open Tickets, Closed Tickets, Total Volume, and Profile Update Requests.
* **One-Click Resolution:** Input admin remarks, click **"Close"**, and the system immediately closes the ticket and dispatches closing remarks to the member's WhatsApp.
* **Theme Support:** Clean, modern UI with a built-in **Dark / Light mode** toggle.
