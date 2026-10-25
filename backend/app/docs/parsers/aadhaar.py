import re
from typing import Dict, Any, Optional
from app.models import ExtractedField, ExtractedDocument


def parse_aadhaar(raw_text: str, filename: str = "aadhaar.jpg") -> ExtractedDocument:
    """
    Parses OCR text of an Aadhaar card to extract:
    - Name (Devanagari or English)
    - UID (12 digits / masked)
    - DOB / YOB
    """
    fields: Dict[str, ExtractedField] = {}
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # 1. UID Extraction (12 digits or 4 4 4 format or masked)
    uid_match = re.search(r"\b(\d{4}[ \t]\d{4}[ \t]\d{4}|\d{12}|[X\d]{4}[ \t][X\d]{4}[ \t]\d{4})\b", raw_text)
    if uid_match:
        quoted = uid_match.group(1).strip()
        fields["uid"] = ExtractedField(
            name="uid",
            value=quoted,
            quoted_text=quoted,
            confidence=0.95,
            doc_type="aadhaar"
        )

    # 2. DOB / YOB Extraction
    dob_match = re.search(r"(?:DOB|D\.?O\.?B|Date of Birth|जन्म तिथि|जन्म तारीख|जन्म वर्ष)\s*[:\-]?\s*(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})", raw_text, re.IGNORECASE)
    if dob_match:
        quoted = dob_match.group(1)
        fields["dob"] = ExtractedField(
            name="dob",
            value=quoted,
            quoted_text=quoted,
            confidence=0.95,
            doc_type="aadhaar"
        )
    else:
        # Fallback: search for any date in DD/MM/YYYY format
        standalone_date = re.search(r"\b(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})\b", raw_text)
        if standalone_date:
            quoted = standalone_date.group(1)
            fields["dob"] = ExtractedField(
                name="dob",
                value=quoted,
                quoted_text=quoted,
                confidence=0.85,
                doc_type="aadhaar"
            )
        else:
            yob_match = re.search(r"(?:Year of Birth|जन्म वर्ष)\s*[:\-]?\s*(\d{4})", raw_text, re.IGNORECASE)
            if yob_match:
                quoted = yob_match.group(1)
                fields["yob"] = ExtractedField(
                    name="yob",
                    value=quoted,
                    quoted_text=quoted,
                    confidence=0.90,
                    doc_type="aadhaar"
                )

    # 3. Name Extraction
    # Heuristic: look for name above DOB line or after Government of India / Bharat Sarkar
    name_found = None
    ignored_headers = re.compile(r"(government|india|sarkar|authority|aadhaar|unique|identification|enrolment|help|male|female|पुरुष|महिला)", re.IGNORECASE)

    for i, line in enumerate(lines):
        if re.search(r"(?:DOB|Date of Birth|जन्म तिथि|Year of Birth)", line, re.IGNORECASE):
            # Check lines preceding DOB (up to 2 lines back)
            for offset in [1, 2]:
                if i - offset >= 0 and len(lines[i-offset]) > 3:
                    cand = lines[i-offset].strip()
                    if not ignored_headers.search(cand) and not re.search(r"\d{3,}", cand):
                        name_found = cand
                        break
            if name_found:
                break

    if not name_found:
        # Check for explicit 'Name:' label
        named_label = re.search(r"(?:Name|नाम)\s*[:\-]\s*([A-Za-z\s\u0900-\u097F]+)", raw_text, re.IGNORECASE)
        if named_label:
            name_found = named_label.group(1).strip()

    if not name_found:
        # Fallback: scan lines for candidate person name (Title Case, UPPERCASE, or Devanagari)
        for line in lines:
            cleaned = line.strip()
            # Must be 2+ words, letters only, not header words, no numbers
            if re.match(r"^[A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)+$", cleaned):
                if not ignored_headers.search(cleaned) and len(cleaned) >= 5:
                    name_found = cleaned
                    break

    if name_found:
        fields["name"] = ExtractedField(
            name="name",
            value=name_found,
            quoted_text=name_found,
            confidence=0.88,
            doc_type="aadhaar"
        )

    return ExtractedDocument(
        doc_type="aadhaar",
        filename=filename,
        fields=fields,
        raw_text=raw_text
    )
