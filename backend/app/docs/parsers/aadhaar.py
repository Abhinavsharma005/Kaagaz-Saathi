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
    dob_match = re.search(r"(?:DOB|Date of Birth|जन्म तिथि)\s*[:\-]?\s*(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})", raw_text, re.IGNORECASE)
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
    for i, line in enumerate(lines):
        if re.search(r"(?:DOB|Date of Birth|जन्म तिथि|Year of Birth)", line, re.IGNORECASE):
            # The line immediately preceding DOB is usually the English Name
            if i > 0 and len(lines[i-1]) > 3:
                cand = lines[i-1]
                # Filter out government headers
                if not re.search(r"(government|india|sarkar|authority|aadhaar|unique)", cand, re.IGNORECASE):
                    name_found = cand
                    break

    if not name_found:
        # Check for explicit 'Name:' label
        named_label = re.search(r"(?:Name|नाम)\s*[:\-]\s*([A-Za-z\s\u0900-\u097F]+)", raw_text, re.IGNORECASE)
        if named_label:
            name_found = named_label.group(1).strip()

    if not name_found:
        # Fallback: scan lines for candidate person name
        for line in lines:
            if re.match(r"^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$", line.strip()):
                if not re.search(r"(government|india|income|board|bank)", line, re.IGNORECASE):
                    name_found = line.strip()
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
