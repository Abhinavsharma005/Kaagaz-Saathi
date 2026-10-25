import logging
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger("kaagaz-saathi.gnani")


class GnaniClient:
    """Base client for interacting with Gnani AI Vachana endpoints."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.GNANI_API_KEY
        self.base_url = (base_url or settings.GNANI_BASE_URL).rstrip("/")
        self.headers = {
            "X-API-Key-ID": self.api_key
        }

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip() and not settings.DEV_MOCK_GNANI)

    def get_http_client(self, timeout: float = 30.0) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.base_url,
            headers=self.headers,
            timeout=httpx.Timeout(timeout, connect=10.0),
            follow_redirects=True
        )
