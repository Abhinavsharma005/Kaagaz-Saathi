import pytest
from datetime import datetime
from app.matching.names import compare_names, clean_name, transliterate_to_latin
from app.matching.dates import parse_flexible_date, days_since, detect_dd_mm_swap
from app.matching.amounts import parse_amount, format_inr, parse_hindi_number_words


def test_name_exact_and_case_insensitive():
    score, _ = compare_names("Rajesh Kumar Sharma", "rajesh kumar sharma")
    assert score == 100.0


def test_name_honorific_stripping():
    # Shri / Smt / Mr / Dr should be stripped
    score1, _ = compare_names("Shri Rajesh Sharma", "Rajesh Sharma")
    assert score1 >= 95.0

    score2, _ = compare_names("Mr. Rajesh Kumar", "Rajesh Kumar")
    assert score2 >= 95.0

    score3, _ = compare_names("श्री राजेश कुमार", "राजेश कुमार")
    assert score3 >= 95.0


def test_name_devanagari_vs_latin_transliteration():
    # Hindi Devanagari vs English Latin
    score, exp = compare_names("राजेश कुमार शर्मा", "Rajesh Kumar Sharma")
    assert score >= 85.0, f"Score {score} too low: {exp}"


def test_name_sharma_vs_sarma_phonetic():
    # Common transliteration difference: Sharma vs Sarma
    score, exp = compare_names("Rajesh Sharma", "Rajesh Sarma")
    assert score >= 90.0, f"Phonetic score {score} too low: {exp}"


def test_name_spelling_mismatch_fails_threshold():
    # Completely different names must fail
    score, _ = compare_names("Rajesh Sharma", "Vikas Patel")
    assert score < 50.0


def test_flexible_date_parsing():
    dt1 = parse_flexible_date("15/08/2023")
    assert dt1 == datetime(2023, 8, 15)

    dt2 = parse_flexible_date("2023-08-15")
    assert dt2 == datetime(2023, 8, 15)

    dt3 = parse_flexible_date("15 Aug 2023")
    assert dt3 == datetime(2023, 8, 15)

    dt4 = parse_flexible_date("15-08-2023")
    assert dt4 == datetime(2023, 8, 15)


def test_dd_mm_swap_detection():
    # 08/25/2023 is clearly MM/DD/YYYY because 25 > 12
    is_swap, msg = detect_dd_mm_swap("08/25/2023")
    assert is_swap is True
    assert "MM/DD/YYYY swap" in msg

    # 25/08/2023 is standard Indian DD/MM/YYYY
    is_swap2, _ = detect_dd_mm_swap("25/08/2023")
    assert is_swap2 is False


def test_amount_parsing_with_currency_symbols():
    assert parse_amount("₹ 2,50,000/-") == 250000.0
    assert parse_amount("Rs. 1,80,000") == 180000.0
    assert parse_amount("INR 50000") == 50000.0


def test_amount_parsing_devanagari_numerals():
    assert parse_amount("२,५०,०००") == 250000.0
    assert parse_amount("₹ १,८०,०००") == 180000.0


def test_amount_parsing_spoken_hindi():
    assert parse_amount("ढाई लाख") == 250000.0
    assert parse_amount("2.5 लाख") == 250000.0
    assert parse_amount("डेढ़ लाख") == 150000.0
    assert parse_amount("दो लाख") == 200000.0
    assert parse_amount("पचास हज़ार") == 50000.0


def test_format_inr():
    assert format_inr(250000) == "2,50,000"
    assert format_inr(180000) == "1,80,000"
    assert format_inr(5000) == "5,000"
    assert format_inr(10000000) == "1,00,00,000"
