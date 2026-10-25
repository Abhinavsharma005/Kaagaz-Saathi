import re
from typing import Dict, Any, Optional
from app.models import ExtractedField, ExtractedDocument


def parse_bank_passbook(raw_text: str, filename: str = "passbook.jpg") -> ExtractedDocument:
    """
    Parses OCR text of a Bank Passbook front page to extract:
    - Account Holder Name
    - Account Number
    - IFSC Code
    - Bank Name
    """
    fields: Dict[str, ExtractedField] = {}
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # 1. Account Holder Name
    for line in lines:
        name_match = re.search(
            r"(?:account holder(?:'s)? name|name of account holder|holder name|खाताधारक का नाम|name|नाम)\s*[:\-]\s*([A-Za-z \t\u0900-\u097F]+)",
            line,
            re.IGNORECASE
        )
        if name_match:
            quoted = name_match.group(1).strip()
            fields["name"] = ExtractedField(
                name="name",
                value=quoted,
                quoted_text=quoted,
                confidence=0.92,
                doc_type="bank_passbook"
            )
            break
    else:
        # Fallback: line before Account No or standalone person name
        for i, line in enumerate(lines):
            if any(k in line.lower() for k in ["a/c", "account", "ifsc"]):
                if i > 0 and len(lines[i-1]) > 3:
                    cand = lines[i-1]
                    if not re.search(r"(bank|branch|passbook|state|punjab|india)", cand, re.IGNORECASE):
                        fields["name"] = ExtractedField(
                            name="name",
                            value=cand,
                            quoted_text=cand,
                            confidence=0.82,
                            doc_type="bank_passbook"
                        )
                        break

    # 2. Account Number (typically 9 to 18 digits)
    ac_match = re.search(
        r"(?:a/c no|account no|account number|खाता संख्या)\s*[:\-]?\s*(\b\d{9,18}\b)",
        raw_text,
        re.IGNORECASE
    )
    if ac_match:
        quoted = ac_match.group(1).strip()
        fields["account_number"] = ExtractedField(
            name="account_number",
            value=quoted,
            quoted_text=quoted,
            confidence=0.95,
            doc_type="bank_passbook"
        )
    else:
        # Standalone digits block of 10-18 digits
        cand_ac = re.search(r"\b(\d{10,18})\b", raw_text)
        if cand_ac:
            quoted = cand_ac.group(1)
            fields["account_number"] = ExtractedField(
                name="account_number",
                value=quoted,
                quoted_text=quoted,
                confidence=0.80,
                doc_type="bank_passbook"
            )

    # 3. IFSC Code (Standard RBI format: 4 letters + 0 + 6 alphanumeric)
    ifsc_match = re.search(r"\b([A-Z]{4}0[A-Z0-9]{6})\b", raw_text)
    if ifsc_match:
        quoted = ifsc_match.group(1).strip()
        fields["ifsc"] = ExtractedField(
            name="ifsc",
            value=quoted,
            quoted_text=quoted,
            confidence=0.98,
            doc_type="bank_passbook"
        )

    return ExtractedDocument(
        doc_type="bank_passbook",
        filename=filename,
        fields=fields,
        raw_text=raw_text
    )
