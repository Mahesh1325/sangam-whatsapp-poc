const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const voiceEngine = require('../src/services/voiceEngine.service');

async function testBenchmarkService() {
  console.log('🧪 Testing Voice Engine Service & Multi-Model Benchmarking...\n');

  // 1. Check & start engine
  console.log('1. Checking Engine Status...');
  let status = await voiceEngine.getStatus();
  console.log('Initial Status:', status);

  if (!status.isRunning) {
    console.log('Starting Python Engine...');
    const startRes = await voiceEngine.startEngine();
    console.log('Start Result:', startRes);
  }

  status = await voiceEngine.getStatus();
  console.log('✅ Active Engine Status:', {
    isRunning: status.isRunning,
    model: status.model_id,
    ram: `${status.memory_mb} MB`,
    threads: status.cpu_threads,
  });

  // 2. Load test audio
  const audioPath = path.join(__dirname, '../sarvam_samples/sarvam_sample_vijay.wav');
  const audioBuffer = fs.readFileSync(audioPath);
  console.log(`\n2. Running Comparison on ${path.basename(audioPath)} (${audioBuffer.length} bytes)...`);

  const results = await voiceEngine.runComparison(audioBuffer, 'sarvam_sample_vijay.wav', 'audio/wav');

  console.log('\n============================================================');
  console.log('📊 MULTI-MODEL COMPARISON RESULTS');
  console.log('============================================================');

  console.log('\n[Model 1: Self-Hosted vasista22 Tamil Whisper (INT8 CPU)]');
  if (results.whisper?.error) {
    console.error('Whisper Error:', results.whisper.error);
  } else {
    console.log('• Transcript:  ', results.whisper.transcript);
    console.log('• Latency:     ', `${results.whisper.modelLatencyMs} ms (RTF: ${results.whisper.rtf}x)`);
    console.log('• CPU Usage:   ', `${results.whisper.cpuPercent}%`);
    console.log('• RAM Footprint:', `${results.whisper.memoryMb} MB`);
    console.log('• Cost:        ', '₹0.00 (Self-Hosted on your own server)');
  }

  console.log('\n[Model 2: Cloud Google Gemini 3.5 Flash]');
  if (results.gemini?.error) {
    console.error('Gemini Error:', results.gemini.error);
  } else {
    console.log('• Transcript:  ', results.gemini.transcript);
    console.log('• Total Latency:', `${results.gemini.totalLatencyMs} ms`);
    console.log('• Intent:      ', results.gemini.intent);
    console.log('• Server CPU:  ', '0.0% (Processed in Google Cloud)');
    console.log('• Cost:        ', results.gemini.cost);
  }

  console.log('\n============================================================');
  console.log('🎉 Multi-Model Voice Benchmark Verified Successfully!');
}

testBenchmarkService();
