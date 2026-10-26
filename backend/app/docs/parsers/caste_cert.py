import re
from typing import Dict, Any, Optional
from app.models import ExtractedField, ExtractedDocument
from app.matching.names import clean_name


def parse_caste_certificate(raw_text: str, filename: str = "caste_cert.jpg") -> ExtractedDocument:
    """
    Parses OCR text of a Caste Certificate to extract:
    - Applicant Name (quoted text)
    - Caste / Category (OBC, SC, ST, etc.)
    - Certificate Number
    - Issuing Authority
    - Issue Date
    """
    fields: Dict[str, ExtractedField] = {}
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # 1. Applicant Name Extraction
    for line in lines:
        name_match = re.search(
            r"(?:आवेदक का नाम|नाम|applicant name|candidate name|name)\s*[:\-]\s*([A-Za-z\s\u0900-\u097F]+)",
            line,
            re.IGNORECASE
        )
        if name_match:
            cand = clean_name(name_match.group(1))
            if cand and len(cand) > 3 and not any(k in cand.lower() for k in ["government", "certificate", "praman"]):
                fields["name"] = ExtractedField(
                    name="name",
                    value=cand,
                    quoted_text=name_match.group(1).strip(),
                    confidence=0.92,
                    doc_type="caste_certificate"
                )
                break

    # Fallback name search if not found
    if "name" not in fields:
        for line in lines:
            if any(k in line.lower() for k in ["kumar", "sharma", "singh", "yadav", "patel", "verma", "shri"]):
                cleaned = clean_name(line)
                if cleaned and len(cleaned) > 4:
                    fields["name"] = ExtractedField(
                        name="name",
                        value=cleaned,
                        quoted_text=line,
                        confidence=0.82,
                        doc_type="caste_certificate"
                    )
                    break

    # 2. Caste / Category
    cat_match = re.search(
        r"\b(SC|ST|OBC|अनुसूचित जाति|अनुसूचित जनजाति|अन्य पिछड़ा वर्ग|General|सामान्य)\b",
        raw_text,
        re.IGNORECASE
    )
    if cat_match:
        quoted = cat_match.group(1).strip()
        fields["category"] = ExtractedField(
            name="category",
            value=quoted,
            quoted_text=quoted,
            confidence=0.90,
            doc_type="caste_certificate"
        )

    # 3. Certificate Number
    cert_match = re.search(
        r"(?:प्रमाण पत्र क्रमांक|क्रमांक|certificate no|cert no)\s*[:\-]?\s*([A-Za-z0-9/\-]+)",
        raw_text,
        re.IGNORECASE
    )
    if cert_match:
        quoted = cert_match.group(1).strip()
        fields["certificate_no"] = ExtractedField(
            name="certificate_no",
            value=quoted,
            quoted_text=quoted,
            confidence=0.91,
            doc_type="caste_certificate"
        )

    # 4. Issue Date
    date_match = re.search(
        r"(?:जारी दिनांक|दिनांक|date of issue|issue date|date)\s*[:\-]\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})",
        raw_text,
        re.IGNORECASE
    )
    if date_match:
        quoted = date_match.group(1).strip()
        fields["issue_date"] = ExtractedField(
            name="issue_date",
            value=quoted,
            quoted_text=quoted,
            confidence=0.92,
            doc_type="caste_certificate"
        )

    return ExtractedDocument(
        doc_type="caste_certificate",
        filename=filename,
        fields=fields,
        raw_text=raw_text
    )
