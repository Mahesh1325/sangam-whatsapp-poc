require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { SarvamAIClient } = require('sarvamai');

async function main() {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    console.error('❌ SARVAM_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('⏳ Connecting to Sarvam AI with official SDK...');
  const client = new SarvamAIClient({ apiKey });

  const testText = 'வணக்கம்! சங்கத் தோழர்களே, உங்கள் மெம்பர்ஷிப் புதுப்பித்தல் வெற்றிகரமாக தொடங்கப்பட்டது.';

  try {
    console.log(`🗣️ Converting Text to Tamil Audio via Sarvam Bulbul:v3...`);
    console.log(`   Text: "${testText}"`);

    // 1. Text-to-Speech call
    const response = await client.textToSpeech.convert({
      text: testText,
      targetLanguageCode: 'ta-IN',
      speaker: 'kavitha',
    });

    if (response.audios && response.audios[0]) {
      // 2. Save the audio file to disk so you can listen to it!
      const audioBuffer = Buffer.from(response.audios[0], 'base64');
      const outputPath = path.join(__dirname, 'sarvam_test_output.wav');
      fs.writeFileSync(outputPath, audioBuffer);

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 Sarvam AI Test Completed Successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📁 Audio file saved to: ${outputPath}`);
      console.log(`🔊 File Size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
      console.log('▶️ You can double-click and play "sarvam_test_output.wav" to hear the voice!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  } catch (err) {
    console.error('❌ Sarvam AI Call Failed:', err.message || err);
  }
}

main();
