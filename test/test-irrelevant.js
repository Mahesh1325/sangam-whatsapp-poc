const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');
const { SYSTEM_INSTRUCTION } = require('../src/services/gemini.service');

async function testIrrelevantQuery() {
  console.log('🧪 Testing how Gemini handles an IRRELEVANT / OUT-OF-SCOPE query...\n');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Simulate irrelevant voice transcription (e.g. resident asking for tomorrow's weather or telling a joke)
  const irrelevantQuery = "Can you tell me tomorrow's weather forecast and who won the cricket match yesterday?";

  console.log(`User Query: "${irrelevantQuery}"\n`);

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: irrelevantQuery }
        ]
      }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json'
    }
  });

  const parsed = JSON.parse(response.text);
  console.log('🤖 Gemini Response:');
  console.log('--------------------------------------------------');
  console.log(JSON.stringify(parsed, null, 2));
  console.log('--------------------------------------------------');

  if (parsed.intent === 'IRRELEVANT') {
    console.log('\n✅ PASS: Query correctly classified as IRRELEVANT!');
    console.log('Polite deflection message:', parsed.reply_text);
    console.log('Safe recovery buttons:', parsed.buttons);
  } else {
    console.error('❌ Query was not classified as IRRELEVANT:', parsed.intent);
  }
}

testIrrelevantQuery();
