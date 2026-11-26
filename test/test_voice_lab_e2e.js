const voiceEngine = require('../src/services/voiceEngine.service');
const fs = require('fs');
const path = require('path');

async function runE2ETests() {
  console.log('--- 🧪 STARTING VOICE LAB E2E VERIFICATION ---');

  // 1. Test starting engine
  console.log('\n1. Checking Engine Status & Starting if needed...');
  let status = await voiceEngine.getStatus();
  console.log('Initial Status:', status);

  if (!status.isRunning) {
    console.log('Starting engine...');
    const startRes = await voiceEngine.startEngine();
    console.log('Start Result:', startRes);
  }

  status = await voiceEngine.getStatus();
  console.log('Final Online Status:', status);

  if (!status.isRunning) {
    throw new Error('Engine failed to start!');
  }

  // 2. Load audio sample
  const samplePath = path.join(__dirname, '../sarvam_samples/sarvam_sample_vijay.wav');
  if (!fs.existsSync(samplePath)) {
    throw new Error(`Sample file not found: ${samplePath}`);
  }
  const audioBuffer = fs.readFileSync(samplePath);
  console.log(`\nLoaded test audio: ${samplePath} (${audioBuffer.length} bytes)`);

  // 3. Test vasista22 Tamil Whisper
  console.log('\n2. Testing vasista22/whisper-tamil-small (Self-Hosted CPU INT8)...');
  const t0 = Date.now();
  const resVasista = await voiceEngine.transcribeSingle(
    audioBuffer,
    'sarvam_sample_vijay.wav',
    'audio/wav',
    'vasista22/whisper-tamil-small'
  );
  console.log('✅ vasista22 Result in', Date.now() - t0, 'ms:', {
    model: resVasista.modelDisplayName,
    latency: resVasista.modelLatencyMs,
    rtf: resVasista.rtf,
    cpu: resVasista.cpuPercent,
    ram: resVasista.memoryMb,
    transcript: resVasista.transcript,
  });

  // 4. Test openai/whisper-tiny
  console.log('\n3. Testing openai/whisper-tiny (Self-Hosted CPU INT8 Baseline)...');
  const t1 = Date.now();
  const resTiny = await voiceEngine.transcribeSingle(
    audioBuffer,
    'sarvam_sample_vijay.wav',
    'audio/wav',
    'openai/whisper-tiny'
  );
  console.log('✅ whisper-tiny Result in', Date.now() - t1, 'ms:', {
    model: resTiny.modelDisplayName,
    latency: resTiny.modelLatencyMs,
    rtf: resTiny.rtf,
    cpu: resTiny.cpuPercent,
    ram: resTiny.memoryMb,
    transcript: resTiny.transcript,
  });

  // 5. Test Google Gemini Cloud
  console.log('\n4. Testing gemini-3.1-flash-lite (Cloud Multimodal)...');
  const t2 = Date.now();
  try {
    const resGemini = await voiceEngine.transcribeSingle(
      audioBuffer,
      'sarvam_sample_vijay.wav',
      'audio/wav',
      'gemini-3.1-flash-lite'
    );
    console.log('✅ Gemini Result in', Date.now() - t2, 'ms:', {
      model: resGemini.modelDisplayName,
      latency: resGemini.totalLatencyMs,
      intent: resGemini.intent,
      replyText: resGemini.replyText,
      transcript: resGemini.transcript,
    });
  } catch (err) {
    console.log('⚠️ Gemini test note (needs network):', err.message);
  }

  // 6. Test Multi-Model Comparison
  console.log('\n5. Testing Multi-Model Comparison Matrix...');
  const t3 = Date.now();
  const compRes = await voiceEngine.runComparison(audioBuffer, 'sarvam_sample_vijay.wav', 'audio/wav');
  console.log('✅ Comparison Complete in', Date.now() - t3, 'ms:');
  console.log('- Vasista Transcript:', compRes.vasista?.transcript);
  console.log('- Tiny Transcript:', compRes.tiny?.transcript);
  console.log('- Gemini Transcript:', compRes.gemini?.transcript || compRes.gemini?.error);

  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
}

runE2ETests().catch((err) => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
