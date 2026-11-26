import os
import time
import tempfile
import psutil
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
VASISTA_DIR = os.path.join(MODELS_DIR, "whisper-ta-small")
TINY_DIR = os.path.join(MODELS_DIR, "whisper-tiny")

# Loaded model cache: model_id -> WhisperModel instance
loaded_models = {}

def get_or_load_model(model_id: str):
    # Normalize model_id
    clean_id = model_id.strip()
    if clean_id in loaded_models:
        return loaded_models[clean_id]

    print(f"⏳ [Engine] Loading model '{clean_id}' into memory...")
    t0 = time.time()

    if "tiny" in clean_id.lower():
        target_path = TINY_DIR if os.path.exists(TINY_DIR) else "tiny"
        m = WhisperModel(target_path, device="cpu", compute_type="int8", cpu_threads=4)
        clean_id = "openai/whisper-tiny"
    else:
        m = WhisperModel(VASISTA_DIR, device="cpu", compute_type="int8", cpu_threads=4)
        clean_id = "vasista22/whisper-tamil-small"

    load_time = time.time() - t0
    loaded_models[clean_id] = m
    # Also alias short names
    if "tiny" in clean_id:
        loaded_models["tiny"] = m
        loaded_models["whisper-tiny"] = m
    else:
        loaded_models["vasista"] = m
        loaded_models["whisper-ta-small"] = m

    print(f"✅ [Engine] Loaded '{clean_id}' in {load_time:.2f}s!")
    return m

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load vasista22 Tamil small on startup
    try:
        get_or_load_model("vasista22/whisper-tamil-small")
    except Exception as e:
        print(f"⚠️ [Engine] Startup pre-load error: {e}")
    yield

app = FastAPI(title="Sangam Multi-Model Voice Engine", version="2.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    process = psutil.Process(os.getpid())
    unique_loaded = list(set([k for k in loaded_models.keys() if "/" in k]))
    return {
        "status": "ready" if len(loaded_models) > 0 else "standby",
        "loaded_models": unique_loaded,
        "memory_mb": round(process.memory_info().rss / (1024 * 1024), 2),
        "cpu_threads": 4,
    }

@app.get("/models")
def list_models():
    return [
        {
            "id": "vasista22/whisper-tamil-small",
            "name": "vasista22/whisper-tamil-small",
            "displayName": "Tamil Whisper Small (Fine-Tuned)",
            "provider": "Self-Hosted CPU",
            "type": "whisper",
            "quantization": "INT8 (CTranslate2)",
            "size": "~248 MB",
            "memory": "~430 MB RAM",
            "is_loaded": "vasista22/whisper-tamil-small" in loaded_models,
            "description": "Specially fine-tuned for high accuracy on native Tamil speech and common community vocabulary.",
        },
        {
            "id": "openai/whisper-tiny",
            "name": "openai/whisper-tiny",
            "displayName": "Whisper Tiny (Ultra-Fast Baseline)",
            "provider": "Self-Hosted CPU",
            "type": "whisper",
            "quantization": "INT8 (CTranslate2)",
            "size": "~75 MB",
            "memory": "~150 MB RAM",
            "is_loaded": "openai/whisper-tiny" in loaded_models,
            "description": "Ultra-lightweight multilingual baseline model for sub-second low-resource devices.",
        },
        {
            "id": "gemini-3.1-flash-lite",
            "name": "Google Gemini 3.1 Flash Lite",
            "displayName": "Gemini 3.1 Flash Lite (Cloud)",
            "provider": "Google Cloud",
            "type": "cloud",
            "quantization": "N/A (Cloud Multimodal API)",
            "size": "Cloud Hosted",
            "memory": "0 MB Local",
            "is_loaded": True,
            "description": "High-speed multimodal LLM with direct Tamil comprehension, sentiment & WhatsApp intent detection.",
        },
    ]

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    model_id: str = Query("vasista22/whisper-tamil-small", description="Model ID to use"),
    language: str = Query("ta", description="Language code"),
    beam_size: int = Query(2, description="Beam search width"),
):
    try:
        model = get_or_load_model(model_id)
    except Exception as e:
        return {"error": f"Failed to load model {model_id}: {str(e)}"}

    process = psutil.Process(os.getpid())
    process.cpu_percent(interval=None)

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

        # Resolve clean model display name
        resolved_model_id = "openai/whisper-tiny" if "tiny" in model_id.lower() else "vasista22/whisper-tamil-small"

        return {
            "transcript": " ".join(texts),
            "language": info.language,
            "language_confidence": round(getattr(info, "language_probability", 1.0) * 100, 1),
            "audio_duration_seconds": duration,
            "latency_ms": latency_ms,
            "rtf": rtf,
            "cpu_percent": round(cpu_usage, 1),
            "memory_mb": memory_mb,
            "model_id": resolved_model_id,
        }
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5005)
