import os
import time
import tempfile
import psutil
from fastapi import FastAPI, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "whisper-ta-small")

app = FastAPI(title="Sangam Voice Benchmark Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
model_load_time = 0

@app.on_event("startup")
def load_whisper():
    global model, model_load_time
    if os.path.exists(MODEL_DIR):
        print(f"⏳ [Engine] Pre-loading faster-whisper model from {MODEL_DIR}...")
        t0 = time.time()
        model = WhisperModel(MODEL_DIR, device="cpu", compute_type="int8", cpu_threads=4)
        model_load_time = time.time() - t0
        print(f"✅ [Engine] Whisper model loaded into memory in {model_load_time:.2f}s!")
    else:
        print(f"⚠️ [Engine] Model directory not found yet: {MODEL_DIR}")

@app.get("/health")
def health():
    process = psutil.Process(os.getpid())
    return {
        "status": "ready" if model is not None else "model_missing",
        "model_id": "vasista22/whisper-tamil-small",
        "quantization": "int8",
        "device": "cpu",
        "memory_mb": round(process.memory_info().rss / (1024 * 1024), 2),
        "cpu_threads": 4,
        "load_time_seconds": round(model_load_time, 2),
    }

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Query("ta", description="Language code e.g. ta for Tamil"),
    beam_size: int = Query(2, description="Beam search width"),
):
    global model
    if model is None:
        if os.path.exists(MODEL_DIR):
            load_whisper()
        else:
            return {"error": "Model not found on disk. Please complete model download first."}

    process = psutil.Process(os.getpid())
    process.cpu_percent(interval=None) # Reset CPU measurement counter
    
    # Write uploaded audio to a temporary file
    suffix = os.path.splitext(file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        t_start = time.time()
        segments, info = model.transcribe(
            tmp_path,
            language=language if language != "auto" else None,
            beam_size=beam_size,
            vad_filter=True,
        )

        texts = [s.text.strip() for s in segments]
        t_end = time.time()

        cpu_usage = process.cpu_percent(interval=None)
        memory_mb = round(process.memory_info().rss / (1024 * 1024), 2)
        latency_ms = round((t_end - t_start) * 1000, 1)
        duration = round(getattr(info, "duration", 0), 2)
        rtf = round((t_end - t_start) / duration, 3) if duration > 0 else 0

        return {
            "transcript": " ".join(texts),
            "language": info.language,
            "language_confidence": round(getattr(info, "language_probability", 1.0) * 100, 1),
            "audio_duration_seconds": duration,
            "latency_ms": latency_ms,
            "rtf": rtf,
            "cpu_percent": round(cpu_usage, 1),
            "memory_mb": memory_mb,
            "model": "vasista22/whisper-tamil-small-int8 (Self-Hosted)",
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5005)
