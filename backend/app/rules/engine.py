import json
import logging
import os
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Tuple
from app.models import (
    RuleStatus,
    RuleDefinition,
    SchemeConfig,
    RuleResult,
    PreCheckReport,
    ExtractedField,
    ExtractedDocument
)
from app.matching.names import compare_names
from app.matching.dates import parse_flexible_date, days_since
from app.matching.amounts import parse_amount, format_inr

logger = logging.getLogger("kaagaz-saathi.rules")


class RulesEngine:
    """Deterministic Rules Evaluation Engine enforcing 'no quote, no pass'."""

    def __init__(self, schemes_dir: Optional[str] = None):
        if not schemes_dir:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            schemes_dir = os.path.join(base_dir, "schemes")
        self.schemes_dir = schemes_dir
        self.schemes: Dict[str, SchemeConfig] = {}
        self.load_schemes()

    def load_schemes(self):
        """Loads all scheme JSON configuration files."""
        if not os.path.exists(self.schemes_dir):
            return
        for file in os.listdir(self.schemes_dir):
            if file.endswith(".json"):
                full_path = os.path.join(self.schemes_dir, file)
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        scheme = SchemeConfig(**data)
                        self.schemes[scheme.scheme] = scheme
                        logger.info(f"Loaded scheme: {scheme.scheme} ({scheme.title_en})")
                except Exception as e:
                    logger.error(f"Failed to load scheme from {full_path}: {e}")

    def get_scheme(self, scheme_id: str) -> Optional[SchemeConfig]:
        return self.schemes.get(scheme_id)

    def evaluate(
        self,
        scheme_id: str,
        session_id: str,
        documents: Dict[str, ExtractedDocument],
        spoken_data: Optional[Dict[str, Any]] = None
    ) -> PreCheckReport:
        """
        Evaluates extracted document fields and spoken answers against scheme rules.
        """
        scheme = self.get_scheme(scheme_id)
        if not scheme:
            raise ValueError(f"Unknown scheme '{scheme_id}'. Available schemes: {list(self.schemes.keys())}")

        spoken_data = spoken_data or {}
        results: List[RuleResult] = []

        for rule in scheme.rules:
            result = self._evaluate_rule(rule, documents, spoken_data)
            results.append(result)

        pass_count = sum(1 for r in results if r.status == RuleStatus.PASS)
        fix_count = sum(1 for r in results if r.status == RuleStatus.FIX)
        unverified_count = sum(1 for r in results if r.status == RuleStatus.COULD_NOT_VERIFY)
        total_checks = len(results)

        missing_docs = [d for d in scheme.required_documents if d not in documents]
        provided_docs = list(documents.keys())
        is_preliminary = len(missing_docs) > 0 and len(provided_docs) > 0

        can_submit = (fix_count == 0 and unverified_count == 0)
        status_summary = "READY_TO_APPLY" if can_submit else "FIXES_REQUIRED"

        # Construct short plain-language spoken summaries
        summary_hi, summary_en = self._generate_summaries(
            scheme=scheme,
            pass_count=pass_count,
            fix_count=fix_count,
            unverified_count=unverified_count,
            results=results,
            is_preliminary=is_preliminary,
            provided_count=len(provided_docs),
            missing_count=len(missing_docs)
        )

        return PreCheckReport(
            session_id=session_id,
            scheme=scheme.scheme,
            status_summary=status_summary,
            can_submit=can_submit,
            is_preliminary=is_preliminary,
            missing_documents=missing_docs,
            provided_documents=provided_docs,
            results=results,
            total_checks=total_checks,
            pass_count=pass_count,
            fix_count=fix_count,
            unverified_count=unverified_count,
            summary_hi=summary_hi,
            summary_en=summary_en
        )

    def _resolve_field(
        self,
        field_path: str,
        documents: Dict[str, ExtractedDocument],
        spoken_data: Dict[str, Any]
    ) -> Tuple[Optional[Any], Optional[str]]:
        """
        Resolves field_path like 'aadhaar.name' or 'spoken.name'.
        Returns (parsed_value, quoted_text).
        """
        if not field_path:
            return None, None

        parts = field_path.split(".", 1)
        if len(parts) == 2:
            prefix, key = parts
            if prefix == "spoken":
                val = spoken_data.get(key)
                if val:
                    return val, f"Spoken: '{val}'"
                return None, None
            else:
                doc = documents.get(prefix)
                if doc and key in doc.fields:
                    ext = doc.fields[key]
                    return ext.value, ext.quoted_text

        return None, None

    def _evaluate_rule(
        self,
        rule: RuleDefinition,
        documents: Dict[str, ExtractedDocument],
        spoken_data: Dict[str, Any]
    ) -> RuleResult:
        """Evaluates an individual rule definition deterministically."""
        r_type = rule.type

        if r_type == "required_document":
            doc_type = rule.expected
            doc_present = doc_type in documents and bool(documents[doc_type].raw_text)
            if doc_present:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=doc_type,
                    status=RuleStatus.PASS,
                    quoted_text=f"Uploaded: {documents[doc_type].filename}",
                    message_hi=f"{rule.message_hi} (उपलब्ध है)",
                    message_en=f"{rule.message_en} (Verified attached)",
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=doc_type,
                    status=RuleStatus.FIX,
                    quoted_text="दस्तावेज़ अनुपलब्ध / Missing document",
                    message_hi=rule.message_hi,
                    message_en=rule.message_en,
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )

        elif r_type == "fuzzy_match":
            if not rule.fields or len(rule.fields) < 2:
                return self._unverified(rule, "Fuzzy match requires at least 2 fields")

            val1, quote1 = self._resolve_field(rule.fields[0], documents, spoken_data)
            val2, quote2 = self._resolve_field(rule.fields[1], documents, spoken_data)

            if not val1 or not val2 or not quote1 or not quote2:
                missing = []
                if not val1: missing.append(rule.fields[0])
                if not val2: missing.append(rule.fields[1])

                # Differentiate between unuploaded document vs unreadable photo
                doc_prefixes = [f.split('.')[0] for f in missing]
                unuploaded = [p for p in doc_prefixes if p != "spoken" and p not in documents]

                if unuploaded:
                    return RuleResult(
                        rule_id=rule.id,
                        rule_type=r_type,
                        field=",".join(rule.fields),
                        status=RuleStatus.COULD_NOT_VERIFY,
                        quoted_text=f"दस्तावेज़ अभी अपलोड नहीं हुआ: {', '.join(unuploaded)}",
                        message_hi=f"जाँच लंबित: {', '.join(unuploaded)} अभी अपलोड नहीं हुआ है",
                        message_en=f"Check pending: {', '.join(unuploaded)} not yet uploaded",
                        fix_hi="पूर्ण नाम मिलान हेतु शेष दस्तावेज़ अपलोड करें",
                        fix_en="Upload remaining document to verify name consistency"
                    )
                else:
                    return RuleResult(
                        rule_id=rule.id,
                        rule_type=r_type,
                        field=",".join(rule.fields),
                        status=RuleStatus.COULD_NOT_VERIFY,
                        quoted_text=f"अप्राप्य / Unreadable: {', '.join(missing)}",
                        message_hi=f"सत्यापित नहीं हो सका: {', '.join(missing)} का विवरण स्पष्ट नहीं पढ़ा जा सका",
                        message_en=f"Could not verify: could not read {', '.join(missing)} clearly — please check manually",
                        fix_hi="कृपया संबंधित दस्तावेज़ की साफ, बिना चमक वाली फोटो अपलोड करें",
                        fix_en="Please upload a clear, glare-free photo of the document"
                    )

            # Compare names using Indic transliteration + RapidFuzz
            score, explanation = compare_names(str(val1), str(val2))
            min_score = rule.min_score or 85.0
            quoted_combined = f"[{rule.fields[0]}]: '{quote1}' vs [{rule.fields[1]}]: '{quote2}'"

            if score >= min_score:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=",".join(rule.fields),
                    status=RuleStatus.PASS,
                    quoted_text=quoted_combined,
                    message_hi=f"नाम मेल खाता है (समानता: {int(score)}%)",
                    message_en=f"Names match (similarity: {int(score)}%)",
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=",".join(rule.fields),
                    status=RuleStatus.FIX,
                    quoted_text=quoted_combined,
                    message_hi=f"{rule.message_hi} (समानता केवल {int(score)}%)",
                    message_en=f"{rule.message_en} (similarity only {int(score)}%)",
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )

        elif r_type == "max_value":
            doc_prefix = rule.field.split(".")[0] if rule.field else ""
            if doc_prefix and doc_prefix != "spoken" and doc_prefix not in documents:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=rule.field,
                    status=RuleStatus.COULD_NOT_VERIFY,
                    quoted_text=f"दस्तावेज़ अभी अपलोड नहीं हुआ: {doc_prefix}",
                    message_hi=f"जाँच लंबित: {doc_prefix} अभी अपलोड नहीं हुआ है",
                    message_en=f"Check pending: {doc_prefix} not yet uploaded",
                    fix_hi="इस नियम की जांच हेतु संबंधित दस्तावेज़ अपलोड करें",
                    fix_en="Upload document to verify this rule"
                )

            val, quote = self._resolve_field(rule.field or "", documents, spoken_data)
            if val is None or not quote:
                return self._unverified(rule, f"Unreadable field: {rule.field}")

            num_val = parse_amount(val)
            if num_val is None:
                return self._unverified(rule, f"Could not parse numeric value: '{quote}'")

            limit = float(rule.limit or 0)
            category = spoken_data.get("category")
            if rule.id == "income_ceiling" and category in ["SC", "ST"]:
                limit = 600000.0  # MP SC/ST scholarship higher ceiling

            inr_val = format_inr(num_val)
            inr_lim = format_inr(limit)
            quoted_text = f"Read: '{quote}' (₹{inr_val})"

            if num_val <= limit:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=rule.field,
                    status=RuleStatus.PASS,
                    quoted_text=quoted_text,
                    message_hi=f"आय ₹{inr_val} सीमा ₹{inr_lim} के भीतर है",
                    message_en=f"Income ₹{inr_val} is within limit of ₹{inr_lim}",
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=rule.field,
                    status=RuleStatus.FIX,
                    quoted_text=quoted_text,
                    message_hi=f"{rule.message_hi} (दर्ज: ₹{inr_val}, अधिकतम: ₹{inr_lim})",
                    message_en=f"{rule.message_en} (recorded: ₹{inr_val}, max limit: ₹{inr_lim})",
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )

        elif r_type == "min_value":
            doc_prefix = rule.field.split(".")[0] if rule.field else ""
            if doc_prefix and doc_prefix != "spoken" and doc_prefix not in documents:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=rule.field,
                    status=RuleStatus.COULD_NOT_VERIFY,
                    quoted_text=f"दस्तावेज़ अभी अपलोड नहीं हुआ: {doc_prefix}",
                    message_hi=f"जाँच लंबित: {doc_prefix} अभी अपलोड नहीं हुआ है",
                    message_en=f"Check pending: {doc_prefix} not yet uploaded",
                    fix_hi="इस नियम की जांच हेतु संबंधित दस्तावेज़ अपलोड करें",
                    fix_en="Upload document to verify this rule"
                )

            val, quote = self._resolve_field(rule.field or "", documents, spoken_data)
            if val is None or not quote:
                return self._unverified(rule, f"Unreadable field: {rule.field}")

            num_val = parse_amount(val)
            if num_val is None:
                return self._unverified(rule, f"Could not parse numeric value: '{quote}'")

            limit = float(rule.limit or 0)
            quoted_text = f"Read: '{quote}' ({num_val})"

            if num_val >= limit:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=rule.field,
                    status=RuleStatus.PASS,
                    quoted_text=quoted_text,
                    message_hi=f"प्राप्तांक {num_val}% न्यूनतम {limit}% से अधिक है",
                    message_en=f"Score {num_val}% meets required minimum {limit}%",
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=rule.field,
                    status=RuleStatus.FIX,
                    quoted_text=quoted_text,
                    message_hi=f"{rule.message_hi} (दर्ज: {num_val}%, अपेक्षित: {limit}%)",
                    message_en=f"{rule.message_en} (recorded: {num_val}%, required: {limit}%)",
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )

        elif r_type == "not_older_than_days":
            doc_prefix = rule.field.split(".")[0] if rule.field else ""
            if doc_prefix and doc_prefix != "spoken" and doc_prefix not in documents:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=rule.field,
                    status=RuleStatus.COULD_NOT_VERIFY,
                    quoted_text=f"दस्तावेज़ अभी अपलोड नहीं हुआ: {doc_prefix}",
                    message_hi=f"जाँच लंबित: {doc_prefix} अभी अपलोड नहीं हुआ है",
                    message_en=f"Check pending: {doc_prefix} not yet uploaded",
                    fix_hi="इस नियम की जांच हेतु संबंधित दस्तावेज़ अपलोड करें",
                    fix_en="Upload document to verify this rule"
                )

            val, quote = self._resolve_field(rule.field or "", documents, spoken_data)
            if not val or not quote:
                return self._unverified(rule, f"Unreadable date field: {rule.field}")

            parsed_dt = parse_flexible_date(val)
            if not parsed_dt:
                return self._unverified(rule, f"Could not parse date format from quote: '{quote}'")

            age_days = days_since(parsed_dt)
            max_days = rule.days or 365
            quoted_text = f"Read date: '{quote}' (जारी तिथि: {parsed_dt.strftime('%d-%m-%Y')})"

            if age_days <= max_days:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=rule.field,
                    status=RuleStatus.PASS,
                    quoted_text=quoted_text,
                    message_hi=f"प्रमाण पत्र वैध है ({age_days} दिन पुराना, अनुमत: {max_days} दिन)",
                    message_en=f"Certificate is valid ({age_days} days old, allowed: {max_days} days)",
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    rule_type=r_type,
                    field=rule.field,
                    status=RuleStatus.FIX,
                    quoted_text=quoted_text,
                    message_hi=f"{rule.message_hi} ({age_days} दिन पुराना, अनुमत सीमा: {max_days} दिन)",
                    message_en=f"{rule.message_en} ({age_days} days old, allowed: {max_days} days)",
                    fix_hi=rule.fix_hi,
                    fix_en=rule.fix_en
                )

        return self._unverified(rule, f"Unsupported rule type: {r_type}")

    def _unverified(self, rule: RuleDefinition, reason: str) -> RuleResult:
        """Returns standard 'could not verify — please check manually' response."""
        return RuleResult(
            rule_id=rule.id,
            rule_type=rule.type,
            field=rule.field or (",".join(rule.fields) if rule.fields else None),
            status=RuleStatus.COULD_NOT_VERIFY,
            quoted_text=f"अस्पष्ट / Unverified: {reason}",
            message_hi="सत्यापित नहीं हो सका — कृपया हाथ से जांच करें",
            message_en="Could not verify — please check manually",
            fix_hi=rule.fix_hi or "कृपया संबंधित दस्तावेज़ की पुनः साफ फोटो अपलोड करें",
            fix_en=rule.fix_en or "Please upload a clearer image of the document"
        )

    def _generate_summaries(
        self,
        scheme: SchemeConfig,
        pass_count: int,
        fix_count: int,
        unverified_count: int,
        results: List[RuleResult],
        is_preliminary: bool = False,
        provided_count: int = 0,
        missing_count: int = 0
    ) -> Tuple[str, str]:
        """Generates concise, spoken Hindi and English summaries for Timbre TTS."""
        if fix_count == 0 and unverified_count == 0:
            summary_hi = (
                f"बधाई हो! {scheme.title_hi} के सभी {pass_count} नियम पास हो गए हैं। "
                "आपके दस्तावेज़ आवेदन के लिए पूरी तरह तैयार हैं।"
            )
            summary_en = (
                f"Congratulations! All {pass_count} checks passed for {scheme.title_en}. "
                "Your documents are ready for submission."
            )
        elif is_preliminary and fix_count == 0:
            summary_hi = (
                f"प्रारंभिक पूर्व-जाँच रिपोर्ट: आपके अपलोड किए गए {provided_count} दस्तावेज़ पात्रता नियमों पर सही पाए गए हैं। "
                f"पोर्टल पर पूर्ण आवेदन हेतु {missing_count} शेष दस्तावेज़ आवश्यक हैं।"
            )
            summary_en = (
                f"Preliminary Pre-Check complete: Your {provided_count} uploaded document(s) meet the eligibility rules. "
                f"{missing_count} remaining document(s) are needed for full submission."
            )
        else:
            fixes_text_hi = []
            fixes_text_en = []
            for r in results:
                if r.status == RuleStatus.FIX:
                    fixes_text_hi.append(r.message_hi)
                    fixes_text_en.append(r.message_en)

            summary_hi = (
                f"पूर्व-जाँच सूचना: आपके दस्तावेज़ों में {fix_count} सुधार की आवश्यकता है। "
                f"{' । '.join(fixes_text_hi[:2])}। "
                "आवेदन रद्द होने से बचने के लिए कृपया पहले इन्हें ठीक करें।"
            )
            summary_en = (
                f"Pre-Check Notice: {fix_count} item(s) need correction before submitting. "
                f"{'; '.join(fixes_text_en[:2])}. "
                "Please fix these to prevent your application from being rejected."
            )

        return summary_hi, summary_en
