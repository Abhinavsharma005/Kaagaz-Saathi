import io
import logging
from typing import Optional, Dict, Any
import httpx
from app.config import settings
from app.gnani.client import GnaniClient

logger = logging.getLogger("kaagaz-saathi.gnani.stt")


class GnaniPrismaSTT:
    """Wrapper for Gnani Prisma Speech-to-Text REST API."""

    def __init__(self, client: Optional[GnaniClient] = None):
        self.client = client or GnaniClient()

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        content_type: str = "audio/wav",
        language_code: str = "hi-IN"
    ) -> Dict[str, Any]:
        """
        Transcribes audio using Gnani Prisma v2.5.
        
        Args:
            audio_bytes: Raw binary audio.
            filename: Audio filename with proper extension (.wav, .mp3, etc.).
            content_type: MIME type of audio.
            language_code: BCP-47 tag, e.g., 'hi-IN' or 'en-IN'.
            
        Returns:
            Dictionary with { "success": bool, "transcript": str, "model": str, "request_id": str }
        """
        if not self.client.is_configured:
            logger.info("Using mock STT because Gnani API key is not configured or DEV_MOCK_GNANI is True")
            return self._mock_transcribe(audio_bytes, language_code)

        url = f"{self.client.base_url}/stt/v3"
        files = {
            "audio_file": (filename, io.BytesIO(audio_bytes), content_type)
        }
        data = {
            "language_code": language_code
        }

        async with self.client.get_http_client(timeout=30.0) as http:
            try:
                response = await http.post(
                    "/stt/v3",
                    files=files,
                    data=data
                )
                if response.status_code == 200:
                    res_json = response.json()
                    transcript = res_json.get("transcript") or res_json.get("text", "")
                    return {
                        "success": True,
                        "transcript": transcript.strip(),
                        "model": res_json.get("model", "gnani-prisma-v2.5"),
                        "request_id": res_json.get("request_id", "")
                    }
                else:
                    logger.error(f"Gnani STT error: HTTP {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "transcript": "",
                        "error": f"HTTP {response.status_code}: {response.text}",
                        "model": "gnani-prisma-v2.5"
                    }
            except Exception as e:
                logger.exception("Failed to connect to Gnani STT API")
                return {
                    "success": False,
                    "transcript": "",
                    "error": str(e),
                    "model": "gnani-prisma-v2.5"
                }

    def _mock_transcribe(self, audio_bytes: bytes, language_code: str) -> Dict[str, Any]:
        """Deterministic mock transcriber for local development and offline testing."""
        # For mock testing, length or basic content can be simulated
        sample_responses_hi = [
            "मेरा नाम राजेश कुमार शर्मा है",
            "मेरी वार्षिक आय दो लाख रुपये है",
            "हाँ सही है",
            "नहीं गलत है"
        ]
        # Return a clean Hindi sample
        return {
            "success": True,
            "transcript": "मेरा नाम राजेश कुमार शर्मा है",
            "model": "gnani-prisma-v2.5 (mock)",
            "request_id": "mock-stt-request-id"
        }
