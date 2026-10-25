import logging
from typing import Optional, Dict, Any, List
import numpy as np

from app.models import ExtractedDocument
from app.docs.preprocess import preprocess_document_image
from app.docs.parsers.aadhaar import parse_aadhaar
from app.docs.parsers.income_cert import parse_income_certificate
from app.docs.parsers.marksheet import parse_marksheet
from app.docs.parsers.passbook import parse_bank_passbook

logger = logging.getLogger("kaagaz-saathi.ocr")

_reader = None


def get_ocr_reader():
    """Lazy loader for EasyOCR reader to avoid slow server startup."""
    global _reader
    if _reader is None:
        try:
            import easyocr
            logger.info("Initializing EasyOCR with languages ['hi', 'en']...")
            _reader = easyocr.Reader(['hi', 'en'], gpu=False)
        except Exception as e:
            logger.warning(f"EasyOCR could not be initialized: {e}. Falling back to text mode.")
            _reader = False
    return _reader


def run_ocr_on_image(processed_img: np.ndarray) -> str:
    """Runs OCR on preprocessed image and returns extracted full text."""
    reader = get_ocr_reader()
    if not reader:
        return ""

    try:
        # EasyOCR readtext returns list of (bbox, text, prob)
        results = reader.readtext(processed_img)
        lines = [text for (_, text, prob) in results if prob > 0.2]
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Error during OCR execution: {e}")
        return ""


def process_document(
    image_bytes: bytes,
    doc_type: str,
    filename: str = "document.jpg",
    override_text: Optional[str] = None
) -> ExtractedDocument:
    """
    End-to-end document processing pipeline:
    1. Preprocesses image using OpenCV (grayscale, denoise, deskew, adaptive threshold)
    2. Runs EasyOCR (Hindi + English)
    3. Runs specialized parser based on doc_type
    4. Returns ExtractedDocument with exact quoted substrings
    """
    raw_text = ""
    if override_text:
        raw_text = override_text
    else:
        try:
            binary_img, meta = preprocess_document_image(image_bytes)
            raw_text = run_ocr_on_image(binary_img)
        except Exception as e:
            logger.error(f"Preprocessing/OCR failed for {filename}: {e}")
            raw_text = ""

    # Dispatch to appropriate document parser
    if doc_type == "aadhaar":
        return parse_aadhaar(raw_text, filename)
    elif doc_type == "income_certificate":
        return parse_income_certificate(raw_text, filename)
    elif doc_type == "marksheet":
        return parse_marksheet(raw_text, filename)
    elif doc_type == "bank_passbook":
        return parse_bank_passbook(raw_text, filename)
    else:
        return ExtractedDocument(
            doc_type=doc_type,
            filename=filename,
            fields={},
            raw_text=raw_text
        )
