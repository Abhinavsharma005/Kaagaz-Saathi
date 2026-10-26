import re
from typing import Dict, Any, Optional
from app.models import ExtractedField, ExtractedDocument
from app.matching.names import clean_name


def parse_other_document(raw_text: str, filename: str = "document.jpg") -> ExtractedDocument:
    """
    General parser for arbitrary government documents:
    - Extracts Name
    - Extracts Document/Registration Number
    - Extracts Date if present
    """
    fields: Dict[str, ExtractedField] = {}
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # 1. Name detection
    for line in lines:
        name_match = re.search(
            r"(?:name|applicant|candidate|धारक|नाम)\s*[:\-]\s*([A-Za-z\s\u0900-\u097F]+)",
            line,
            re.IGNORECASE
        )
        if name_match:
            cand = clean_name(name_match.group(1))
            if cand and len(cand) > 3:
                fields["name"] = ExtractedField(
                    name="name",
                    value=cand,
                    quoted_text=name_match.group(1).strip(),
                    confidence=0.88,
                    doc_type="other_document"
                )
                break

    if "name" not in fields:
        for line in lines:
            if any(k in line.lower() for k in ["sharma", "singh", "kumar", "yadav", "patel", "verma", "devi"]):
                cand = clean_name(line)
                if cand and len(cand) > 4:
                    fields["name"] = ExtractedField(
                        name="name",
                        value=cand,
                        quoted_text=line,
                        confidence=0.80,
                        doc_type="other_document"
                    )
                    break

    # 2. Document identifier / number
    num_match = re.search(r"(?:no|number|क्रमांक|id)\s*[:\-]?\s*([A-Za-z0-9/\-]{5,20})", raw_text, re.IGNORECASE)
    if num_match:
        quoted = num_match.group(1).strip()
        fields["document_no"] = ExtractedField(
            name="document_no",
            value=quoted,
            quoted_text=quoted,
            confidence=0.85,
            doc_type="other_document"
        )

    # 3. Date
    date_match = re.search(r"\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})\b", raw_text)
    if date_match:
        quoted = date_match.group(1)
        fields["date"] = ExtractedField(
            name="date",
            value=quoted,
            quoted_text=quoted,
            confidence=0.85,
            doc_type="other_document"
        )

    return ExtractedDocument(
        doc_type="other_document",
        filename=filename,
        fields=fields,
        raw_text=raw_text
    )
