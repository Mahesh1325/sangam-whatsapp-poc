import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Play, Square, Upload, Cpu, Zap, Server, 
  CheckCircle2, AlertCircle, RefreshCw, Layers, ArrowRight, BarChart2 
} from 'lucide-react';

export default function VoiceLab() {
  const [engineStatus, setEngineStatus] = useState(null);
  const [isStartingEngine, setIsStartingEngine] = useState(false);
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState('');
  
  // Audio state
  const [audioSourceMode, setAudioSourceMode] = useState('samples'); // 'samples' | 'mic' | 'upload'
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Benchmarking state
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkModel, setBenchmarkModel] = useState('all'); // 'all' | 'whisper' | 'gemini'
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Fetch engine status & samples
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
    fetchSamples();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartEngine = async () => {
    setIsStartingEngine(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/benchmark/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start engine');
      setEngineStatus(data.status);
    } catch (err) {
      setErrorMsg(`Failed to start engine: ${err.message}`);
    } finally {
      setIsStartingEngine(false);
      fetchStatus();
    }
  };

  const handleSampleChange = (filename) => {
    setSelectedSample(filename);
    setAudioBlob(null);
    setAudioUrl(`/api/benchmark/samples/${filename}`);
    setResults(null);
    setErrorMsg(null);
  };

  // Microphone recording handlers
  const startRecording = async () => {
    setErrorMsg(null);
    setResults(null);
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
      setResults(null);
      setErrorMsg(null);
    }
  };

  // Execute benchmark
  const runBenchmark = async () => {
    setIsRunningBenchmark(true);
    setErrorMsg(null);
    setResults(null);

    try {
      let reqHeaders = { 'x-model': benchmarkModel };
      let reqBody = null;

      if (audioSourceMode === 'samples' && !audioBlob) {
        reqHeaders['Content-Type'] = 'application/json';
        reqBody = JSON.stringify({ sampleFilename: selectedSample });
      } else if (audioBlob) {
        reqHeaders['Content-Type'] = audioBlob.type || 'audio/wav';
        reqHeaders['x-filename'] = audioBlob.name || 'live_voice.wav';
        reqBody = audioBlob;
      } else {
        throw new Error('Please select a sample or record audio first.');
      }

      const res = await fetch(`/api/benchmark/compare?model=${benchmarkModel}`, {
        method: 'POST',
        headers: reqHeaders,
        body: reqBody,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Benchmark run failed');

      setResults(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Banner & Engine Status */}
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
            <span style={{ fontSize: '24px' }}>🔬</span>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Voice Model Benchmark & Testing Lab
            </h2>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Compare self-hosted CPU speech models (vasista22 Tamil Whisper INT8) with Cloud Multimodal AI (Google Gemini).
          </p>
        </div>

        {/* Engine Status Card */}
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
                boxShadow: engineStatus?.isRunning ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
              }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {engineStatus?.isRunning ? 'Whisper Engine Online' : 'Engine Offline (Standby)'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Model: vasista22/whisper-ta-small (INT8 CPU)
              {engineStatus?.memory_mb ? ` • RAM: ${engineStatus.memory_mb} MB` : ''}
            </div>
          </div>

          {!engineStatus?.isRunning && (
            <button
              onClick={handleStartEngine}
              disabled={isStartingEngine}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={12} className={isStartingEngine ? 'spin' : ''} />
              {isStartingEngine ? 'Starting...' : 'Start Engine'}
            </button>
          )}
        </div>
      </div>

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
          {errorMsg}
        </div>
      )}

      {/* 2. Audio Input Selection */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: 'var(--card-shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            1. Select or Record Audio
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
          <div>
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
                  <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    Speaker: {s.speaker.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    File: {s.filename} ({s.sizeKb} KB)
                  </div>
                </button>
              ))}
            </div>
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
                  Click to Record Tamil / Tanglish Speech
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Speak clearly into your microphone to test real-time CPU accuracy.
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
                    animation: 'pulse 1.5s infinite',
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

      {/* 3. Benchmark Control Bar */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Benchmark Target:
          </span>
          <select
            value={benchmarkModel}
            onChange={(e) => setBenchmarkModel(e.target.value)}
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            <option value="all">🔥 Compare Both (Whisper vs Gemini)</option>
            <option value="whisper">🖥️ Self-Hosted vasista22 Tamil Whisper (CPU)</option>
            <option value="gemini">☁️ Cloud Google Gemini 3.5 Flash</option>
          </select>
        </div>

        <button
          onClick={runBenchmark}
          disabled={isRunningBenchmark || (!audioUrl && !audioBlob)}
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: isRunningBenchmark ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
            opacity: (!audioUrl && !audioBlob) ? 0.6 : 1,
          }}
        >
          {isRunningBenchmark ? (
            <>
              <RefreshCw size={16} className="spin" />
              Running Inference...
            </>
          ) : (
            <>
              <Zap size={16} />
              Run Model Benchmark
            </>
          )}
        </button>
      </div>

      {/* 4. Comparison Results Cards */}
      {results && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {/* Card 1: Self-Hosted Whisper */}
          {(results.whisper || benchmarkModel === 'whisper') && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px 24px',
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
                background: '#10b981',
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}>
                    Self-Hosted (CPU)
                  </span>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '6px 0 0' }}>
                    vasista22/whisper-tamil-small
                  </h4>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  CTranslate2 INT8
                </div>
              </div>

              {results.whisper.error ? (
                <div style={{ color: '#ef4444', fontSize: '13px' }}>
                  Error: {results.whisper.error}
                </div>
              ) : (
                <>
                  {/* Transcript Box */}
                  <div style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Transcribed Output (Tamil):
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)', fontWeight: '500' }}>
                      "{results.whisper.transcript}"
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Processing Latency</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                        {results.whisper.modelLatencyMs} ms
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        RTF: {results.whisper.rtf}x (Real-Time Factor)
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CPU Utilization</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {results.whisper.cpuPercent}%
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Across 4 CPU threads
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>RAM Footprint</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {results.whisper.memoryMb} MB
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Lightweight int8 model
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Inference Cost</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                        ₹0.00
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Runs 100% on your server
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Card 2: Google Gemini Cloud */}
          {(results.gemini || benchmarkModel === 'gemini') && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px 24px',
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
                background: '#3b82f6',
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}>
                    Cloud API
                  </span>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '6px 0 0' }}>
                    Google Gemini 3.5 Flash
                  </h4>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Native Multimodal
                </div>
              </div>

              {results.gemini.error ? (
                <div style={{ color: '#ef4444', fontSize: '13px' }}>
                  Error: {results.gemini.error}
                </div>
              ) : (
                <>
                  {/* Transcript Box */}
                  <div style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Transcribed Output (Tamil):
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)', fontWeight: '500' }}>
                      "{results.gemini.transcript}"
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cloud Latency</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#3b82f6', marginTop: '2px' }}>
                        {results.gemini.totalLatencyMs} ms
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Includes HTTPS network roundtrip
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Server CPU Used</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                        0.0%
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Processed on Google Cloud
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Extracted Intent</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {results.gemini.intent || 'Detected'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Direct intent classification
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cost</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                        ₹0.00
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        1,500 daily requests free
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Future Models Extensibility Section */}
      <div style={{
        background: 'var(--surface)',
        border: '1px dashed var(--border)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={18} style={{ color: 'var(--accent)' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Ready for Additional Voice Models
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Easily plug in more models (e.g. AI4Bharat IndicWav2Vec, Whisper-Medium, or Sarvam Saaras) for comparative accuracy.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
            + IndicWav2Vec
          </span>
          <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
            + Whisper Medium
          </span>
          <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
            + Sarvam Saaras
          </span>
        </div>
      </div>
    </div>
  );
}
