const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');

let aiInstance = null;

function getAIClient() {
  if (!aiInstance) {
    if (!env.GEMINI_API_KEY) {
      console.warn('⚠️ [GeminiService] GEMINI_API_KEY is not defined in environment variables.');
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return aiInstance;
}

const SYSTEM_INSTRUCTION = `
You are the official AI Assistant for "Sangam Community Association" WhatsApp Support.
Community members send voice notes in Tamil, Tanglish, or English.

YOUR TASKS:
1. TRANSCRIBE: Convert the audio speech into accurate text.
2. DETECT LANGUAGE: Identify if spoken in "Tamil", "Tanglish", or "English".
3. CLASSIFY INTENT: Choose ONLY one of these exact intents:
   - INFO_MEMBERSHIP  -> Inquiries about membership fees, rules, or renewal.
   - INFO_EVENTS      -> Inquiries about upcoming meetings, festivals, sports.
   - INFO_OFFICE      -> Inquiries about office address, timing, phone numbers.
   - UPDATE_DETAILS   -> Member requesting to update phone, email, address, family.
   - RAISE_TICKET     -> Complaints, maintenance, grievances, issues to fix.
   - CHECK_TICKETS    -> Checking status of previously submitted tickets.
   - GENERAL_GREETING -> Hello, hi, help, or greeting.
   - IRRELEVANT       -> Any topic NOT related to Sangam Community Association (e.g., general chit-chat, jokes, weather, news, movie trivia, politics, songs, or unrelated queries).

4. GENERATE WHATSAPP REPLY (IN CLEAR, POLITE ENGLISH):
   - Provide a helpful, courteous response in simple, professional English.
   - IF INTENT IS "IRRELEVANT":
     Politely explain that you can only assist with Sangam Community services (Membership, Events, Office Info, Member Profile Updates, or Support Tickets), and invite them to explore the menu options below.
   - Keep reply concise (1-2 short sentences max).

5. SUGGEST WHATSAPP BUTTONS:
   - Maximum 2 or 3 buttons.
   - CRITICAL META LIMIT: Each button title MUST BE AT MOST 20 CHARACTERS!
   - Use standard IDs matching our bot:
     - "MENU_MAIN" (Main Menu)
     - "MENU_TICKET" (Raise a Ticket)
     - "MENU_INFO" (Sangam Info)
     - "MENU_UPDATE" (Update Details)
     - "CHECK_MY_TICKETS" (Check Tickets)
     - "UPD_PHONE_EMAIL" (Phone/Email)
     - "UPD_ADDRESS" (Address)
     - "UPD_FAMILY" (Family Info)

Return strict JSON only matching this schema:
{
  "transcript": "...",
  "language_detected": "...",
  "intent": "INFO_MEMBERSHIP | INFO_EVENTS | INFO_OFFICE | UPDATE_DETAILS | RAISE_TICKET | CHECK_TICKETS | GENERAL_GREETING | IRRELEVANT",
  "summary": "1 sentence brief in English",
  "reply_text": "...",
  "buttons": [
    { "id": "MENU_MAIN", "title": "Main Menu" }
  ]
}
`;

/**
 * Process audio buffer using Gemini 3.5 Flash Multimodal
 * @param {Buffer} audioBuffer - Binary audio buffer (WAV, OGG, etc.)
 * @param {string} mimeType - e.g. "audio/ogg; codecs=opus" or "audio/wav"
 * @returns {Promise<Object|null>} - Parsed JSON result or null on failure
 */
async function processVoiceNote(audioBuffer, mimeType = 'audio/ogg') {
  const ai = getAIClient();
  if (!ai) {
    console.error('❌ [GeminiService] AI client unavailable (missing GEMINI_API_KEY)');
    return null;
  }

  // Sanitize mimeType for Gemini (e.g., 'audio/ogg; codecs=opus' -> 'audio/ogg')
  const cleanMimeType = mimeType.split(';')[0].trim() || 'audio/ogg';
  const base64Audio = audioBuffer.toString('base64');

  try {
    console.log(`🤖 [GeminiService] Processing voice note with model gemini-3.5-flash (${cleanMimeType}, ${audioBuffer.length} bytes)...`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: cleanMimeType,
              },
            },
            {
              text: 'Listen to this voice message from a Sangam community member, transcribe it, and provide the structured response according to your system instructions.',
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text);
    console.log('✅ [GeminiService] Voice note analysis complete:', {
      intent: parsed.intent,
      lang: parsed.language_detected,
      transcript: parsed.transcript?.slice(0, 60),
    });
    return parsed;
  } catch (err) {
    console.error('❌ [GeminiService] Error generating content:', err.message || err);
    return null;
  }
}

module.exports = {
  processVoiceNote,
  SYSTEM_INSTRUCTION,
};
