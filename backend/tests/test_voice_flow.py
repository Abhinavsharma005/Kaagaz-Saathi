import os
import io
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_full_session_and_voice_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create Session
        resp_session = await ac.post("/api/session", json={"scheme_id": "mp_post_matric_scholarship"})
        assert resp_session.status_code == 200
        sess_data = resp_session.json()
        session_id = sess_data["session_id"]
        assert session_id is not None
        assert sess_data["scheme"]["id"] == "mp_post_matric_scholarship"
        assert sess_data["current_question"]["id"] == "q_name"

        # 2. Voice Answer (Q1: Name)
        dummy_wav = b"RIFF" + b"\x00" * 40
        resp_ans1 = await ac.post(
            "/api/voice/answer",
            data={"session_id": session_id, "question_id": "q_name", "language_code": "hi-IN"},
            files={"audio_file": ("test.wav", io.BytesIO(dummy_wav), "audio/wav")}
        )
        assert resp_ans1.status_code == 200
        ans1_data = resp_ans1.json()
        assert ans1_data["success"] is True
        assert "आपने कहा" in ans1_data["confirmation_hi"]

        # 3. Voice Confirm (Confirm Q1)
        resp_conf1 = await ac.post(
            "/api/voice/confirm",
            data={"session_id": session_id, "decision": "yes"}
        )
        assert resp_conf1.status_code == 200
        conf1_data = resp_conf1.json()
        assert conf1_data["status"] == "ACCEPTED"
        assert conf1_data["saved_field"] == "name"
        assert conf1_data["has_next_question"] is True
        assert conf1_data["next_question"]["id"] == "q_income"

        # 4. Voice Answer (Q2: Income)
        resp_ans2 = await ac.post(
            "/api/voice/answer",
            data={"session_id": session_id, "question_id": "q_income", "language_code": "hi-IN"},
            files={"audio_file": ("test2.wav", io.BytesIO(dummy_wav), "audio/wav")}
        )
        assert resp_ans2.status_code == 200
        ans2_data = resp_ans2.json()
        assert ans2_data["success"] is True

        # 5. Voice Reject (Test retry on 'no')
        resp_rej = await ac.post(
            "/api/voice/confirm",
            data={"session_id": session_id, "decision": "no"}
        )
        assert resp_rej.status_code == 200
        rej_data = resp_rej.json()
        assert rej_data["status"] == "RETRY"
        assert rej_data["next_question"]["id"] == "q_income"

        # Confirm properly now
        await ac.post(
            "/api/voice/answer",
            data={"session_id": session_id, "question_id": "q_income", "language_code": "hi-IN"},
            files={"audio_file": ("test2.wav", io.BytesIO(dummy_wav), "audio/wav")}
        )
        resp_conf2 = await ac.post(
            "/api/voice/confirm",
            data={"session_id": session_id, "decision": "yes"}
        )
        assert resp_conf2.json()["status"] == "ACCEPTED"

        # 6. Upload Mock Document
        samples_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "samples")
        aadhaar_path = os.path.join(samples_dir, "aadhaar_clean.png")
        with open(aadhaar_path, "rb") as f:
            aadhaar_bytes = f.read()

        resp_doc = await ac.post(
            "/api/documents",
            data={"session_id": session_id, "doc_type": "aadhaar"},
            files={"file": ("aadhaar_clean.png", io.BytesIO(aadhaar_bytes), "image/png")}
        )
        assert resp_doc.status_code == 200
        doc_data = resp_doc.json()
        assert doc_data["success"] is True
        assert doc_data["doc_type"] == "aadhaar"

        # 7. Run Pre-Check
        resp_check = await ac.post(
            "/api/check",
            data={"session_id": session_id}
        )
        assert resp_check.status_code == 200
        check_report = resp_check.json()
        assert "is_ready_to_apply" not in check_report or "status_summary" in check_report
        assert check_report["status_summary"] in ["READY_TO_APPLY", "FIXES_REQUIRED"]
        assert len(check_report["results"]) > 0

        # 8. Test Purge Session (Privacy)
        resp_del = await ac.delete(f"/api/session/{session_id}")
        assert resp_del.status_code == 200
        assert resp_del.json()["success"] is True

        # Ensure session is gone
        resp_get_gone = await ac.get(f"/api/session/{session_id}")
        assert resp_get_gone.status_code == 404
