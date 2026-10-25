import re
from typing import Dict, Any, Optional
from app.models import ExtractedField, ExtractedDocument
from app.matching.amounts import parse_amount
from app.matching.dates import parse_flexible_date


def parse_income_certificate(raw_text: str, filename: str = "income_cert.jpg") -> ExtractedDocument:
    """
    Parses OCR text of an Income Certificate to extract:
    - Annual Family Income (numeric value + exact quoted text)
    - Issue Date (parsed date + exact quoted string)
    - Certificate Number
    """
    fields: Dict[str, ExtractedField] = {}
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # 1. Annual Income Extraction
    for line in lines:
        # Ignore header/title lines that declare the certificate type
        if "certificate of" in line.lower() or "प्रमाण पत्र" in line.lower():
            continue
        income_match = re.search(
            r"(?:वार्षिक आय|annual income|total income|आय|income)\s*[:\-]\s*([₹Rs\.\s\d,]+(?:/[-])?|[\d\.\s]+(?:लाख|lakh))",
            line,
            re.IGNORECASE
        )
        if income_match:
            quoted = income_match.group(1).strip()
            parsed_amt = parse_amount(quoted)
            if parsed_amt is not None:
                fields["annual_income"] = ExtractedField(
                    name="annual_income",
                    value=parsed_amt,
                    quoted_text=quoted,
                    confidence=0.92,
                    doc_type="income_certificate"
                )
                break

    if "annual_income" not in fields:
        # Fallback search for standalone ₹ amount on lines mentioning आय / Income
        for line in lines:
            if "certificate" in line.lower():
                continue
            if any(k in line.lower() for k in ["वार्षिक", "आय", "income"]):
                amt = parse_amount(line)
                if amt is not None:
                    fields["annual_income"] = ExtractedField(
                        name="annual_income",
                        value=amt,
                        quoted_text=line.strip(),
                        confidence=0.85,
                        doc_type="income_certificate"
                    )
                    break

    # 2. Issue Date Extraction
    for line in lines:
        date_match = re.search(
            r"(?:जारी दिनांक|दिनांक|date of issue|issue date|date)\s*[:\-]\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})",
            line,
            re.IGNORECASE
        )
        if date_match:
            quoted = date_match.group(1).strip()
            fields["issue_date"] = ExtractedField(
                name="issue_date",
                value=quoted,
                quoted_text=quoted,
                confidence=0.93,
                doc_type="income_certificate"
            )
            break

    if "issue_date" not in fields:
        cand_date = re.search(r"\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})\b", raw_text)
        if cand_date:
            quoted = cand_date.group(1)
            fields["issue_date"] = ExtractedField(
                name="issue_date",
                value=quoted,
                quoted_text=quoted,
                confidence=0.80,
                doc_type="income_certificate"
            )

    # 3. Certificate Number Extraction
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
            confidence=0.90,
            doc_type="income_certificate"
        )

    return ExtractedDocument(
        doc_type="income_certificate",
        filename=filename,
        fields=fields,
        raw_text=raw_text
    )
