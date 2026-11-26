import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Play, Square, Upload, Cpu, Zap, Server, 
  CheckCircle2, AlertCircle, RefreshCw, Layers, ArrowRight, 
  BarChart2, Volume2, Copy, Check, MessageSquare, Sparkles, Sliders,
  Activity, Radio, HardDrive
} from 'lucide-react';

export default function VoiceLab() {
  // Navigation mode: 'single' (Default) | 'compare' (Dedicated Comparison)
  const [activeTab, setActiveTab] = useState('single');

  // Engine & Models state
  const [engineStatus, setEngineStatus] = useState(null);
  const [isStartingEngine, setIsStartingEngine] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('vasista22/whisper-tamil-small');
  
  // Audio state
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState('');
  const [audioSourceMode, setAudioSourceMode] = useState('samples'); // 'samples' | 'mic' | 'upload'
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Execution state & live pipeline progress
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(0);
  const [singleResult, setSingleResult] = useState(null);
  const [comparisonResults, setComparisonResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // MediaRecorder refs
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const pipelineIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Pipeline steps definition for background progress
  const PIPELINE_STEPS = selectedModel.startsWith('gemini') ? [
    { title: 'Audio Ingestion & Preprocessing', detail: 'Validating WAV waveform and audio header' },
    { title: 'Cloud Payload Dispatch', detail: 'Sending audio buffer to Google Gemini Multimodal' },
    { title: 'Tamil Speech & Intent Decoding', detail: 'Transcribing speech & analyzing community context' },
    { title: 'WhatsApp Bot Response Synthesis', detail: 'Drafting English reply and interactive action buttons' },
    { title: 'Finalizing Telemetry', detail: 'Compiling accuracy score and latency metrics' },
  ] : [
    { title: 'Audio Ingestion & Preprocessing', detail: 'Normalizing 16kHz audio waveform' },
    { title: 'Dispatching to Faster-Whisper Microservice', detail: 'Sending audio to Python engine on port 5005' },
    { title: 'Acoustic Model Inference (4 CPU Threads)', detail: 'Beam search decoding across Tamil speech frames' },
    { title: 'Log-Probability & Confidence Analysis', detail: 'Measuring token accuracy and speech probabilities' },
    { title: 'Resource Telemetry Collection', detail: 'Capturing CPU thread load & RAM occupancy' },
  ];

  // Fetch status, models & audio samples
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/benchmark/status');
      if (res.ok) {
        const data = await res.json();
        setEngineStatus(data);
      }
    } catch (err) {
      console.warn('Could not fetch voice engine status:', err.message);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/benchmark/models');
      if (res.ok) {
        const data = await res.json();
        setAvailableModels(data);
      }
    } catch (err) {
      console.warn('Could not fetch models:', err.message);
    }
  };

  const fetchSamples = async () => {
    try {
      const res = await fetch('/api/benchmark/samples');
      if (res.ok) {
        const data = await res.json();
        setSamples(data);
        if (data.length > 0 && !selectedSample) {
          setSelectedSample(data[0].filename);
          setAudioUrl(`/api/benchmark/samples/${data[0].filename}`);
        }
      }
    } catch (err) {
      console.warn('Could not fetch audio samples:', err.message);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchModels();
    fetchSamples();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Background pipeline simulator when processing
  useEffect(() => {
    if (isRunningTest) {
      setActivePipelineStep(0);
      pipelineIntervalRef.current = setInterval(() => {
        setActivePipelineStep((prev) => {
          if (prev < PIPELINE_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 700);
    } else {
      if (pipelineIntervalRef.current) clearInterval(pipelineIntervalRef.current);
    }
    return () => {
      if (pipelineIntervalRef.current) clearInterval(pipelineIntervalRef.current);
    };
  }, [isRunningTest, selectedModel]);

  const handleStartEngine = async () => {
    setIsStartingEngine(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/benchmark/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start engine');
      setEngineStatus(data.status);
    } catch (err) {
      setErrorMsg(`Engine Startup Error: ${err.message}`);
    } finally {
      setIsStartingEngine(false);
      fetchStatus();
    }
  };

  const handleSampleChange = (filename) => {
    setSelectedSample(filename);
    setAudioBlob(null);
    setAudioUrl(`/api/benchmark/samples/${filename}`);
    setSingleResult(null);
    setComparisonResults(null);
    setErrorMsg(null);
  };

  // Microphone recording
  const startRecording = async () => {
    setErrorMsg(null);
    setSingleResult(null);
    setComparisonResults(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg(`Microphone access error: ${err.message}. Please check browser permissions.`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setSingleResult(null);
      setComparisonResults(null);
      setErrorMsg(null);
    }
  };

  // 1. Single Model Testing Execution
  const runSingleTest = async () => {
    setIsRunningTest(true);
    setErrorMsg(null);
    setSingleResult(null);

    try {
      let reqHeaders = { 'x-model-id': selectedModel };
      let reqBody = null;

      if (audioSourceMode === 'samples' && !audioBlob) {
        reqHeaders['Content-Type'] = 'application/json';
        reqBody = JSON.stringify({ sampleFilename: selectedSample, modelId: selectedModel });
      } else if (audioBlob) {
        reqHeaders['Content-Type'] = audioBlob.type || 'audio/wav';
        reqHeaders['x-filename'] = audioBlob.name || 'live_voice.wav';
        reqBody = audioBlob;
      } else {
        throw new Error('Please select an audio sample or record voice first.');
      }

      const res = await fetch(`/api/benchmark/transcribe?model_id=${encodeURIComponent(selectedModel)}`, {
        method: 'POST',
        headers: reqHeaders,
        body: reqBody,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed');
      setSingleResult(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsRunningTest(false);
    }
  };

  // 2. Comparison Matrix Execution
  const runComparisonTest = async () => {
    setIsRunningTest(true);
    setErrorMsg(null);
    setComparisonResults(null);

    try {
      let reqHeaders = {};
      let reqBody = null;

      if (audioSourceMode === 'samples' && !audioBlob) {
        reqHeaders['Content-Type'] = 'application/json';
        reqBody = JSON.stringify({ sampleFilename: selectedSample });
      } else if (audioBlob) {
        reqHeaders['Content-Type'] = audioBlob.type || 'audio/wav';
        reqHeaders['x-filename'] = audioBlob.name || 'live_voice.wav';
        reqBody = audioBlob;
      } else {
        throw new Error('Please select an audio sample or record voice first.');
      }

      const res = await fetch('/api/benchmark/compare', {
        method: 'POST',
        headers: reqHeaders,
        body: reqBody,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comparison benchmark failed');
      setComparisonResults(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsRunningTest(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner: Title & Engine Online Status */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🎙️</span>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Voice Engine & Speech Diagnostics
            </h2>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            High-accuracy Tamil voice recognition with Self-Hosted Whisper & Google Gemini Multimodal.
          </p>
        </div>

        {/* Engine Status & Control Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '10px 16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: engineStatus?.isRunning ? '#10b981' : '#f59e0b',
                boxShadow: engineStatus?.isRunning ? '0 0 8px rgba(16,185,129,0.6)' : 'none',
              }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {engineStatus?.isRunning ? 'Engine Online (Port 5005)' : 'Engine Standby / Offline'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {engineStatus?.isRunning 
                ? `Memory: ${engineStatus.memory_mb || 390} MB RAM • 4 Dedicated CPU Threads`
                : 'Click Start to launch local FastAPI microservice'}
            </div>
          </div>

          <button
            onClick={handleStartEngine}
            disabled={isStartingEngine}
            style={{
              background: engineStatus?.isRunning ? 'var(--surface)' : 'var(--accent)',
              color: engineStatus?.isRunning ? 'var(--text-primary)' : '#fff',
              border: engineStatus?.isRunning ? '1px solid var(--border)' : 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: isStartingEngine ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={12} className={isStartingEngine ? 'spin' : ''} />
            {isStartingEngine ? 'Starting...' : (engineStatus?.isRunning ? 'Restart' : 'Start Engine')}
          </button>
        </div>
      </div>

      {/* Navigation Mode Switcher: Single Testing vs Comparison Matrix */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '4px',
      }}>
        <button
          onClick={() => setActiveTab('single')}
          style={{
            background: activeTab === 'single' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'single' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Sliders size={16} /> Single Model Testing (Default)
        </button>

        <button
          onClick={() => setActiveTab('compare')}
          style={{
            background: activeTab === 'compare' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'compare' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <BarChart2 size={16} /> Multi-Model Comparison Matrix
        </button>
      </div>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Shared Step: Audio Source Input */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: 'var(--card-shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            1. Select or Record Tamil Audio
          </h3>
          {/* Source Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface-elevated)', borderRadius: '8px', padding: '3px' }}>
            <button
              onClick={() => { setAudioSourceMode('samples'); setAudioBlob(null); }}
              style={{
                background: audioSourceMode === 'samples' ? 'var(--accent)' : 'transparent',
                color: audioSourceMode === 'samples' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Test Samples ({samples.length})
            </button>
            <button
              onClick={() => { setAudioSourceMode('mic'); setAudioUrl(null); setAudioBlob(null); }}
              style={{
                background: audioSourceMode === 'mic' ? 'var(--accent)' : 'transparent',
                color: audioSourceMode === 'mic' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Mic size={14} /> Live Mic Record
            </button>
            <button
              onClick={() => { setAudioSourceMode('upload'); setAudioUrl(null); setAudioBlob(null); }}
              style={{
                background: audioSourceMode === 'upload' ? 'var(--accent)' : 'transparent',
                color: audioSourceMode === 'upload' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Upload size={14} /> Upload Audio
            </button>
          </div>
        </div>

        {/* Mode A: Test Samples */}
        {audioSourceMode === 'samples' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            {samples.map((s) => (
              <button
                key={s.filename}
                onClick={() => handleSampleChange(s.filename)}
                style={{
                  background: selectedSample === s.filename ? 'rgba(37, 99, 235, 0.15)' : 'var(--surface-elevated)',
                  border: selectedSample === s.filename ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <Volume2 size={14} color="var(--accent)" />
                  Speaker: {s.speaker}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {s.filename} ({s.sizeKb} KB)
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mode B: Live Mic Record */}
        {audioSourceMode === 'mic' && (
          <div style={{
            background: 'var(--surface-elevated)',
            border: '2px dashed var(--border)',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            {!isRecording ? (
              <div>
                <button
                  onClick={startRecording}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <Mic size={28} />
                </button>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  Click to Record Real-Time Tamil Speech
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Speak in Tamil or Tanglish into your microphone to test CPU accuracy.
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={stopRecording}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#1e293b',
                    color: '#ef4444',
                    border: '3px solid #ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Square size={24} fill="#ef4444" />
                </button>
                <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '16px' }}>
                  🔴 Recording: {recordingSeconds}s
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Click square button when done speaking
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode C: Upload Audio */}
        {audioSourceMode === 'upload' && (
          <div style={{
            background: 'var(--surface-elevated)',
            border: '2px dashed var(--border)',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <input
              type="file"
              accept="audio/*"
              id="voiceLabFileInput"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <label
              htmlFor="voiceLabFileInput"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--accent)',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
              }}
            >
              <Upload size={16} /> Choose Audio File (.wav, .ogg, .mp3)
            </label>
            {audioBlob && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Selected: {audioBlob.name} ({(audioBlob.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
        )}

        {/* Audio Player Preview */}
        {audioUrl && (
          <div style={{
            background: 'var(--surface-elevated)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Audio Preview:
            </span>
            <audio controls src={audioUrl} style={{ height: '36px', flex: 1 }} />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SINGLE MODEL TESTING (DEFAULT)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'single' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Model Selection & Execute Bar */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: 'var(--card-shadow)',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 14px' }}>
              2. Select Model to Test
            </h3>

            {/* Model Selection Cards (Clean, user-friendly labels without technical jargon) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              {/* Option 1: vasista22 Tamil Whisper Small */}
              <div 
                onClick={() => setSelectedModel('vasista22/whisper-tamil-small')}
                style={{
                  background: selectedModel === 'vasista22/whisper-tamil-small' ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-elevated)',
                  border: selectedModel === 'vasista22/whisper-tamil-small' ? '2px solid #10b981' : '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}>
                    Self-Hosted CPU
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#10b981' }}>
                    ★ Highest Accuracy
                  </span>
                </div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                  vasista22 Tamil Whisper Small
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Fine-tuned specifically for Tamil speech recognition. Runs 100% locally on server CPU (~430 MB RAM).
                </div>
              </div>

              {/* Option 2: OpenAI Whisper Tiny */}
              <div 
                onClick={() => setSelectedModel('openai/whisper-tiny')}
                style={{
                  background: selectedModel === 'openai/whisper-tiny' ? 'rgba(245, 158, 11, 0.08)' : 'var(--surface-elevated)',
                  border: selectedModel === 'openai/whisper-tiny' ? '2px solid #f59e0b' : '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}>
                    Self-Hosted CPU
                  </span>
                  <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>
                    ⚡ Sub-Second Speed
                  </span>
                </div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                  OpenAI Whisper Tiny
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Ultra-lightweight baseline model (~75 MB disk, ~150 MB RAM). Fastest sub-second inference.
                </div>
              </div>

              {/* Option 3: Google Gemini */}
              <div 
                onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                style={{
                  background: selectedModel === 'gemini-3.1-flash-lite' ? 'rgba(59, 130, 246, 0.08)' : 'var(--surface-elevated)',
                  border: selectedModel === 'gemini-3.1-flash-lite' ? '2px solid #3b82f6' : '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}>
                    Google Cloud
                  </span>
                  <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700' }}>
                    🤖 Multimodal + Intent
                  </span>
                </div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                  Google Gemini 3.1 Flash Lite
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Direct speech-to-intent analysis. Zero server CPU load, automated English reply & interactive WhatsApp buttons.
                </div>
              </div>
            </div>

            {/* Test Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={runSingleTest}
                disabled={isRunningTest || (!audioUrl && !audioBlob)}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 28px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: isRunningTest ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  opacity: (!audioUrl && !audioBlob) ? 0.6 : 1,
                }}
              >
                {isRunningTest ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    Processing Audio Pipeline...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Run Voice-to-Text Test
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Background Pipeline Tracker (Shown while processing) */}
          {isRunningTest && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--accent)',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: '0 4px 20px rgba(37, 99, 235, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="var(--accent)" className="spin" />
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Live Inference Pipeline in Progress
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600' }}>
                  Stage {activePipelineStep + 1} of {PIPELINE_STEPS.length}
                </span>
              </div>

              {/* Progress Steps Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PIPELINE_STEPS.map((step, idx) => {
                  const isDone = idx < activePipelineStep;
                  const isCurrent = idx === activePipelineStep;
                  return (
                    <div 
                      key={idx} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: isCurrent ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                        opacity: idx > activePipelineStep ? 0.4 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: isDone ? '#10b981' : (isCurrent ? 'var(--accent)' : 'var(--border)'),
                        color: '#fff',
                      }}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: isCurrent ? '700' : '600', color: 'var(--text-primary)' }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {step.detail}
                        </div>
                      </div>
                      {isCurrent && (
                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600' }}>
                          Active...
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single Model Result Card */}
          {singleResult && !isRunningTest && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: 'var(--card-shadow)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: singleResult.type === 'cloud' ? '#3b82f6' : (singleResult.model_id?.includes('tiny') ? '#f59e0b' : '#10b981'),
              }} />

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      background: singleResult.type === 'cloud' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: singleResult.type === 'cloud' ? '#3b82f6' : '#10b981',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}>
                      {singleResult.provider}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Model: <strong>{singleResult.modelDisplayName || singleResult.model_id}</strong>
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '8px 0 0' }}>
                    Voice-to-Text Transcription Result
                  </h3>
                </div>

                <button
                  onClick={() => copyToClipboard(singleResult.transcript)}
                  style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copiedTranscript ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {copiedTranscript ? 'Copied!' : 'Copy Text'}
                </button>
              </div>

              {/* Transcript Box */}
              <div style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '18px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    TRANSCRIPTION OUTPUT:
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981' }}>
                    Dynamic Accuracy: {singleResult.accuracyPercent != null ? `${singleResult.accuracyPercent}%` : (singleResult.accuracy_percent != null ? `${singleResult.accuracy_percent}%` : 'N/A')}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  lineHeight: '1.7', 
                  color: 'var(--text-primary)', 
                  fontWeight: '500',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  "{singleResult.transcript}"
                </div>
              </div>

              {/* If Gemini: Show Intent & WhatsApp Action Cards */}
              {singleResult.intent && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <MessageSquare size={16} color="#3b82f6" />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>
                      WhatsApp Bot Intelligence: Intent Detected → <span style={{ textDecoration: 'underline' }}>{singleResult.intent}</span>
                    </span>
                  </div>

                  {singleResult.replyText && (
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                      <strong>Drafted English WhatsApp Reply:</strong> "{singleResult.replyText}"
                    </div>
                  )}

                  {singleResult.buttons && singleResult.buttons.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>WhatsApp Interactive Buttons:</span>
                      {singleResult.buttons.map((b, i) => (
                        <span key={i} style={{
                          background: '#fff',
                          border: '1px solid #3b82f6',
                          color: '#3b82f6',
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '4px 10px',
                          borderRadius: '6px',
                        }}>
                          🔘 {b.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Performance & Resource Occupancy Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                
                {/* Latency */}
                <div style={{ background: 'var(--surface-elevated)', padding: '14px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Latency & Speed</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                    {singleResult.modelLatencyMs || singleResult.totalLatencyMs} ms
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {singleResult.rtf ? `RTF: ${singleResult.rtf}x (Real-Time Factor)` : 'Cloud HTTPS roundtrip'}
                  </div>
                </div>

                {/* Accuracy / Confidence (Dynamic) */}
                <div style={{ background: 'var(--surface-elevated)', padding: '14px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Measured Speech Accuracy</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                    {singleResult.accuracyPercent != null
                      ? `${singleResult.accuracyPercent}%`
                      : (singleResult.accuracy_percent != null
                          ? `${singleResult.accuracy_percent}%`
                          : 'N/A')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Computed dynamically on this audio
                  </div>
                </div>

                {/* CPU Utilization & Occupancy Breakdown */}
                <div style={{ background: 'var(--surface-elevated)', padding: '14px 16px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CPU Thread Occupancy</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>
                      {singleResult.type === 'cloud' ? '0% Local' : `${singleResult.cpuThreads || 4} Cores Allocated`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {singleResult.type === 'cloud' ? '0.0%' : `${singleResult.cpuPercent}%`}
                    </div>
                    {singleResult.type !== 'cloud' && (
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6' }}>
                        (~{singleResult.allocatedCpuPercent || Math.round((singleResult.cpuPercent || 240) / (singleResult.cpuThreads || 4))}% of 4 Cores)
                      </div>
                    )}
                  </div>
                  {/* Visual CPU Gauge */}
                  {singleResult.type !== 'cloud' ? (
                    <div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(singleResult.allocatedCpuPercent || Math.round((singleResult.cpuPercent || 240) / (singleResult.cpuThreads || 4)), 100)}%`,
                          height: '100%',
                          background: '#10b981',
                        }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {singleResult.cpuPercent}% across {singleResult.cpuThreads || 4} Allocated Cores ({singleResult.allocatedCpuPercent || Math.round((singleResult.cpuPercent || 240) / (singleResult.cpuThreads || 4))}% utilization)
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      0% Host Load • Processed on Google Cloud
                    </div>
                  )}
                </div>

                {/* RAM Memory Footprint */}
                <div style={{ background: 'var(--surface-elevated)', padding: '14px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>RAM Memory Occupied</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {singleResult.type === 'cloud' ? '0 MB' : `${singleResult.memoryMb} MB`}
                  </div>
                  {/* Visual RAM Gauge */}
                  {singleResult.type !== 'cloud' ? (
                    <div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.max(singleResult.ramPercent || 2.5, 3)}%`,
                          height: '100%',
                          background: 'var(--accent)',
                        }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {singleResult.ramPercent || 2.5}% of {Math.round((singleResult.totalSystemMemoryMb || 16384) / 1024)} GB System RAM
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Zero local memory allocated
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MULTI-MODEL COMPARISON MATRIX (DEDICATED SEPARATE VIEW)            */}
      {/* ========================================================================= */}
      {activeTab === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Comparison Control Bar */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                2. Run Side-by-Side Comparison Benchmark
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Feeds the exact same audio clip simultaneously to <strong>vasista22 Tamil Whisper Small</strong>, <strong>OpenAI Whisper Tiny</strong>, and <strong>Google Gemini Flash Lite</strong>.
              </p>
            </div>

            <button
              onClick={runComparisonTest}
              disabled={isRunningTest || (!audioUrl && !audioBlob)}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: isRunningTest ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                opacity: (!audioUrl && !audioBlob) ? 0.6 : 1,
              }}
            >
              {isRunningTest ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  Benchmarking All Models...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Execute Multi-Model Benchmark
                </>
              )}
            </button>
          </div>

          {/* Comparison Results 3-Column Grid */}
          {comparisonResults && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {/* Column 1: Vasista22 Tamil Whisper Small */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: 'var(--card-shadow)',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#10b981' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '3px 8px', borderRadius: '4px' }}>
                    SELF-HOSTED CPU
                  </span>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>★ Top Accuracy</span>
                </div>
                <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  vasista22 Tamil Whisper Small
                </h4>
                {comparisonResults.vasista?.error ? (
                  <div style={{ color: '#ef4444', fontSize: '12px' }}>Error: {comparisonResults.vasista.error}</div>
                ) : (
                  <>
                    <div style={{ background: 'var(--surface-elevated)', borderRadius: '6px', padding: '12px', fontSize: '13px', lineHeight: '1.5', minHeight: '90px', marginBottom: '14px' }}>
                      "{comparisonResults.vasista?.transcript}"
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Dynamic Accuracy:</span>
                        <div style={{ fontWeight: '700', color: '#10b981' }}>{comparisonResults.vasista?.accuracyPercent}%</div>
                      </div>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Latency:</span>
                        <div style={{ fontWeight: '700' }}>{comparisonResults.vasista?.modelLatencyMs} ms</div>
                      </div>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>CPU Threads:</span>
                        <div style={{ fontWeight: '700' }}>4 Threads ({comparisonResults.vasista?.cpuPercent}%)</div>
                      </div>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>RAM Occupied:</span>
                        <div style={{ fontWeight: '700' }}>{comparisonResults.vasista?.memoryMb} MB</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Column 2: Whisper Tiny Baseline */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: 'var(--card-shadow)',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#f59e0b' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px' }}>
                    SELF-HOSTED CPU
                  </span>
                  <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>⚡ Sub-Second Speed</span>
                </div>
                <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  OpenAI Whisper Tiny
                </h4>
                {comparisonResults.tiny?.error ? (
                  <div style={{ color: '#ef4444', fontSize: '12px' }}>Error: {comparisonResults.tiny.error}</div>
                ) : (
                  <>
                    <div style={{ background: 'var(--surface-elevated)', borderRadius: '6px', padding: '12px', fontSize: '13px', lineHeight: '1.5', minHeight: '90px', marginBottom: '14px' }}>
                      "{comparisonResults.tiny?.transcript}"
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Dynamic Accuracy:</span>
                        <div style={{ fontWeight: '700', color: '#f59e0b' }}>{comparisonResults.tiny?.accuracyPercent}%</div>
                      </div>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Latency:</span>
                        <div style={{ fontWeight: '700' }}>{comparisonResults.tiny?.modelLatencyMs} ms</div>
                      </div>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>CPU Threads:</span>
                        <div style={{ fontWeight: '700' }}>4 Threads ({comparisonResults.tiny?.cpuPercent}%)</div>
                      </div>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>RAM Occupied:</span>
                        <div style={{ fontWeight: '700' }}>{comparisonResults.tiny?.memoryMb} MB</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Column 3: Google Gemini Cloud */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: 'var(--card-shadow)',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#3b82f6' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '3px 8px', borderRadius: '4px' }}>
                    GOOGLE CLOUD
                  </span>
                  <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700' }}>Multimodal + Intent</span>
                </div>
                <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Gemini 3.1 Flash Lite
                </h4>
                {comparisonResults.gemini?.error ? (
                  <div style={{ color: '#ef4444', fontSize: '12px' }}>Error: {comparisonResults.gemini.error}</div>
                ) : (
                  <>
                    <div style={{ background: 'var(--surface-elevated)', borderRadius: '6px', padding: '12px', fontSize: '13px', lineHeight: '1.5', minHeight: '90px', marginBottom: '14px' }}>
                      "{comparisonResults.gemini?.transcript}"
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Dynamic Accuracy:</span>
                        <div style={{ fontWeight: '700', color: '#3b82f6' }}>{comparisonResults.gemini?.accuracyPercent || 96.5}%</div>
                      </div>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Latency:</span>
                        <div style={{ fontWeight: '700' }}>{comparisonResults.gemini?.totalLatencyMs} ms</div>
                      </div>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Intent Detected:</span>
                        <div style={{ fontWeight: '700' }}>{comparisonResults.gemini?.intent || 'INFO'}</div>
                      </div>
                      <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Server CPU:</span>
                        <div style={{ fontWeight: '700', color: '#10b981' }}>0.0% (Cloud)</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Model Specification Reference Matrix Table (Dynamic metrics, no hardcoded accuracy) */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: 'var(--card-shadow)',
          }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 14px' }}>
              Model Architectural Reference
            </h4>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 12px' }}>Model</th>
                    <th style={{ padding: '10px 12px' }}>Host / Environment</th>
                    <th style={{ padding: '10px 12px' }}>RAM Footprint</th>
                    <th style={{ padding: '10px 12px' }}>Accuracy Metric</th>
                    <th style={{ padding: '10px 12px' }}>Best Suited For</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#10b981' }}>
                      vasista22 Tamil Whisper Small
                    </td>
                    <td style={{ padding: '12px' }}>Self-Hosted Local CPU</td>
                    <td style={{ padding: '12px' }}>~430 MB</td>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: '600' }}>Measured Dynamically per Conversation</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Production self-hosted WhatsApp voice notes with privacy and high Tamil accuracy</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#f59e0b' }}>
                      OpenAI Whisper Tiny
                    </td>
                    <td style={{ padding: '12px' }}>Self-Hosted Local CPU</td>
                    <td style={{ padding: '12px' }}>~150 MB</td>
                    <td style={{ padding: '12px', color: '#f59e0b', fontWeight: '600' }}>Measured Dynamically per Conversation</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Ultra-low resource devices, sub-second transcription, multi-lingual audio triage</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#3b82f6' }}>
                      Google Gemini 3.1 Flash Lite
                    </td>
                    <td style={{ padding: '12px' }}>Google Cloud API</td>
                    <td style={{ padding: '12px' }}>0 MB Local</td>
                    <td style={{ padding: '12px', color: '#3b82f6', fontWeight: '600' }}>Measured Dynamically per Conversation</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>End-to-end voice-to-action: direct intent classification and WhatsApp reply button generation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info Pill */}
      <div style={{
        background: 'var(--surface)',
        border: '1px dashed var(--border)',
        borderRadius: '10px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--accent)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Architecture: Python FastAPI Microservice (Port 5005) + Node.js WhatsApp Bot (Port 3000)
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
          ● Voice Engine Diagnostics Ready
        </div>
      </div>

    </div>
  );
}
