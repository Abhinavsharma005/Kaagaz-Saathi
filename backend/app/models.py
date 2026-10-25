from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field


class RuleStatus(str, Enum):
    PASS = "PASS"
    FIX = "FIX"
    COULD_NOT_VERIFY = "COULD_NOT_VERIFY"


class DocumentType(str, Enum):
    AADHAAR = "aadhaar"
    INCOME_CERTIFICATE = "income_certificate"
    MARKSHEET = "marksheet"
    BANK_PASSBOOK = "bank_passbook"


class ExtractedField(BaseModel):
    name: str
    value: Any
    quoted_text: str = Field(..., description="Exact quoted substring read from the document image")
    confidence: float = 1.0
    doc_type: str


class ExtractedDocument(BaseModel):
    doc_type: str
    filename: str
    fields: Dict[str, ExtractedField] = {}
    raw_text: str = ""


class RuleDefinition(BaseModel):
    id: str
    type: str  # required_document, fuzzy_match, max_value, min_value, not_older_than_days, date_format, equals
    field: Optional[str] = None
    fields: Optional[List[str]] = None
    limit: Optional[Union[float, int]] = None
    min_score: Optional[float] = None
    days: Optional[int] = None
    expected: Optional[Any] = None
    message_hi: str
    message_en: str
    fix_hi: Optional[str] = None
    fix_en: Optional[str] = None


class SchemeConfig(BaseModel):
    scheme: str
    title_hi: str
    title_en: str
    status: str = "PLACEHOLDER"
    source_url: str
    required_documents: List[str]
    rules: List[RuleDefinition]


class RuleResult(BaseModel):
    rule_id: str
    status: RuleStatus
    quoted_text: Optional[str] = None
    message_hi: str
    message_en: str
    fix_hi: Optional[str] = None
    fix_en: Optional[str] = None
    rule_type: str
    field: Optional[str] = None


class PreCheckReport(BaseModel):
    session_id: str
    scheme: str
    status_summary: str  # "READY_TO_APPLY", "PRELIMINARY_PASS", "FIXES_REQUIRED"
    can_submit: bool
    is_preliminary: bool = False
    missing_documents: List[str] = []
    provided_documents: List[str] = []
    results: List[RuleResult]
    total_checks: int
    pass_count: int
    fix_count: int
    unverified_count: int
    summary_hi: str
    summary_en: str
