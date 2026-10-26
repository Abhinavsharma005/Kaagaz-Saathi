import logging
from typing import Optional, Dict, Any, List
import numpy as np

from app.models import ExtractedDocument
from app.docs.preprocess import preprocess_document_image
from app.docs.parsers.aadhaar import parse_aadhaar
from app.docs.parsers.income_cert import parse_income_certificate
from app.docs.parsers.marksheet import parse_marksheet
from app.docs.parsers.passbook import parse_bank_passbook
from app.docs.parsers.caste_cert import parse_caste_certificate
from app.docs.parsers.other_doc import parse_other_document

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


def extract_digital_pdf_text(pdf_bytes: bytes) -> str:
    """Extracts direct digital text from PDF pages if present."""
    try:
        import io
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(io.BytesIO(pdf_bytes))
        pages_text = []
        for page in pdf:
            tp = page.get_textpage()
            text = tp.get_text_range()
            if text and text.strip():
                pages_text.append(text.strip())
        return "\n".join(pages_text)
    except Exception as e:
        logger.warning(f"Could not extract digital PDF text: {e}")
        return ""


def process_document(
    image_bytes: bytes,
    doc_type: str,
    filename: str = "document.jpg",
    override_text: Optional[str] = None
) -> ExtractedDocument:
    """
    End-to-end document processing pipeline:
    1. Preprocesses image using OpenCV (or renders PDF via pypdfium2)
    2. Runs EasyOCR (Hindi + English) and extracts any digital PDF text
    3. Runs specialized parser based on doc_type
    4. Returns ExtractedDocument with exact quoted substrings
    """
    raw_text = ""
    if override_text:
        raw_text = override_text
    else:
        pdf_digital_text = ""
        if image_bytes.startswith(b"%PDF"):
            pdf_digital_text = extract_digital_pdf_text(image_bytes)

        try:
            binary_img, meta = preprocess_document_image(image_bytes)
            ocr_text = run_ocr_on_image(binary_img)
            if pdf_digital_text:
                # Combine both to ensure zero missing fields
                raw_text = f"{pdf_digital_text}\n{ocr_text}".strip()
            else:
                raw_text = ocr_text
        except Exception as e:
            logger.error(f"Preprocessing/OCR failed for {filename}: {e}")
            raw_text = pdf_digital_text

    # Dispatch to appropriate document parser
    if doc_type == "aadhaar":
        return parse_aadhaar(raw_text, filename)
    elif doc_type == "income_certificate":
        return parse_income_certificate(raw_text, filename)
    elif doc_type == "marksheet":
        return parse_marksheet(raw_text, filename)
    elif doc_type == "bank_passbook":
        return parse_bank_passbook(raw_text, filename)
    elif doc_type == "caste_certificate":
        return parse_caste_certificate(raw_text, filename)
    elif doc_type == "other_document":
        return parse_other_document(raw_text, filename)
    else:
        return parse_other_document(raw_text, filename)
