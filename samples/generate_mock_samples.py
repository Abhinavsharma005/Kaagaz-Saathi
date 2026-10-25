import os
from PIL import Image, ImageDraw, ImageFont


def create_mock_document(
    output_path: str,
    title: str,
    subtitle: str,
    lines: list,
    width: int = 800,
    height: int = 500,
    header_color: tuple = (30, 60, 114),
    bg_color: tuple = (250, 250, 252)
):
    """Generates a clean synthetic government document card image for testing."""
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([(0, 0), (width, 80)], fill=header_color)

    # Simple default font
    try:
        font_large = ImageFont.load_default(size=24)
        font_sub = ImageFont.load_default(size=16)
        font_body = ImageFont.load_default(size=18)
    except TypeError:
        # Compatibility with older Pillow
        font_large = font_sub = font_body = ImageFont.load_default()

    # Title & Subtitle in header
    draw.text((25, 18), title, fill=(255, 255, 255), font=font_large)
    draw.text((25, 48), subtitle, fill=(220, 220, 240), font=font_sub)

    # Border
    draw.rectangle([(10, 10), (width - 10, height - 10)], outline=(200, 200, 200), width=2)

    # Watermark / Seal circle
    draw.ellipse([(width - 130, 25), (width - 50, 105)], outline=(220, 220, 220), width=3)
    draw.text((width - 110, 60), "GOVT", fill=(180, 180, 180), font=font_sub)

    # Content lines
    y = 120
    for label, val in lines:
        draw.text((40, y), f"{label}:", fill=(80, 80, 80), font=font_body)
        draw.text((250, y), str(val), fill=(20, 20, 20), font=font_body)
        draw.line([(40, y + 30), (width - 40, y + 30)], fill=(235, 235, 235), width=1)
        y += 45

    # Footer notice
    draw.text((40, height - 40), "* Mock document generated strictly for Kaagaz Saathi verification tests (No PII).", fill=(130, 130, 130), font=font_sub)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"Generated: {output_path}")


def main():
    samples_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. Aadhaar Clean
    create_mock_document(
        output_path=os.path.join(samples_dir, "aadhaar_clean.png"),
        title="GOVERNMENT OF INDIA / भारत सरकार",
        subtitle="Unique Identification Authority of India - Aadhaar",
        lines=[
            ("Name", "Rajesh Kumar Sharma"),
            ("DOB", "12/05/2002"),
            ("Gender", "Male / पुरुष"),
            ("Aadhaar Number", "1234 5678 9012"),
            ("Address", "Gram Rampur, Tahsil Huzur, Bhopal MP")
        ],
        header_color=(24, 76, 120)
    )

    # 2. Aadhaar with deliberate name mismatch
    create_mock_document(
        output_path=os.path.join(samples_dir, "aadhaar_mismatch.png"),
        title="GOVERNMENT OF INDIA / भारत सरकार",
        subtitle="Unique Identification Authority of India - Aadhaar",
        lines=[
            ("Name", "Rajesh Sarma"),
            ("DOB", "12/05/2002"),
            ("Gender", "Male / पुरुष"),
            ("Aadhaar Number", "9876 5432 1098"),
            ("Address", "Gram Rampur, Tahsil Huzur, Bhopal MP")
        ],
        header_color=(120, 30, 30)
    )

    # 3. Income Certificate Valid (< 2.5 Lakh, recent)
    create_mock_document(
        output_path=os.path.join(samples_dir, "income_cert_valid.png"),
        title="REVENUE DEPARTMENT, MADHYA PRADESH",
        subtitle="Certificate of Family Annual Income / आय प्रमाण पत्र",
        lines=[
            ("Applicant Name", "Rajesh Kumar Sharma"),
            ("Father Name", "Rameshwar Sharma"),
            ("Annual Income", "₹ 1,80,000/-"),
            ("Date of Issue", "15/09/2026"),
            ("Certificate No", "MP-REV-INC-2026-89412"),
            ("Issuing Authority", "Tahasildar, Huzur Bhopal")
        ],
        header_color=(34, 112, 60)
    )

    # 4. Income Certificate Defect (> 2.5 Lakh, expired 4 years ago)
    create_mock_document(
        output_path=os.path.join(samples_dir, "income_cert_expired.png"),
        title="REVENUE DEPARTMENT, MADHYA PRADESH",
        subtitle="Certificate of Family Annual Income / आय प्रमाण पत्र",
        lines=[
            ("Applicant Name", "Rajesh Kumar Sharma"),
            ("Father Name", "Rameshwar Sharma"),
            ("Annual Income", "₹ 3,20,000/-"),
            ("Date of Issue", "10/02/2022"),
            ("Certificate No", "MP-REV-INC-2022-11029"),
            ("Issuing Authority", "Tahasildar, Huzur Bhopal")
        ],
        header_color=(140, 50, 30)
    )

    # 5. Bank Passbook Clean
    create_mock_document(
        output_path=os.path.join(samples_dir, "bank_passbook_clean.png"),
        title="STATE BANK OF INDIA",
        subtitle="Savings Bank Account Passbook / बैंक पासबुक",
        lines=[
            ("Account Holder Name", "Rajesh Kumar Sharma"),
            ("A/c No", "98765432101"),
            ("IFSC Code", "SBIN0001234"),
            ("Branch", "TT Nagar, Bhopal (MP)"),
            ("CIF No", "85940219482")
        ],
        header_color=(15, 60, 100)
    )

    # 6. Marksheet Clean
    create_mock_document(
        output_path=os.path.join(samples_dir, "marksheet_clean.png"),
        title="BOARD OF SECONDARY EDUCATION, MP",
        subtitle="Higher Secondary School Certificate Examination (10+2)",
        lines=[
            ("Candidate Name", "Rajesh Kumar Sharma"),
            ("Roll No", "458921"),
            ("Passing Year", "2024"),
            ("Percentage", "74.5%"),
            ("Result", "PASSED FIRST DIVISION")
        ],
        header_color=(70, 45, 110)
    )


if __name__ == "__main__":
    main()
