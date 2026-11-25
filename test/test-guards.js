const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const whatsapp = require('../src/services/whatsapp.service');
const chatbot = require('../src/services/chatbot.service');

async function testGuards() {
  console.log('🧪 Testing Optimization Guards (Short Audio & Rate Limiting)...\n');

  let sentMessages = [];
  const origSendButtons = whatsapp.sendReplyButtons;
  const origDownload = whatsapp.downloadMediaBuffer;

  whatsapp.sendReplyButtons = async (to, text, buttons) => {
    sentMessages.push({ to, text, buttons });
    return { success: true };
  };

  const testPhone = '919999900001';

  // --- TEST 1: Short Audio Filter (< 4KB) ---
  console.log('--- TEST 1: Short / Blank Audio Guard ---');
  whatsapp.downloadMediaBuffer = async () => ({
    buffer: Buffer.alloc(1200), // only 1.2 KB (accidental mic tap)
    mimeType: 'audio/ogg',
    fileSize: 1200,
  });

  await chatbot.handleIncomingMessage({
    from: testPhone,
    type: 'audio',
    audio: { id: 'short_audio_1' },
  });

  const lastMsg1 = sentMessages[sentMessages.length - 1];
  console.log('Response:', lastMsg1?.text);
  if (lastMsg1?.text?.includes('சிறியதாக உள்ளது')) {
    console.log('✅ PASS: Short audio filtered successfully without calling Gemini!\n');
  } else {
    console.error('❌ FAIL: Short audio was not intercepted correctly.');
  }

  // --- TEST 2: Anti-Spam Rate Limiter (Max 5 per 10 mins) ---
  console.log('--- TEST 2: Anti-Spam Rate Limiter ---');
  whatsapp.downloadMediaBuffer = async () => ({
    buffer: Buffer.alloc(8000), // valid size
    mimeType: 'audio/ogg',
    fileSize: 8000,
  });

  // We already sent 1 voice note above. Let's send 4 more valid ones:
  for (let i = 2; i <= 5; i++) {
    await chatbot.handleIncomingMessage({
      from: testPhone,
      type: 'audio',
      audio: { id: `valid_audio_${i}` },
    });
  }
  console.log('Sent 5 voice notes total. Now sending 6th note (should be blocked by rate limit)...');

  sentMessages = [];
  await chatbot.handleIncomingMessage({
    from: testPhone,
    type: 'audio',
    audio: { id: 'spam_audio_6' },
  });

  const lastMsg2 = sentMessages[sentMessages.length - 1];
  console.log('Response:', lastMsg2?.text);
  if (lastMsg2?.text?.includes('தொடர்ந்து பல வாய்ஸ்')) {
    console.log('✅ PASS: 6th voice note blocked by rate limiter with friendly cooldown message!\n');
  } else {
    console.error('❌ FAIL: Rate limiter did not intercept 6th message.');
  }

  // Restore
  whatsapp.sendReplyButtons = origSendButtons;
  whatsapp.downloadMediaBuffer = origDownload;
}

testGuards();
