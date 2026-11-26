const express = require('express');
const fs = require('fs');
const voiceEngine = require('../services/voiceEngine.service');

const router = express.Router();

// Middleware for raw audio uploads (e.g., from browser microphone MediaRecorder)
const rawAudioParser = express.raw({
  type: ['audio/*', 'application/octet-stream', 'video/ogg'],
  limit: '25mb',
});

/**
 * GET /api/benchmark/status
 * Get self-hosted engine health and memory status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await voiceEngine.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/benchmark/models
 * Get list of available models for testing
 */
router.get('/models', (req, res) => {
  try {
    const models = voiceEngine.getAvailableModels();
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/benchmark/start
 * Start Python voice engine microservice
 */
router.post('/start', async (req, res) => {
  try {
    const result = await voiceEngine.startEngine();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/benchmark/stop
 * Stop Python voice engine microservice
 */
router.post('/stop', async (req, res) => {
  try {
    const result = await voiceEngine.stopEngine();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/benchmark/samples
 * List available audio test samples
 */
router.get('/samples', (req, res) => {
  try {
    const samples = voiceEngine.listSamples();
    res.json(samples);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/benchmark/samples/:filename
 * Stream sample audio file to browser for audio player
 */
router.get('/samples/:filename', (req, res) => {
  const samplePath = voiceEngine.getSamplePath(req.params.filename);
  if (!samplePath) {
    return res.status(404).json({ error: 'Audio sample not found' });
  }

  res.setHeader('Content-Type', 'audio/wav');
  fs.createReadStream(samplePath).pipe(res);
});

/**
 * Helper to extract audio buffer and metadata from either raw body or JSON sample filename
 */
function extractAudioInput(req) {
  let audioBuffer = null;
  let filename = 'live_audio.wav';
  let mimeType = req.headers['content-type'] || 'audio/wav';

  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    audioBuffer = req.body;
    filename = req.headers['x-filename'] || 'mic_recording.wav';
  } else if (req.body && req.body.sampleFilename) {
    const samplePath = voiceEngine.getSamplePath(req.body.sampleFilename);
    if (samplePath) {
      audioBuffer = fs.readFileSync(samplePath);
      filename = req.body.sampleFilename;
      mimeType = 'audio/wav';
    }
  }

  return { audioBuffer, filename, mimeType };
}

/**
 * POST /api/benchmark/transcribe
 * Single Model Testing endpoint
 * Body: Raw audio binary OR JSON { sampleFilename: "...", modelId: "..." }
 * Query: ?model_id=vasista22/whisper-tamil-small
 */
router.post('/transcribe', rawAudioParser, async (req, res) => {
  try {
    const { audioBuffer, filename, mimeType } = extractAudioInput(req);

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio provided. Upload an audio file, record mic, or choose a sample.' });
    }

    const modelId = req.query.model_id || req.headers['x-model-id'] || req.body?.modelId || 'vasista22/whisper-tamil-small';

    console.log(`🎙️ [Benchmark API] Single Model Test: ${modelId} | File: ${filename} | Size: ${audioBuffer.length} bytes`);

    const result = await voiceEngine.transcribeSingle(audioBuffer, filename, mimeType, modelId);
    res.json(result);
  } catch (err) {
    console.error('❌ [Benchmark API] Transcribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/benchmark/compare
 * Multi-Model Comparison Matrix endpoint
 * Runs comparison across all models or selected models
 */
router.post('/compare', rawAudioParser, async (req, res) => {
  try {
    const { audioBuffer, filename, mimeType } = extractAudioInput(req);

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio provided. Upload an audio file, record mic, or choose a sample.' });
    }

    console.log(`🎙️ [Benchmark API] Running Multi-Model Comparison | File: ${filename} | Size: ${audioBuffer.length} bytes`);

    const comparison = await voiceEngine.runComparison(audioBuffer, filename, mimeType);
    res.json(comparison);
  } catch (err) {
    console.error('❌ [Benchmark API] Compare error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
