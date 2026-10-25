import re
from typing import Dict, Any, Optional
from app.models import ExtractedField, ExtractedDocument
from app.matching.amounts import parse_amount


def parse_marksheet(raw_text: str, filename: str = "marksheet.jpg") -> ExtractedDocument:
    """
    Parses OCR text of an Academic Marksheet to extract:
    - Candidate Name
    - Roll Number
    - Percentage / Marks Obtained
    - Passing Year
    """
    fields: Dict[str, ExtractedField] = {}
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # 1. Candidate Name
    for line in lines:
        name_match = re.search(
            r"(?:name of candidate|candidate name|student name|छात्र का नाम|नाम)\s*[:\-]\s*([A-Za-z \t\u0900-\u097F]+)",
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
                doc_type="marksheet"
            )
            break
    else:
        # Fallback: scan for capital name
        for line in lines:
            if re.match(r"^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$", line.strip()):
                if not re.search(r"(board|education|secondary|examination|school|college)", line, re.IGNORECASE):
                    fields["name"] = ExtractedField(
                        name="name",
                        value=line.strip(),
                        quoted_text=line.strip(),
                        confidence=0.82,
                        doc_type="marksheet"
                    )
                    break

    # 2. Percentage / Marks
    pct_match = re.search(
        r"(?:percentage|total marks|marks|प्राप्तांक|प्रतिशत)\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%",
        raw_text,
        re.IGNORECASE
    )
    if pct_match:
        quoted = pct_match.group(0).strip()
        val = float(pct_match.group(1))
        fields["percentage"] = ExtractedField(
            name="percentage",
            value=val,
            quoted_text=quoted,
            confidence=0.94,
            doc_type="marksheet"
        )
    else:
        # Standalone percentage pattern e.g. "74.5%"
        cand_pct = re.search(r"\b(\d{2}(?:\.\d{1,2})?)\s*%", raw_text)
        if cand_pct:
            quoted = cand_pct.group(0).strip()
            val = float(cand_pct.group(1))
            fields["percentage"] = ExtractedField(
                name="percentage",
                value=val,
                quoted_text=quoted,
                confidence=0.88,
                doc_type="marksheet"
            )

    # 3. Roll Number
    roll_match = re.search(
        r"(?:roll no|roll number|अनुक्रमांक)\s*[:\-]?\s*([A-Za-z0-9]+)",
        raw_text,
        re.IGNORECASE
    )
    if roll_match:
        quoted = roll_match.group(1).strip()
        fields["roll_no"] = ExtractedField(
            name="roll_no",
            value=quoted,
            quoted_text=quoted,
            confidence=0.90,
            doc_type="marksheet"
        )

    # 4. Passing Year
    year_match = re.search(
        r"(?:year|passing year|वर्ष|session)\s*[:\-]?\s*(\b20\d{2}\b)",
        raw_text,
        re.IGNORECASE
    )
    if year_match:
        quoted = year_match.group(1).strip()
        fields["passing_year"] = ExtractedField(
            name="passing_year",
            value=quoted,
            quoted_text=quoted,
            confidence=0.91,
            doc_type="marksheet"
        )

    return ExtractedDocument(
        doc_type="marksheet",
        filename=filename,
        fields=fields,
        raw_text=raw_text
    )
