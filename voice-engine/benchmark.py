import os
import sys
import time
import psutil
from faster_whisper import WhisperModel

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "whisper-ta-small")
SAMPLE_AUDIO = os.path.join(os.path.dirname(__file__), "..", "sarvam_samples", "sarvam_sample_vijay.wav")

def get_memory_mb():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

def run_benchmark(audio_path=SAMPLE_AUDIO):
    print("=" * 60)
    print("🚀 VASISTA22 TAMIL WHISPER BENCHMARK (faster-whisper INT8)")
    print("=" * 60)
    
    if not os.path.exists(MODEL_DIR):
        print(f"❌ Error: Model directory not found: {MODEL_DIR}")
        return

    if not os.path.exists(audio_path):
        print(f"❌ Error: Audio sample not found: {audio_path}")
        return

    print(f"📁 Model Path: {MODEL_DIR}")
    print(f"🎙️ Audio Input: {os.path.basename(audio_path)}")
    print(f"💾 Initial Process RAM: {get_memory_mb():.2f} MB")
    
    # 1. Model Loading
    print("\n⏳ Loading model into memory (compute_type=int8, cpu_threads=4)...")
    t0 = time.time()
    model = WhisperModel(MODEL_DIR, device="cpu", compute_type="int8", cpu_threads=4)
    load_time = time.time() - t0
    post_load_ram = get_memory_mb()
    print(f"✅ Model Loaded in: {load_time:.2f} seconds")
    print(f"🧠 RAM footprint with model: {post_load_ram:.2f} MB (+{post_load_ram - get_memory_mb():.2f} MB)")

    # 2. Warmup & Measurement
    print("\n🎧 Transcribing audio with VAD filter & beam_size=2...")
    process = psutil.Process(os.getpid())
    
    # Measure CPU before
    process.cpu_percent(interval=None)
    t_start = time.time()
    
    segments, info = model.transcribe(
        audio_path,
        language="ta",
        beam_size=2,
        vad_filter=True,
    )
    
    transcript_segments = []
    for s in segments:
        transcript_segments.append(s.text.strip())
        
    t_end = time.time()
    cpu_usage = process.cpu_percent(interval=None)
    peak_ram = get_memory_mb()
    
    latency = t_end - t_start
    audio_duration = info.duration if hasattr(info, "duration") else 0
    rtf = latency / audio_duration if audio_duration > 0 else 0
    
    full_transcript = " ".join(transcript_segments)
    
    print("\n" + "=" * 60)
    print("📊 BENCHMARK METRICS SUMMARY")
    print("=" * 60)
    print(f"🗣️ Transcribed Tamil Text:")
    print(f"   \"{full_transcript}\"")
    print("-" * 60)
    print(f"⏱️ Audio Duration:     {audio_duration:.2f} seconds")
    print(f"⚡ Processing Latency: {latency:.3f} seconds ({latency * 1000:.0f} ms)")
    print(f"📈 Real-Time Factor:   {rtf:.2f}x ({'Faster than real-time! 🚀' if rtf < 1.0 else 'Slower than real-time'})")
    print(f"💻 CPU Utilization:    {cpu_usage:.1f}%")
    print(f"🧠 Peak RAM Usage:     {peak_ram:.2f} MB")
    print(f"🌐 Detected Language:  {info.language} (Confidence: {info.language_probability * 100:.1f}%)")
    print("=" * 60)

if __name__ == "__main__":
    audio = sys.argv[1] if len(sys.argv) > 1 else SAMPLE_AUDIO
    run_benchmark(audio)
