import time
import uuid
import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from app.models import ExtractedDocument, PreCheckReport

logger = logging.getLogger("kaagaz-saathi.session")


class VoiceQuestion(BaseModel):
    id: str
    field_key: str
    prompt_hi: str
    prompt_en: str
    expected_type: str  # "name", "amount", etc.


DEFAULT_QUESTIONS = [
    VoiceQuestion(
        id="q_name",
        field_key="name",
        prompt_hi="नमस्ते! कृपया अपना पूरा नाम बताएं जैसा आधार कार्ड पर लिखा है।",
        prompt_en="Hello! Please state your full name as written on your Aadhaar card.",
        expected_type="name"
    ),
    VoiceQuestion(
        id="q_income",
        field_key="annual_income",
        prompt_hi="धन्यवाद। अब बताएं कि आपके परिवार की कुल वार्षिक आय कितनी है?",
        prompt_en="Thank you. Now please state your family's total annual income.",
        expected_type="amount"
    )
]


class SessionData(BaseModel):
    session_id: str
    scheme_id: str
    created_at: float = Field(default_factory=time.time)
    last_active: float = Field(default_factory=time.time)
    questions: List[VoiceQuestion] = DEFAULT_QUESTIONS
    current_q_index: int = 0
    spoken_answers: Dict[str, Any] = {}
    pending_answer: Optional[Dict[str, Any]] = None  # {"field_key": ..., "value": ..., "transcript": ...}
    documents: Dict[str, ExtractedDocument] = {}
    last_report: Optional[PreCheckReport] = None


class SessionManager:
    """Ephemeral In-Memory Session Store with TTL auto-cleanup."""

    def __init__(self, ttl_seconds: int = 3600):
        self.ttl = ttl_seconds
        self.sessions: Dict[str, SessionData] = {}

    def _cleanup_expired(self):
        now = time.time()
        expired = [sid for sid, s in self.sessions.items() if now - s.last_active > self.ttl]
        for sid in expired:
            del self.sessions[sid]
            logger.info(f"Purged expired session: {sid}")

    def create_session(self, scheme_id: str = "mp_post_matric_scholarship") -> SessionData:
        self._cleanup_expired()
        session_id = str(uuid.uuid4())
        session = SessionData(
            session_id=session_id,
            scheme_id=scheme_id,
            questions=DEFAULT_QUESTIONS
        )
        self.sessions[session_id] = session
        logger.info(f"Created new session: {session_id} for scheme: {scheme_id}")
        return session

    def get_session(self, session_id: str) -> Optional[SessionData]:
        self._cleanup_expired()
        session = self.sessions.get(session_id)
        if session:
            session.last_active = time.time()
        return session

    def get_or_create_session(self, session_id: str, scheme_id: str = "mp_post_matric_scholarship") -> SessionData:
        self._cleanup_expired()
        session = self.sessions.get(session_id)
        if not session:
            logger.info(f"Session {session_id} not found in memory (backend may have restarted). Auto-recovering session.")
            session = SessionData(
                session_id=session_id,
                scheme_id=scheme_id,
                questions=DEFAULT_QUESTIONS
            )
            self.sessions[session_id] = session
        else:
            session.last_active = time.time()
        return session

    def delete_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Explicitly destroyed session: {session_id}")
            return True
        return False


session_manager = SessionManager()
