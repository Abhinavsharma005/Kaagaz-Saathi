from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.gnani.stt import GnaniPrismaSTT
from app.gnani.tts import GnaniTimbreTTS
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("kaagaz-saathi")

app = FastAPI(
    title="Kaagaz Saathi API",
    description="Voice-First Document Pre-Check for Government Schemes (Gnani AI)",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stt_client = GnaniPrismaSTT()
tts_client = GnaniTimbreTTS()


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Kaagaz Saathi Backend",
        "gnani_configured": bool(settings.GNANI_API_KEY and not settings.DEV_MOCK_GNANI),
        "mock_mode": settings.DEV_MOCK_GNANI,
        "base_url": settings.GNANI_BASE_URL
    }


@app.post("/api/speak")
async def speak(
    text: str = Form(...),
    language: str = Form("hi-IN"),
    voice: str = Form("Nalini")
):
    """Synthesize text to speech using Gnani Timbre, with caching."""
    audio_bytes = await tts_client.synthesize(text=text, voice=voice, language=language)
    return Response(content=audio_bytes, media_type="audio/wav")
