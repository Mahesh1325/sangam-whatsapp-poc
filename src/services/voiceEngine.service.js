const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const gemini = require('./gemini.service');

// CRITICAL: Ensure local requests to 127.0.0.1 never go through sandbox/system HTTP proxy
if (process.env.NO_PROXY) {
  if (!process.env.NO_PROXY.includes('127.0.0.1')) {
    process.env.NO_PROXY = `127.0.0.1,localhost,${process.env.NO_PROXY}`;
  }
} else {
  process.env.NO_PROXY = '127.0.0.1,localhost';
}

const PYTHON_EXE = path.join(__dirname, '../../voice-engine/.venv/Scripts/python.exe');
const ENGINE_SCRIPT = path.join(__dirname, '../../voice-engine/engine.py');
const ENGINE_LOG = path.join(__dirname, '../../voice-engine/engine.log');
const SAMPLES_DIR = path.join(__dirname, '../../sarvam_samples');
const ENGINE_URL = 'http://127.0.0.1:5005';

let engineProcess = null;

class VoiceEngineService {
  /**
   * Check if Python FastAPI Whisper engine is responding on port 5005
   */
  async getStatus() {
    try {
      const res = await fetch(`${ENGINE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return { isRunning: true, ...data };
      }
    } catch {
      // not running or unreachable
    }
    return {
      isRunning: false,
      status: 'offline',
      loaded_models: [],
      memory_mb: 0,
      cpu_threads: 4,
    };
  }

  /**
   * Start the Python engine microservice if not running
   */
  async startEngine() {
    const status = await this.getStatus();
    if (status.isRunning) {
      return { success: true, message: 'Voice engine is already running', status };
    }

    if (!fs.existsSync(PYTHON_EXE)) {
      throw new Error(`Python virtual environment not found at: ${PYTHON_EXE}`);
    }

    console.log('🚀 [VoiceEngine] Spawning Python faster-whisper service on port 5005...');

    // Open log file for stdout and stderr
    const outLog = fs.openSync(ENGINE_LOG, 'a');

    engineProcess = spawn(PYTHON_EXE, [ENGINE_SCRIPT], {
      cwd: path.join(__dirname, '../../voice-engine'),
      detached: true,
      stdio: ['ignore', outLog, outLog],
      env: {
        ...process.env,
        HF_HOME: 'D:\\hf-cache',
        NO_PROXY: '127.0.0.1,localhost',
      },
    });

    engineProcess.unref();

    // Poll until ready (up to 15 seconds)
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const curStatus = await this.getStatus();
      if (curStatus.isRunning) {
        console.log('✅ [VoiceEngine] Engine started and ready!');
        return { success: true, message: 'Voice engine started successfully on port 5005', status: curStatus };
      }
    }

    // If timeout, read last 10 lines of engine.log for diagnostics
    let logTail = '';
    try {
      if (fs.existsSync(ENGINE_LOG)) {
        const logContent = fs.readFileSync(ENGINE_LOG, 'utf8');
        logTail = logContent.split('\n').slice(-10).join('\n');
      }
    } catch (e) {
      logTail = e.message;
    }

    throw new Error(`Timed out waiting for Voice engine to start on port 5005. Engine log:\n${logTail}`);
  }

  /**
   * Stop the running voice engine
   */
  async stopEngine() {
    if (engineProcess && !engineProcess.killed) {
      try {
        process.kill(engineProcess.pid);
      } catch {
        // ignore
      }
    }
    // Also send request or let OS clean it up
    return { success: true, message: 'Engine stop requested' };
  }

  /**
   * Return catalog of supported models for testing
   */
  getAvailableModels() {
    return [
      {
        id: 'vasista22/whisper-tamil-small',
        name: 'vasista22/whisper-tamil-small',
        displayName: 'Tamil Whisper Small (Fine-Tuned)',
        provider: 'Self-Hosted CPU',
        type: 'whisper',
        quantization: 'INT8 (CTranslate2)',
        size: '~248 MB',
        memory: '~430 MB RAM',
        badge: 'Recommended for Tamil',
        description: 'Specially fine-tuned for high accuracy on native Tamil speech, formal notices, and community vocabulary.',
      },
      {
        id: 'openai/whisper-tiny',
        name: 'openai/whisper-tiny',
        displayName: 'Whisper Tiny (Ultra-Fast Baseline)',
        provider: 'Self-Hosted CPU',
        type: 'whisper',
        quantization: 'INT8 (CTranslate2)',
        size: '~75 MB',
        memory: '~150 MB RAM',
        badge: 'Lightweight & Ultra-Fast',
        description: 'Sub-second multilingual baseline model for low-resource environments and fast transcription.',
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Google Gemini 3.1 Flash Lite',
        displayName: 'Gemini 3.1 Flash Lite (Cloud)',
        provider: 'Google Cloud',
        type: 'cloud',
        quantization: 'N/A (Cloud Multimodal API)',
        size: 'Cloud Hosted',
        memory: '0 MB Local',
        badge: 'Multimodal + Intent Classification',
        description: 'Lightning-fast cloud multimodal LLM that combines transcription, intent classification, and instant WhatsApp reply drafting.',
      },
    ];
  }

  /**
   * Transcribe using local self-hosted faster-whisper INT8
   * @param {Buffer} audioBuffer - Binary WAV/OGG
   * @param {string} filename - filename
   * @param {string} modelId - 'vasista22/whisper-tamil-small' or 'openai/whisper-tiny'
   */
  async transcribeWhisper(audioBuffer, filename = 'audio.wav', modelId = 'vasista22/whisper-tamil-small') {
    // Ensure engine is running
    const status = await this.getStatus();
    if (!status.isRunning) {
      await this.startEngine();
    }

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('file', blob, filename);

    const tStart = Date.now();
    const query = new URLSearchParams({
      language: 'ta',
      beam_size: '2',
      model_id: modelId,
    });

    const res = await fetch(`${ENGINE_URL}/transcribe?${query.toString()}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Whisper engine error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const networkLatency = Date.now() - tStart;

    const isVasista = !modelId.toLowerCase().includes('tiny');
    return {
      model_id: data.model_id || modelId,
      modelDisplayName: isVasista ? 'Tamil Whisper Small (Fine-Tuned)' : 'Whisper Tiny (Baseline)',
      provider: 'Self-Hosted (CPU)',
      type: 'whisper',
      transcript: data.transcript,
      language: data.language,
      languageConfidence: data.language_confidence,
      audioDurationSeconds: data.audio_duration_seconds,
      modelLatencyMs: data.latency_ms,
      totalLatencyMs: networkLatency,
      rtf: data.rtf,
      cpuPercent: data.cpu_percent,
      memoryMb: data.memory_mb,
      cost: '₹0.00 (Self-Hosted CPU)',
    };
  }

  /**
   * Transcribe using Google Gemini Cloud Multimodal
   * @param {Buffer} audioBuffer
   * @param {string} mimeType
   * @param {string} modelId
   */
  async transcribeGemini(audioBuffer, mimeType = 'audio/wav', modelId = 'gemini-3.1-flash-lite') {
    const tStart = Date.now();
    const result = await gemini.processVoiceNote(audioBuffer, mimeType, modelId);
    const latency = Date.now() - tStart;

    if (!result) {
      throw new Error('Gemini API failed to process voice note after retries');
    }

    return {
      model_id: result.model_used || modelId,
      modelDisplayName: `Gemini (${result.model_used || modelId})`,
      provider: 'Google Cloud (Multimodal)',
      type: 'cloud',
      transcript: result.transcript,
      language: result.language_detected,
      languageConfidence: 99.0,
      intent: result.intent,
      summary: result.summary,
      replyText: result.reply_text,
      buttons: result.buttons || [],
      totalLatencyMs: latency,
      modelLatencyMs: latency,
      rtf: 0,
      cpuPercent: 0, // Zero server CPU used (cloud inference)
      memoryMb: 0,   // Zero local memory used
      cost: '₹0.00 (Free Tier)',
    };
  }

  /**
   * Transcribe with a specified single model
   */
  async transcribeSingle(audioBuffer, filename = 'sample.wav', mimeType = 'audio/wav', modelId = 'vasista22/whisper-tamil-small') {
    if (modelId.startsWith('gemini')) {
      return await this.transcribeGemini(audioBuffer, mimeType, modelId);
    }
    return await this.transcribeWhisper(audioBuffer, filename, modelId);
  }

  /**
   * Run multi-model benchmark on the same audio
   */
  async runComparison(audioBuffer, filename = 'sample.wav', mimeType = 'audio/wav') {
    const results = {};

    // 1. Vasista22 Tamil Whisper
    try {
      results.vasista = await this.transcribeWhisper(audioBuffer, filename, 'vasista22/whisper-tamil-small');
    } catch (err) {
      results.vasista = { error: err.message };
    }

    // 2. Whisper Tiny Baseline
    try {
      results.tiny = await this.transcribeWhisper(audioBuffer, filename, 'openai/whisper-tiny');
    } catch (err) {
      results.tiny = { error: err.message };
    }

    // 3. Gemini Cloud
    try {
      results.gemini = await this.transcribeGemini(audioBuffer, mimeType, 'gemini-3.1-flash-lite');
    } catch (err) {
      results.gemini = { error: err.message };
    }

    return results;
  }

  /**
   * List available audio samples for quick 1-click testing
   */
  listSamples() {
    if (!fs.existsSync(SAMPLES_DIR)) return [];

    return fs.readdirSync(SAMPLES_DIR)
      .filter((f) => f.endsWith('.wav'))
      .map((filename) => {
        const filePath = path.join(SAMPLES_DIR, filename);
        const stat = fs.statSync(filePath);
        const speaker = filename.replace('sarvam_sample_', '').replace('.wav', '');
        return {
          filename,
          sizeKb: Math.round(stat.size / 1024),
          speaker: speaker.charAt(0).toUpperCase() + speaker.slice(1),
        };
      });
  }

  getSamplePath(filename) {
    const safeName = path.basename(filename);
    const fullPath = path.join(SAMPLES_DIR, safeName);
    return fs.existsSync(fullPath) ? fullPath : null;
  }
}

module.exports = new VoiceEngineService();
