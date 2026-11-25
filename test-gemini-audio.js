require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Error: GEMINI_API_KEY is not set in .env file!');
  console.log('👉 Please add GEMINI_API_KEY=AIzaSy... in d:\\Tasks\\Sangam\\sangam-poc\\.env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function testAudioProcessing() {
  const audioFilePath = path.join(__dirname, 'sarvam_sample_vijay.wav');
  
  if (!fs.existsSync(audioFilePath)) {
    console.error(`❌ Audio sample not found at: ${audioFilePath}`);
    process.exit(1);
  }

  console.log(`🎙️ Loading test audio: ${path.basename(audioFilePath)}...`);
  const audioBuffer = fs.readFileSync(audioFilePath);
  const base64Audio = audioBuffer.toString('base64');

  console.log('🤖 Sending audio to Gemini 1.5 Flash with custom Sangam instructions...');

  const systemInstruction = `
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
   - GENERAL_GREETING -> Hello, hi, help, or general question.

4. GENERATE WHATSAPP REPLY:
   - Must be in polite, natural, readable everyday spoken Tamil (எளிய பேச்சுத் தமிழ்).
   - DO NOT use archaic/literary words like "பொத்தான்" (pothaan) or "மின்னஞ்சல்".
   - Use natural words like "பட்டன்", "Option", "Click பண்ணுங்க", "Update பண்ணுங்க".
   - Keep reply concise (2-3 sentences max).

5. SUGGEST WHATSAPP BUTTONS:
   - Maximum 2 or 3 buttons.
   - CRITICAL META LIMIT: Each button title MUST BE AT MOST 20 CHARACTERS!
   - Use standard IDs matching our bot: "MENU_MAIN", "MENU_TICKET", "MENU_INFO", "MENU_UPDATE", "CHECK_MY_TICKETS", "UPD_PHONE_EMAIL", "UPD_ADDRESS", "UPD_FAMILY".

Return strict JSON only matching this format:
{
  "transcript": "...",
  "language_detected": "...",
  "intent": "...",
  "summary": "1 sentence brief in English",
  "reply_tamil": "...",
  "buttons": [
    { "id": "MENU_TICKET", "title": "Raise Ticket" }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: 'audio/wav',
              },
            },
            {
              text: 'Listen to this voice message from a Sangam community member, transcribe it, and provide the structured response according to your system instructions.',
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    console.log('\n✅ Response received from Gemini 1.5 Flash:');
    console.log('--------------------------------------------------');
    const resultJson = JSON.parse(response.text);
    console.log(JSON.stringify(resultJson, null, 2));
    console.log('--------------------------------------------------');
    console.log('\n🎉 Pipeline 1 Core Logic (Voice -> LLM -> Tamil Reply + Buttons) Verified Successfully!');
  } catch (err) {
    console.error('❌ Gemini Error:', err.message || err);
  }
}

testAudioProcessing();
