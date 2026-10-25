"""
Phase 1 Smoke Test for Gnani AI STT & TTS integration.
Tests Gnani Prisma STT and Gnani Timbre TTS in both live (if key provided) and mock modes.
"""
import asyncio
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app.config import settings
from app.gnani.stt import GnaniPrismaSTT
from app.gnani.tts import GnaniTimbreTTS


async def main():
    print("=" * 60)
    print("Kaagaz Saathi - Gnani AI Smoke Test")
    print(f"Gnani Base URL: {settings.GNANI_BASE_URL}")
    print(f"Gnani API Key Configured: {'YES' if settings.GNANI_API_KEY else 'NO (running in mock mode)'}")
    print(f"DEV_MOCK_GNANI: {settings.DEV_MOCK_GNANI}")
    print("=" * 60)

    # 1. Test Gnani Timbre TTS
    print("\n1. Testing Gnani Timbre TTS (Text-to-Speech)...")
    tts = GnaniTimbreTTS()
    sample_text = "नमस्ते, कागज़ साथी में आपका स्वागत है।"
    print(f"Synthesizing text: '{sample_text}'")
    audio_data = await tts.synthesize(text=sample_text, language="hi-IN")
    print(f"-> Generated {len(audio_data)} bytes of WAV audio")
    assert len(audio_data) > 44, "Audio data must include valid WAV header (>44 bytes)"
    assert audio_data[:4] == b"RIFF", "Audio header must start with RIFF"
    print("-> Timbre TTS check PASSED.")

    # 2. Test Gnani Prisma STT
    print("\n2. Testing Gnani Prisma STT (Speech-to-Text)...")
    stt = GnaniPrismaSTT()
    print("Transcribing generated audio buffer...")
    stt_res = await stt.transcribe(
        audio_bytes=audio_data,
        filename="sample.wav",
        language_code="hi-IN"
    )
    print(f"-> STT Result: {stt_res}")
    assert stt_res.get("success") is True, f"STT failed: {stt_res.get('error')}"
    assert len(stt_res.get("transcript", "")) > 0, "STT returned empty transcript"
    print(f"-> Transcript: '{stt_res.get('transcript')}'")
    print("-> Prisma STT check PASSED.")

    # 3. Test TTS Cache
    print("\n3. Testing TTS Cache Hit...")
    cached_data = await tts.synthesize(text=sample_text, language="hi-IN")
    assert cached_data == audio_data, "Cached audio must match initial generation"
    print("-> TTS Cache check PASSED.")

    print("\n" + "=" * 60)
    print("ALL PHASE 1 SMOKE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
