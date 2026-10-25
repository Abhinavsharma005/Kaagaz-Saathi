import os
import pytest
import numpy as np
from app.docs.preprocess import preprocess_document_image, bytes_to_numpy, to_grayscale
from app.docs.parsers.aadhaar import parse_aadhaar
from app.docs.parsers.income_cert import parse_income_certificate
from app.docs.parsers.marksheet import parse_marksheet
from app.docs.parsers.passbook import parse_bank_passbook
from app.docs.ocr import process_document


def test_preprocess_pipeline_with_sample_image():
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "samples", "aadhaar_clean.png")
    assert os.path.exists(sample_path)
    with open(sample_path, "rb") as f:
        img_bytes = f.read()

    binary_img, meta = preprocess_document_image(img_bytes)
    assert isinstance(binary_img, np.ndarray)
    assert len(binary_img.shape) == 2  # Grayscale / binary
    assert meta["original_dimensions"] == (800, 500)
    assert "skew_angle" in meta


def test_aadhaar_parser_clean():
    sample_ocr_text = """
    GOVERNMENT OF INDIA / भारत सरकार
    Unique Identification Authority of India
    Rajesh Kumar Sharma
    DOB: 12/05/2002
    Gender: Male
    1234 5678 9012
    Gram Rampur, Bhopal
    """
    doc = parse_aadhaar(sample_ocr_text, "aadhaar_clean.png")
    assert "name" in doc.fields
    assert doc.fields["name"].value == "Rajesh Kumar Sharma"
    assert "1234 5678 9012" in doc.fields["uid"].value
    assert doc.fields["dob"].value == "12/05/2002"
    assert doc.fields["dob"].quoted_text == "12/05/2002"


def test_income_cert_parser_valid():
    sample_ocr_text = """
    REVENUE DEPARTMENT, MADHYA PRADESH
    आय प्रमाण पत्र / Certificate of Family Annual Income
    Applicant Name: Rajesh Kumar Sharma
    Annual Income: ₹ 1,80,000/-
    Date of Issue: 15/09/2026
    Certificate No: MP-REV-INC-2026-89412
    """
    doc = parse_income_certificate(sample_ocr_text, "income_cert_valid.png")
    assert "annual_income" in doc.fields
    assert doc.fields["annual_income"].value == 180000.0
    assert "₹ 1,80,000/-" in doc.fields["annual_income"].quoted_text
    assert doc.fields["issue_date"].value == "15/09/2026"
    assert doc.fields["certificate_no"].value == "MP-REV-INC-2026-89412"


def test_income_cert_parser_expired():
    sample_ocr_text = """
    REVENUE DEPARTMENT, MADHYA PRADESH
    आय प्रमाण पत्र
    Applicant Name: Rajesh Kumar Sharma
    Annual Income: ₹ 3,20,000/-
    Date of Issue: 10/02/2022
    Certificate No: MP-REV-INC-2022-11029
    """
    doc = parse_income_certificate(sample_ocr_text, "income_cert_expired.png")
    assert doc.fields["annual_income"].value == 320000.0
    assert doc.fields["issue_date"].value == "10/02/2022"


def test_marksheet_parser():
    sample_ocr_text = """
    BOARD OF SECONDARY EDUCATION, MP
    Higher Secondary School Certificate
    Candidate Name: Rajesh Kumar Sharma
    Roll No: 458921
    Passing Year: 2024
    Percentage: 74.5%
    Result: PASSED FIRST DIVISION
    """
    doc = parse_marksheet(sample_ocr_text, "marksheet_clean.png")
    assert doc.fields["name"].value == "Rajesh Kumar Sharma"
    assert doc.fields["roll_no"].value == "458921"
    assert doc.fields["percentage"].value == 74.5
    assert "74.5%" in doc.fields["percentage"].quoted_text
    assert doc.fields["passing_year"].value == "2024"


def test_passbook_parser():
    sample_ocr_text = """
    STATE BANK OF INDIA
    Savings Bank Account Passbook
    Account Holder Name: Rajesh Kumar Sharma
    A/c No: 98765432101
    IFSC Code: SBIN0001234
    Branch: TT Nagar, Bhopal
    """
    doc = parse_bank_passbook(sample_ocr_text, "bank_passbook_clean.png")
    assert doc.fields["name"].value == "Rajesh Kumar Sharma"
    assert doc.fields["account_number"].value == "98765432101"
    assert doc.fields["ifsc"].value == "SBIN0001234"


def test_process_document_with_override_text():
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "samples", "aadhaar_clean.png")
    with open(sample_path, "rb") as f:
        img_bytes = f.read()

    doc = process_document(
        image_bytes=img_bytes,
        doc_type="aadhaar",
        filename="aadhaar_clean.png",
        override_text="Government of India\nRajesh Kumar Sharma\nDOB: 12/05/2002\n1234 5678 9012"
    )
    assert doc.fields["name"].value == "Rajesh Kumar Sharma"
    assert doc.fields["uid"].value == "1234 5678 9012"
