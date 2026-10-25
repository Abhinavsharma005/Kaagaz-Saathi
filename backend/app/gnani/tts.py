import hashlib
import io
import logging
import os
import struct
import wave
from typing import Optional, Dict, Any
import httpx
from app.config import settings
from app.gnani.client import GnaniClient

logger = logging.getLogger("kaagaz-saathi.gnani.tts")


class GnaniTimbreTTS:
    """Wrapper for Gnani Timbre Text-to-Speech REST API with disk caching."""

    def __init__(self, client: Optional[GnaniClient] = None, cache_dir: Optional[str] = None):
        self.client = client or GnaniClient()
        self.cache_dir = cache_dir or settings.TTS_CACHE_DIR
        os.makedirs(self.cache_dir, exist_ok=True)

    def _get_cache_path(self, text: str, voice: str, language: str, speed: float) -> str:
        key = f"{text.strip()}:{voice}:{language}:{speed}"
        hash_digest = hashlib.md5(key.encode("utf-8")).hexdigest()
        return os.path.join(self.cache_dir, f"{hash_digest}.wav")

    async def synthesize(
        self,
        text: str,
        voice: str = "Nalini",
        language: str = "hi-IN",
        speed: float = 1.0,
        sample_rate: int = 24000
    ) -> bytes:
        """
        Synthesizes speech using Gnani Timbre.
        Checks local cache first to save API credits.
        """
        clean_text = text.strip()
        if not clean_text:
            return self._create_empty_wav()

        cache_path = self._get_cache_path(clean_text, voice, language, speed)
        if os.path.exists(cache_path):
            logger.info(f"TTS cache hit for: '{clean_text[:30]}...' -> {cache_path}")
            with open(cache_path, "rb") as f:
                return f.read()

        if not self.client.is_configured:
            logger.info("Using mock TTS because Gnani API key is not configured or DEV_MOCK_GNANI is True")
            audio_data = self._create_synthetic_beep_wav(sample_rate=sample_rate)
            with open(cache_path, "wb") as f:
                f.write(audio_data)
            return audio_data

        payload = {
            "text": clean_text,
            "voice": voice,
            "model": "timbre-v2.5",
            "language": language,
            "speed": speed,
            "audio_config": {
                "sample_rate": sample_rate,
                "num_channels": 1,
                "sample_width": 2,
                "encoding": "linear_pcm",
                "container": "wav"
            }
        }

        async with self.client.get_http_client(timeout=30.0) as http:
            try:
                response = await http.post("/api/v1/tts/inference", json=payload)
                if response.status_code == 200:
                    audio_data = response.content
                    with open(cache_path, "wb") as f:
                        f.write(audio_data)
                    logger.info(f"Synthesized and cached {len(audio_data)} bytes for: '{clean_text[:30]}...'")
                    return audio_data
                else:
                    logger.error(f"Gnani TTS error: HTTP {response.status_code} - {response.text}")
                    # Return synthetic wav fallback to avoid breaking audio player
                    return self._create_synthetic_beep_wav(sample_rate=sample_rate)
            except Exception as e:
                logger.exception("Failed to connect to Gnani TTS API")
                return self._create_synthetic_beep_wav(sample_rate=sample_rate)

    def _create_empty_wav(self) -> bytes:
        return self._create_synthetic_beep_wav(duration_sec=0.1)

    def _create_synthetic_beep_wav(self, duration_sec: float = 0.5, sample_rate: int = 24000) -> bytes:
        """Generates a valid lightweight mono PCM 16-bit WAV file for offline testing."""
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            # Create a simple quiet sine tone
            import math
            num_samples = int(duration_sec * sample_rate)
            freq = 440.0
            samples = []
            for i in range(num_samples):
                val = int(3000 * math.sin(2 * math.pi * freq * i / sample_rate))
                samples.append(struct.pack('<h', val))
            wav_file.writeframes(b''.join(samples))
        return buf.getvalue()
