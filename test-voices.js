require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { SarvamAIClient } = require('sarvamai');

async function main() {
  const apiKey = process.env.SARVAM_API_KEY;
  const client = new SarvamAIClient({ apiKey });

  const testText = 'வணக்கம்! உங்கள் சங்க மெம்பர்ஷிப் புதுப்பித்தல் கோரிக்கை பெறப்பட்டது. எங்கள் குழு விரைவில் உங்களை தொடர்பு கொள்ளும்.';

  // Top Indian Tamil / South voices
  const voices = [
    { name: 'mani', desc: 'Male (Professional & Deep)' },
    { name: 'vijay', desc: 'Male (Warm & Natural)' },
    { name: 'gokul', desc: 'Male (Energetic / Modern)' },
    { name: 'shruti', desc: 'Female (Clear & Soft)' },
    { name: 'suhani', desc: 'Female (Polite & Professional)' },
  ];

  console.log('⏳ Generating voice samples in parallel...\n');

  for (const v of voices) {
    try {
      console.log(`🗣️ Generating voice with speaker: "${v.name}" (${v.desc})...`);
      const response = await client.textToSpeech.convert({
        text: testText,
        targetLanguageCode: 'ta-IN',
        speaker: v.name,
      });

      if (response.audios?.[0]) {
        const audioBuffer = Buffer.from(response.audios[0], 'base64');
        const filename = `sarvam_sample_${v.name}.wav`;
        fs.writeFileSync(path.join(__dirname, filename), audioBuffer);
        console.log(`   ✅ Saved: ${filename}`);
      }
    } catch (err) {
      console.error(`   ❌ Failed for ${v.name}:`, err.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 5 Different Voice Samples Saved!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('You can listen to each file in D:\\Tasks\\Sangam\\sangam-poc:');
  voices.forEach(v => console.log(` • sarvam_sample_${v.name}.wav -> ${v.desc}`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();
