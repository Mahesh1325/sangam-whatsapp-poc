const express = require('express');
const fs = require('fs');
const voiceEngine = require('../services/voiceEngine.service');

const router = express.Router();

// Middleware for raw audio uploads
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
 * POST /api/benchmark/compare
 * Benchmark audio against vasista22 Tamil Whisper and/or Gemini
 * Accepts either:
 *  - Raw binary audio body with Content-Type: audio/wav (mic record or file upload)
 *  - JSON body with { sampleFilename: 'sarvam_sample_vijay.wav' }
 */
router.post('/compare', rawAudioParser, async (req, res) => {
  try {
    let audioBuffer = null;
    let filename = 'live_audio.wav';
    let mimeType = req.headers['content-type'] || 'audio/wav';

    // 1. Check if raw audio binary was sent (e.g. from live microphone)
    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      audioBuffer = req.body;
      filename = req.headers['x-filename'] || 'mic_recording.wav';
    } 
    // 2. Or check if an existing sample filename was selected
    else if (req.body && req.body.sampleFilename) {
      const samplePath = voiceEngine.getSamplePath(req.body.sampleFilename);
      if (!samplePath) {
        return res.status(404).json({ error: 'Selected sample file not found' });
      }
      audioBuffer = fs.readFileSync(samplePath);
      filename = req.body.sampleFilename;
      mimeType = 'audio/wav';
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio provided. Upload an audio file, record mic, or choose a sample.' });
    }

    const requestedModel = req.query.model || req.headers['x-model'] || 'all';

    console.log(`🎙️ [Benchmark API] Running test with ${audioBuffer.length} bytes | Model: ${requestedModel} | File: ${filename}`);

    if (requestedModel === 'whisper') {
      const result = await voiceEngine.transcribeWhisper(audioBuffer, filename);
      return res.json({ whisper: result });
    }

    if (requestedModel === 'gemini') {
      const result = await voiceEngine.transcribeGemini(audioBuffer, mimeType);
      return res.json({ gemini: result });
    }

    // Default: Run comparison across all models
    const comparison = await voiceEngine.runComparison(audioBuffer, filename, mimeType);
    res.json(comparison);
  } catch (err) {
    console.error('Benchmark error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
