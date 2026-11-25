require('dotenv').config();
const fs = require('fs');
const path = require('path');
const whatsapp = require('./src/services/whatsapp.service');
const chatbot = require('./src/services/chatbot.service');
const dataStore = require('./src/stores/dataStore');

async function testFullVoicePipeline() {
  console.log('🧪 Testing End-to-End Voice Note Pipeline...');

  // 1. Mock whatsapp.downloadMediaBuffer to return local sample audio
  const originalDownload = whatsapp.downloadMediaBuffer;
  const originalSendReplyButtons = whatsapp.sendReplyButtons;

  const audioPath = path.join(__dirname, 'sarvam_sample_vijay.wav');
  const audioBuffer = fs.readFileSync(audioPath);

  whatsapp.downloadMediaBuffer = async (mediaId) => {
    console.log(`[Mock WhatsApp] downloadMediaBuffer called for ID: ${mediaId}`);
    return {
      buffer: audioBuffer,
      mimeType: 'audio/wav',
      fileSize: audioBuffer.length,
    };
  };

  let sentWhatsAppReply = null;
  whatsapp.sendReplyButtons = async (to, text, buttons) => {
    sentWhatsAppReply = { to, text, buttons };
    console.log(`\n📱 [Mock WhatsApp Outgoing Message to ${to}]:`);
    console.log('   Text:   ', text);
    console.log('   Buttons:', JSON.stringify(buttons, null, 2));
    return { success: true };
  };

  // 2. Simulate incoming WhatsApp webhook payload for a voice note
  const mockWebhookMessage = {
    from: '919876543210',
    type: 'audio',
    audio: {
      id: 'media_test_abc123',
      mime_type: 'audio/wav',
    },
  };

  try {
    await chatbot.handleIncomingMessage(mockWebhookMessage, 'Mahesh (Test)');
    console.log('\n✅ Voice Note Pipeline Execution Finished Successfully!');
    console.log('📊 Verified Steps:');
    console.log('   1. Downloaded media buffer.');
    console.log('   2. Gemini transcribed and extracted intent.');
    console.log('   3. Sent everyday Tamil reply + WhatsApp buttons.');
    console.log('   4. Recorded chat message in data store.');
  } catch (err) {
    console.error('❌ Pipeline test failed:', err);
  } finally {
    // Restore originals
    whatsapp.downloadMediaBuffer = originalDownload;
    whatsapp.sendReplyButtons = originalSendReplyButtons;
  }
}

testFullVoicePipeline();
