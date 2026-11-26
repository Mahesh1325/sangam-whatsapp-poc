const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const gemini = require('./gemini.service');

const PYTHON_EXE = path.join(__dirname, '../../voice-engine/.venv/Scripts/python.exe');
const ENGINE_SCRIPT = path.join(__dirname, '../../voice-engine/engine.py');
const SAMPLES_DIR = path.join(__dirname, '../../sarvam_samples');
const ENGINE_URL = 'http://127.0.0.1:5005';

let engineProcess = null;

class VoiceEngineService {
  /**
   * Check if Python FastAPI Whisper engine is responding on port 5005
   */
  async getStatus() {
    try {
      const res = await fetch(`${ENGINE_URL}/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return { isRunning: true, ...data };
      }
    } catch {
      // not running
    }
    return {
      isRunning: false,
      status: 'offline',
      model_id: 'vasista22/whisper-tamil-small',
      quantization: 'int8',
      device: 'cpu',
    };
  }

  /**
   * Start the Python engine microservice if not running
   */
  async startEngine() {
    const status = await this.getStatus();
    if (status.isRunning) {
      return { success: true, message: 'Voice engine already running', status };
    }

    if (!fs.existsSync(PYTHON_EXE)) {
      throw new Error(`Python virtual environment not found at: ${PYTHON_EXE}`);
    }

    console.log('🚀 [VoiceEngine] Spawning Python faster-whisper service on port 5005...');
    
    engineProcess = spawn(PYTHON_EXE, [ENGINE_SCRIPT], {
      cwd: path.join(__dirname, '../../voice-engine'),
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        HF_HOME: 'D:\\hf-cache',
      },
    });

    engineProcess.unref();

    // Poll until ready (up to 15 seconds)
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const curStatus = await this.getStatus();
      if (curStatus.isRunning) {
        console.log('✅ [VoiceEngine] Engine started and ready!');
        return { success: true, message: 'Voice engine started successfully', status: curStatus };
      }
    }

    throw new Error('Timed out waiting for Voice engine to start on port 5005');
  }

  /**
   * Transcribe using local self-hosted faster-whisper INT8
   */
  async transcribeWhisper(audioBuffer, filename = 'audio.wav') {
    // Ensure engine is running
    const status = await this.getStatus();
    if (!status.isRunning) {
      await this.startEngine();
    }

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('file', blob, filename);

    const tStart = Date.now();
    const res = await fetch(`${ENGINE_URL}/transcribe?language=ta&beam_size=2`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Whisper engine error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const networkLatency = Date.now() - tStart;

    return {
      model: 'vasista22/whisper-tamil-small-int8',
      provider: 'Self-Hosted (CPU)',
      transcript: data.transcript,
      language: data.language,
      languageConfidence: data.language_confidence,
      audioDurationSeconds: data.audio_duration_seconds,
      modelLatencyMs: data.latency_ms,
      totalLatencyMs: networkLatency,
      rtf: data.rtf,
      cpuPercent: data.cpu_percent,
      memoryMb: data.memory_mb,
    };
  }

  /**
   * Transcribe using Google Gemini Cloud Multimodal
   */
  async transcribeGemini(audioBuffer, mimeType = 'audio/wav') {
    const tStart = Date.now();
    const result = await gemini.processVoiceNote(audioBuffer, mimeType);
    const latency = Date.now() - tStart;

    if (!result) {
      throw new Error('Gemini API failed to process voice note');
    }

    return {
      model: 'gemini-3.5-flash',
      provider: 'Google Cloud (Multimodal)',
      transcript: result.transcript,
      language: result.language_detected,
      intent: result.intent,
      summary: result.summary,
      totalLatencyMs: latency,
      cpuPercent: 0, // Zero server CPU used (cloud inference)
      memoryMb: 0,   // Zero local memory used
      cost: '₹0.00 (Free Tier)',
    };
  }

  /**
   * Run multi-model benchmark on the same audio
   */
  async runComparison(audioBuffer, filename = 'sample.wav', mimeType = 'audio/wav') {
    const results = {};

    // 1. Whisper local CPU
    try {
      results.whisper = await this.transcribeWhisper(audioBuffer, filename);
    } catch (err) {
      results.whisper = { error: err.message };
    }

    // 2. Gemini Cloud
    try {
      results.gemini = await this.transcribeGemini(audioBuffer, mimeType);
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
        return {
          filename,
          sizeKb: Math.round(stat.size / 1024),
          speaker: filename.replace('sarvam_sample_', '').replace('.wav', ''),
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
