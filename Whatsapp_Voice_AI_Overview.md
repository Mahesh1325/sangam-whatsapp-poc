# WhatsApp Voice AI Architecture: Pipeline Overview

---

## Pipeline 1: Voice to Text & Interactive Response (Implemented & Verified)

*Designed for speech-in, text + WhatsApp interactive buttons out.*

### 1. Implemented Architecture (Google Gemini Flash)
* **Audio Fetcher:** Downloads the `.ogg` / Opus binary audio stream directly from the Meta Cloud Graph API using the WhatsApp media ID.
* **Multimodal Intelligence (Gemini 3.5 Flash):** Accepts raw audio bytes directly into the model. Performs speech-to-text, intent classification, and structured response generation in **one single forward pass** (eliminates separate STT engine latency & costs).
* **WhatsApp Interactive UI:** Returns structured JSON with button actions sent via the Meta Graph API (`interactive: { type: "button" }`).
* **Database Sync:** Automatically logs tickets and chat history directly to **Supabase PostgreSQL** in real-time.

### 2. Free Tier Capabilities & Quotas (Google AI Studio)
* **Daily Free Volume:** **1,500 voice requests per day** (Resets daily at 00:00 UTC).
* **Monthly Free Volume:** **45,000 voice interactions per month** at **₹0 cost**.
* **Concurrency:** **15 Requests Per Minute (RPM)**.
* **Text & Menu Messages:** **100% Free & Unlimited** (handled locally by Node.js & Supabase, zero Gemini token consumption).

### 3. Implemented Quota-Saving Guards
* **Short Audio Filter:** Clips smaller than 4KB (~1.5s) are intercepted locally before calling Gemini, saving quota from accidental mic taps.
* **Anti-Spam Rate Limiter:** Enforces a maximum of 5 voice notes per 10 minutes per resident.
* **Out-of-Scope (IRRELEVANT) Guard:** Intercepts unrelated topics (weather, news, politics, jokes), issues a polite English deflection, and provides `Main Menu` recovery buttons without cluttering Supabase with false tickets.
* **WhatsApp Button Compliance:** Automatically validates and enforces Meta's strict constraint (maximum 3 buttons, maximum 20 characters per button title).

---

## Sarvam AI: Credit Model & Cost Analysis

### 1. Free Trial Reality
* **Initial Free Credits:** **100 credits** upon signup (equivalent to ₹100 INR).
* **Monthly Refresh:** **NO.** Sarvam credits do **NOT** refresh monthly. It is a one-time trial credit. Once exhausted, a paid wallet top-up is required.

### 2. Per-Request Pipeline Breakdown (Multi-Model Architecture)
Unlike Gemini (which processes audio-to-JSON in a single step), Sarvam requires a 3-step pipeline:
1. **Speech-to-Text (Saaras:v2):** ~₹0.25 to ₹0.40 per minute of incoming audio.
2. **LLM Intent Extraction (Sarvam-2B):** ~₹0.15 to ₹0.30 per 1,000 tokens.
3. **Text-to-Speech (Bulbul:v3):** ~₹0.35 to ₹0.50 per 1,000 characters (for audio reply generation).

* **Total Cost per Voice Interaction:** **~₹0.60 to ₹0.85 INR**.
* **Lifespan of 100 Free Credits:** **~120 to 140 voice notes total** before the wallet reaches ₹0.

---

## Monthly Billing Estimation Matrix

| Monthly Volume | Google Gemini Flash (Current Setup) | Sarvam AI (Saaras + LLM + Bulbul) | Monthly Savings with Gemini |
| :--- | :--- | :--- | :--- |
| **1,000 voice notes / month** | **₹0.00** | **₹700 – ₹850 INR** | **₹850 INR** |
| **5,000 voice notes / month** | **₹0.00** | **₹3,500 – ₹4,250 INR** | **₹4,250 INR** |
| **15,000 voice notes / month** | **₹0.00** | **₹10,500 – ₹12,750 INR** | **₹12,750 INR** |
| **45,000 voice notes / month** | **₹0.00 (Free Tier Max)** | **₹31,500 – ₹38,250 INR** | **₹38,250 INR** |
| **Beyond Free Tier (Pay-As-You-Go)** | **~₹0.01 per note** (₹10 / 1,000 notes) | **~₹0.70 per note** (₹700 / 1,000 notes) | **~98% Cheaper** |

---

## Pipeline 2: Voice to Voice Response (Future Architecture)

*Designed for end-to-end spoken conversations (spoken voice note in, spoken voice note out).*

### Required Components:
* **Audio Fetcher:** Download incoming voice media using the Meta Media API.
* **Speech-to-Text (STT):** Convert speech to text using Sarvam Saaras (or Gemini Flash).
* **Conversational LLM:** Generate natural spoken dialogue in Tamil using Gemini / Sarvam LLM.
* **Text-to-Speech (TTS):** Synthesize natural human voice audio using Sarvam Bulbul:v3 (verified speakers: `vijay`, `mani`, `kavitha`, `shruti`).
* **Audio Encoder:** Convert `.wav` output into WhatsApp-compatible Opus `.ogg` format using ffmpeg.
* **Meta Media Uploader:** Upload the final audio buffer to Meta to generate a `media_id` for sending.
