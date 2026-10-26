import logging
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, Response, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import settings
from app.gnani.stt import GnaniPrismaSTT
from app.gnani.tts import GnaniTimbreTTS
from app.session import session_manager, SessionData, VoiceQuestion
from app.rules.engine import RulesEngine
from app.docs.ocr import process_document
from app.matching.names import clean_name
from app.matching.amounts import parse_amount, format_inr

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("kaagaz-saathi")

app = FastAPI(
    title="Kaagaz Saathi API",
    description="Voice-First Document Pre-Check for Government Schemes (The Great Indian AI Internship Challenge)",
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
rules_engine = RulesEngine()


# Request / Response Schemas
class CreateSessionRequest(BaseModel):
    scheme_id: str = "mp_post_matric_scholarship"


class SelectSchemeRequest(BaseModel):
    session_id: str
    scheme_id: str


class ConfirmAnswerRequest(BaseModel):
    session_id: str
    decision: Optional[str] = None  # "yes" or "no" if manually clicked


def _get_voice_questions_for_scheme(scheme) -> List[VoiceQuestion]:
    """Generates only the relevant questions tailored to the selected scheme."""
    if not scheme or not scheme.voice_questions:
        return [
            VoiceQuestion(
                id="q_name",
                field_key="name",
                prompt_hi="नमस्ते! कृपया अपना पूरा नाम बताएं जैसा दस्तावेज़ पर लिखा है।",
                prompt_en="Hello! Please state your full name as written on your document.",
                expected_type="name"
            )
        ]
    return [
        VoiceQuestion(
            id=q["id"],
            field_key=q["field_key"],
            prompt_hi=q["prompt_hi"],
            prompt_en=q["prompt_en"],
            expected_type=q.get("expected_type", "name")
        )
        for q in scheme.voice_questions
    ]


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Kaagaz Saathi Backend",
        "gnani_configured": bool(settings.GNANI_API_KEY and not settings.DEV_MOCK_GNANI),
        "mock_mode": settings.DEV_MOCK_GNANI,
        "base_url": settings.GNANI_BASE_URL
    }


@app.get("/api/schemes")
async def list_schemes():
    schemes = []
    # Desired display order
    order = ["aadhaar_check", "income_cert_check", "mp_post_matric_scholarship", "caste_cert_check", "other_doc_check"]
    sorted_keys = sorted(rules_engine.schemes.keys(), key=lambda k: order.index(k) if k in order else 99)
    for sid in sorted_keys:
        sc = rules_engine.schemes[sid]
        schemes.append({
            "id": sc.scheme,
            "title_hi": sc.title_hi,
            "title_en": sc.title_en,
            "description_hi": sc.description_hi,
            "description_en": sc.description_en,
            "icon": sc.icon or "📄",
            "status": sc.status,
            "source_url": sc.source_url,
            "required_documents": sc.required_documents,
            "optional_documents": sc.optional_documents or []
        })
    return {"schemes": schemes}


@app.post("/api/session")
async def create_session(req: CreateSessionRequest):
    scheme = rules_engine.get_scheme(req.scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail=f"Scheme '{req.scheme_id}' not found")

    questions = _get_voice_questions_for_scheme(scheme)
    session = session_manager.create_session(scheme_id=req.scheme_id, questions=questions)
    current_q = session.questions[0] if session.questions else None
    return {
        "session_id": session.session_id,
        "scheme": {
            "id": scheme.scheme,
            "title_hi": scheme.title_hi,
            "title_en": scheme.title_en,
            "description_hi": scheme.description_hi,
            "description_en": scheme.description_en,
            "icon": scheme.icon or "📄",
            "status": scheme.status,
            "source_url": scheme.source_url,
            "required_documents": scheme.required_documents,
            "optional_documents": scheme.optional_documents or []
        },
        "current_question": current_q,
        "total_questions": len(session.questions)
    }


@app.post("/api/session/select_scheme")
async def select_scheme(req: SelectSchemeRequest):
    scheme = rules_engine.get_scheme(req.scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail=f"Scheme '{req.scheme_id}' not found")

    questions = _get_voice_questions_for_scheme(scheme)
    session = session_manager.set_scheme(
        session_id=req.session_id,
        scheme_id=req.scheme_id,
        questions=questions
    )
    if not session:
        # If session expired or not found, auto-create
        session = session_manager.create_session(scheme_id=req.scheme_id, questions=questions)

    current_q = session.questions[0] if session.questions else None
    return {
        "session_id": session.session_id,
        "scheme": {
            "id": scheme.scheme,
            "title_hi": scheme.title_hi,
            "title_en": scheme.title_en,
            "description_hi": scheme.description_hi,
            "description_en": scheme.description_en,
            "icon": scheme.icon or "📄",
            "status": scheme.status,
            "source_url": scheme.source_url,
            "required_documents": scheme.required_documents,
            "optional_documents": scheme.optional_documents or []
        },
        "current_question": current_q,
        "total_questions": len(session.questions)
    }


@app.get("/api/session/{session_id}")
async def get_session_info(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session expired or not found")
    return {
        "session_id": session.session_id,
        "scheme_id": session.scheme_id,
        "current_q_index": session.current_q_index,
        "spoken_answers": session.spoken_answers,
        "pending_answer": session.pending_answer,
        "uploaded_documents": list(session.documents.keys())
    }


@app.post("/api/voice/answer")
async def process_voice_answer(
    session_id: str = Form(...),
    question_id: str = Form(...),
    language_code: str = Form("hi-IN"),
    text_answer: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None)
):
    """
    Step 1 of voice interaction:
    Transcribes applicant's answer with Gnani Prisma STT (or accepts text_answer),
    extracts value, and returns confirmation prompt for Timbre TTS playback.
    """
    session = session_manager.get_or_create_session(session_id)

    q = next((item for item in session.questions if item.id == question_id), None)
    if not q:
        raise HTTPException(status_code=400, detail="Invalid question_id")

    transcript = ""
    if text_answer and text_answer.strip():
        transcript = text_answer.strip()
    elif audio_file:
        audio_bytes = await audio_file.read()
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio buffer received")

        # 1. Transcribe via Gnani Prisma STT
        stt_res = await stt_client.transcribe(
            audio_bytes=audio_bytes,
            filename=audio_file.filename or "speech.wav",
            content_type=audio_file.content_type or "audio/wav",
            language_code=language_code
        )
        transcript = stt_res.get("transcript", "").strip()
    else:
        raise HTTPException(status_code=400, detail="Either audio_file or text_answer must be provided")

    if not transcript:
        return {
            "success": False,
            "message_hi": "आपकी आवाज़ स्पष्ट नहीं सुनाई दी। कृपया दोबारा बोलें या नीचे टाइप करें।",
            "message_en": "Could not hear audio clearly. Please speak again or type below."
        }

    # 2. Extract value according to expected type
    parsed_value = transcript
    if q.expected_type == "amount":
        amt = parse_amount(transcript)
        if amt is not None:
            parsed_value = amt
    elif q.expected_type == "name":
        parsed_value = transcript

    # Format human confirmation phrase
    display_val = f"₹{format_inr(parsed_value)}" if isinstance(parsed_value, (int, float)) else str(parsed_value)
    confirmation_hi = f"आपने कहा: {display_val}। क्या यह सही है? 'हाँ' या 'नहीं' बोलें।"
    confirmation_en = f"You said: {display_val}. Is this correct? Say 'yes' or 'no'."

    session.pending_answer = {
        "question_id": q.id,
        "field_key": q.field_key,
        "value": parsed_value,
        "display_value": display_val,
        "transcript": transcript
    }

    return {
        "success": True,
        "transcript": transcript,
        "parsed_value": parsed_value,
        "display_value": display_val,
        "confirmation_hi": confirmation_hi,
        "confirmation_en": confirmation_en
    }


@app.post("/api/voice/confirm")
async def confirm_voice_answer(
    session_id: str = Form(...),
    decision: Optional[str] = Form(None),
    confirmed_value: Optional[str] = Form(None),
    language_code: str = Form("hi-IN"),
    audio_file: Optional[UploadFile] = File(None)
):
    """
    Step 2 of voice interaction:
    User confirms ("हाँ"/"Yes") or rejects ("नहीं"/"No") their spoken answer.
    """
    session = session_manager.get_session(session_id)
    if not session or not session.pending_answer:
        raise HTTPException(status_code=400, detail="No pending answer to confirm")

    is_confirmed = False

    # Check manual button decision first
    if decision:
        is_confirmed = decision.lower() in ["yes", "ha", "haan", "true", "1"]
    elif audio_file:
        audio_bytes = await audio_file.read()
        stt_res = await stt_client.transcribe(
            audio_bytes=audio_bytes,
            filename=audio_file.filename or "confirm.wav",
            language_code=language_code
        )
        t = stt_res.get("transcript", "").lower()
        affirmative = ["हाँ", "हां", "सही", "yes", "yeah", "ha", "haan", "sahi", "correct"]
        is_confirmed = any(word in t for word in affirmative)

    pending = session.pending_answer
    if is_confirmed:
        final_val = confirmed_value.strip() if confirmed_value else pending["value"]
        if pending["field_key"] == "annual_income":
            parsed_amt = parse_amount(final_val)
            if parsed_amt is not None:
                final_val = parsed_amt

        # Save confirmed answer into session
        session.spoken_answers[pending["field_key"]] = final_val
        session.pending_answer = None
        session.current_q_index += 1

        next_q = None
        if session.current_q_index < len(session.questions):
            next_q = session.questions[session.current_q_index]

        return {
            "status": "ACCEPTED",
            "saved_field": pending["field_key"],
            "value": final_val,
            "has_next_question": next_q is not None,
            "next_question": next_q,
            "message_hi": "उत्तर सुरक्षित कर लिया गया है।",
            "message_en": "Answer confirmed and saved."
        }
    else:
        # User rejected or said no: clear pending and re-ask current question
        session.pending_answer = None
        current_q = session.questions[session.current_q_index]
        return {
            "status": "RETRY",
            "next_question": current_q,
            "has_next_question": True,
            "message_hi": "कृपया अपना उत्तर फिर से बोलें।",
            "message_en": "Please state your answer again."
        }


@app.post("/api/documents")
async def upload_document(
    session_id: str = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...)
):
    """Receives document photo, performs OpenCV preprocessing + OCR + parser extraction."""
    session = session_manager.get_or_create_session(session_id)

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty document file uploaded")

    # Hardening: 10MB size limit
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded file exceeds maximum limit of 10MB ({len(file_bytes)/(1024*1024):.1f}MB)"
        )

    # Check if raw text override was passed in dev/replay mode
    override_text = None
    if file.content_type == "text/plain" or file.filename.endswith(".txt"):
        override_text = file_bytes.decode("utf-8", errors="ignore")

    # Run preprocessing + OCR + parser in background threadpool to avoid freezing event loop
    extracted_doc = await run_in_threadpool(
        process_document,
        image_bytes=file_bytes,
        doc_type=doc_type,
        filename=file.filename or f"{doc_type}.jpg",
        override_text=override_text
    )

    # Save to session
    session.documents[doc_type] = extracted_doc

    # Format fields for response
    fields_summary = {}
    for k, f in extracted_doc.fields.items():
        fields_summary[k] = {
            "value": f.value,
            "quoted_text": f.quoted_text,
            "confidence": f.confidence
        }

    return {
        "success": True,
        "doc_type": doc_type,
        "filename": extracted_doc.filename,
        "fields_extracted": fields_summary,
        "raw_text_snippet": extracted_doc.raw_text[:200]
    }


@app.post("/api/check")
async def run_precheck(session_id: str = Form(...)):
    """Runs deterministic rules engine across session documents and spoken data."""
    session = session_manager.get_or_create_session(session_id)

    report = await run_in_threadpool(
        rules_engine.evaluate,
        scheme_id=session.scheme_id,
        session_id=session_id,
        documents=session.documents,
        spoken_data=session.spoken_answers
    )
    session.last_report = report
    return report


@app.post("/api/speak")
async def speak(
    text: str = Form(...),
    language: str = Form("hi-IN"),
    voice: str = Form("Nalini"),
    speed: float = Form(1.0)
):
    """Synthesize text to speech using Gnani Timbre, with caching."""
    audio_bytes = await tts_client.synthesize(text=text, voice=voice, language=language, speed=speed)
    return Response(content=audio_bytes, media_type="audio/wav")


@app.delete("/api/session/{session_id}")
async def purge_session(session_id: str):
    """Immediate privacy purge of all session data."""
    purged = session_manager.delete_session(session_id)
    return {
        "success": purged,
        "message": "All session data and uploaded documents have been permanently removed from memory."
    }
