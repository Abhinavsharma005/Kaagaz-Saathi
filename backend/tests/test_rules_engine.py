import pytest
from datetime import datetime, timedelta
from app.models import (
    RuleStatus,
    ExtractedField,
    ExtractedDocument,
    SchemeConfig
)
from app.rules.engine import RulesEngine


@pytest.fixture
def rules_engine():
    return RulesEngine()


def create_clean_docs():
    """Helper to create complete, valid documents."""
    today_str = datetime.now().strftime("%d/%m/%Y")
    return {
        "aadhaar": ExtractedDocument(
            doc_type="aadhaar",
            filename="aadhaar_clean.png",
            raw_text="भारत सरकार Government of India Rajesh Kumar Sharma 1234 5678 9012",
            fields={
                "name": ExtractedField(
                    name="name",
                    value="Rajesh Kumar Sharma",
                    quoted_text="Rajesh Kumar Sharma",
                    doc_type="aadhaar"
                ),
                "uid": ExtractedField(
                    name="uid",
                    value="1234 5678 9012",
                    quoted_text="1234 5678 9012",
                    doc_type="aadhaar"
                )
            }
        ),
        "income_certificate": ExtractedDocument(
            doc_type="income_certificate",
            filename="income_cert_valid.png",
            raw_text="राजस्व विभाग आय प्रमाण पत्र वार्षिक आय ₹ 1,80,000/- जारी दिनांक " + today_str,
            fields={
                "annual_income": ExtractedField(
                    name="annual_income",
                    value=180000.0,
                    quoted_text="₹ 1,80,000/-",
                    doc_type="income_certificate"
                ),
                "issue_date": ExtractedField(
                    name="issue_date",
                    value=today_str,
                    quoted_text=today_str,
                    doc_type="income_certificate"
                )
            }
        ),
        "marksheet": ExtractedDocument(
            doc_type="marksheet",
            filename="marksheet_clean.png",
            raw_text="Board of Secondary Education Rajesh Kumar Sharma Roll: 458921 Marks: 74.5%",
            fields={
                "name": ExtractedField(
                    name="name",
                    value="Rajesh Kumar Sharma",
                    quoted_text="Rajesh Kumar Sharma",
                    doc_type="marksheet"
                ),
                "percentage": ExtractedField(
                    name="percentage",
                    value=74.5,
                    quoted_text="74.5%",
                    doc_type="marksheet"
                )
            }
        ),
        "bank_passbook": ExtractedDocument(
            doc_type="bank_passbook",
            filename="bank_passbook_clean.png",
            raw_text="State Bank of India Rajesh Kumar Sharma A/C 98765432101 IFSC SBIN0001234",
            fields={
                "name": ExtractedField(
                    name="name",
                    value="Rajesh Kumar Sharma",
                    quoted_text="Rajesh Kumar Sharma",
                    doc_type="bank_passbook"
                ),
                "account_number": ExtractedField(
                    name="account_number",
                    value="98765432101",
                    quoted_text="98765432101",
                    doc_type="bank_passbook"
                )
            }
        )
    }


def test_scheme_loaded(rules_engine):
    scheme = rules_engine.get_scheme("mp_post_matric_scholarship")
    assert scheme is not None
    assert scheme.status == "PLACEHOLDER"
    assert "aadhaar" in scheme.required_documents
    assert len(scheme.rules) >= 7


def test_all_rules_pass(rules_engine):
    docs = create_clean_docs()
    report = rules_engine.evaluate(
        scheme_id="mp_post_matric_scholarship",
        session_id="test-session-1",
        documents=docs,
        spoken_data={"name": "Rajesh Kumar Sharma"}
    )

    assert report.can_submit is True
    assert report.status_summary == "READY_TO_APPLY"
    assert report.fix_count == 0
    assert report.unverified_count == 0
    assert report.pass_count == report.total_checks

    for r in report.results:
        assert r.status == RuleStatus.PASS
        assert r.quoted_text is not None and len(r.quoted_text) > 0


def test_missing_document_flagged_as_fix(rules_engine):
    docs = create_clean_docs()
    # Remove passbook
    del docs["bank_passbook"]

    report = rules_engine.evaluate(
        scheme_id="mp_post_matric_scholarship",
        session_id="test-session-2",
        documents=docs
    )

    assert report.can_submit is False
    assert report.status_summary == "FIXES_REQUIRED"
    assert report.fix_count >= 1

    passbook_results = [r for r in report.results if r.rule_id == "req_passbook"]
    assert len(passbook_results) == 1
    assert passbook_results[0].status == RuleStatus.FIX
    assert "दस्तावेज़ अनुपलब्ध" in passbook_results[0].quoted_text


def test_name_mismatch_detected(rules_engine):
    docs = create_clean_docs()
    # Modify passbook name to a completely different name
    docs["bank_passbook"].fields["name"] = ExtractedField(
        name="name",
        value="Vikas Patel",
        quoted_text="Vikas Patel",
        doc_type="bank_passbook"
    )

    report = rules_engine.evaluate(
        scheme_id="mp_post_matric_scholarship",
        session_id="test-session-3",
        documents=docs
    )

    assert report.can_submit is False
    name_check = [r for r in report.results if r.rule_id == "name_aadhaar_passbook"][0]
    assert name_check.status == RuleStatus.FIX
    assert "Rajesh Kumar Sharma" in name_check.quoted_text
    assert "Vikas Patel" in name_check.quoted_text


def test_income_limit_exceeded(rules_engine):
    docs = create_clean_docs()
    # Set income above 2,50,000
    docs["income_certificate"].fields["annual_income"] = ExtractedField(
        name="annual_income",
        value=320000.0,
        quoted_text="₹ 3,20,000/-",
        doc_type="income_certificate"
    )

    report = rules_engine.evaluate(
        scheme_id="mp_post_matric_scholarship",
        session_id="test-session-4",
        documents=docs
    )

    assert report.can_submit is False
    inc_check = [r for r in report.results if r.rule_id == "income_ceiling"][0]
    assert inc_check.status == RuleStatus.FIX
    assert "₹3,20,000" in inc_check.quoted_text
    assert inc_check.fix_hi is not None


def test_expired_certificate(rules_engine):
    docs = create_clean_docs()
    # Set issue date to 4 years ago (expired > 1095 days)
    old_date = (datetime.now() - timedelta(days=1200)).strftime("%d/%m/%Y")
    docs["income_certificate"].fields["issue_date"] = ExtractedField(
        name="issue_date",
        value=old_date,
        quoted_text=old_date,
        doc_type="income_certificate"
    )

    report = rules_engine.evaluate(
        scheme_id="mp_post_matric_scholarship",
        session_id="test-session-5",
        documents=docs
    )

    assert report.can_submit is False
    date_check = [r for r in report.results if r.rule_id == "cert_freshness"][0]
    assert date_check.status == RuleStatus.FIX
    assert old_date in date_check.quoted_text


def test_unverified_unreadable_field(rules_engine):
    docs = create_clean_docs()
    # Income certificate is uploaded, but annual_income field is missing/unreadable
    del docs["income_certificate"].fields["annual_income"]

    report = rules_engine.evaluate(
        scheme_id="mp_post_matric_scholarship",
        session_id="test-session-6",
        documents=docs
    )

    assert report.can_submit is False
    inc_check = [r for r in report.results if r.rule_id == "income_ceiling"][0]
    assert inc_check.status == RuleStatus.COULD_NOT_VERIFY
    assert "सत्यापित नहीं हो सका" in inc_check.message_hi
    assert "Could not verify — please check manually" in inc_check.message_en
