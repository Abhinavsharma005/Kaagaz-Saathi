import io
import pytest
import numpy as np
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.docs.preprocess import detect_blur


def test_blur_detection_sharp_vs_blurred():
    # Create sharp synthetic checkerboard image
    sharp_img = np.zeros((100, 100), dtype=np.uint8)
    sharp_img[::2, ::2] = 255
    sharp_img[1::2, 1::2] = 255

    score_sharp, is_blurry_sharp = detect_blur(sharp_img, threshold=30.0)
    assert is_blurry_sharp is False
    assert score_sharp > 30.0

    # Create uniform / heavily blurred image
    blurry_img = np.ones((100, 100), dtype=np.uint8) * 128
    score_blurry, is_blurry = detect_blur(blurry_img, threshold=30.0)
    assert is_blurry is True
    assert score_blurry < 30.0


@pytest.mark.asyncio
async def test_upload_file_size_limit_exceeded():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create session
        s_resp = await ac.post("/api/session", json={"scheme_id": "mp_post_matric_scholarship"})
        sid = s_resp.json()["session_id"]

        # Oversized dummy buffer (11 MB)
        oversized = b"0" * (11 * 1024 * 1024)
        resp = await ac.post(
            "/api/documents",
            data={"session_id": sid, "doc_type": "aadhaar"},
            files={"file": ("huge.png", io.BytesIO(oversized), "image/png")}
        )
        assert resp.status_code == 413
        assert "exceeds maximum limit of 10MB" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_empty_audio_upload_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        s_resp = await ac.post("/api/session", json={"scheme_id": "mp_post_matric_scholarship"})
        sid = s_resp.json()["session_id"]

        resp = await ac.post(
            "/api/voice/answer",
            data={"session_id": sid, "question_id": "q_name"},
            files={"audio_file": ("empty.wav", io.BytesIO(b""), "audio/wav")}
        )
        assert resp.status_code == 400
