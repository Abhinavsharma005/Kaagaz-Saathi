import re
from typing import Optional, Union

DEVANAGARI_DIGITS = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
}

HINDI_NUMBER_WORDS = {
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5,
    "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80, "नब्बे": 90
}


def normalize_devanagari_digits(text: str) -> str:
    """Replaces Devanagari digits with standard Arabic digits."""
    res = []
    for ch in str(text):
        res.append(DEVANAGARI_DIGITS.get(ch, ch))
    return "".join(res)


def parse_hindi_number_words(text: str) -> Optional[float]:
    """Parses spoken Hindi phrases like 'ढाई लाख', 'दो लाख पचास हजार', 'डेढ़ लाख'."""
    s = text.strip()

    # Pre-calculated common spoken colloquial phrases
    if "ढाई लाख" in s or "2.5 लाख" in s or "2.5 lakh" in s.lower():
        return 250000.0
    if "डेढ़ लाख" in s or "1.5 लाख" in s or "1.5 lakh" in s.lower():
        return 150000.0
    if "साढ़े तीन लाख" in s or "3.5 लाख" in s:
        return 350000.0

    # Pattern: [number/word] लाख [number/word] हज़ार
    lakh_match = re.search(r"(\d+(\.\d+)?|एक|दो|तीन|चार|पांच|पाँच)\s*(?:लाख|lakh)", s, re.IGNORECASE)
    lakh_val = 0.0
    if lakh_match:
        token = lakh_match.group(1)
        if token in HINDI_NUMBER_WORDS:
            lakh_val = float(HINDI_NUMBER_WORDS[token]) * 100000.0
        else:
            try:
                lakh_val = float(token) * 100000.0
            except ValueError:
                pass

    thousand_match = re.search(r"(\d+|पचास|साठ|सत्तर|अस्सी|नब्बे)\s*(?:हज़ार|हजार|thousand)", s, re.IGNORECASE)
    thousand_val = 0.0
    if thousand_match:
        token = thousand_match.group(1)
        if token in HINDI_NUMBER_WORDS:
            thousand_val = float(HINDI_NUMBER_WORDS[token]) * 1000.0
        else:
            try:
                thousand_val = float(token) * 1000.0
            except ValueError:
                pass

    if lakh_val > 0 or thousand_val > 0:
        return lakh_val + thousand_val

    return None


def parse_amount(val: Union[str, int, float]) -> Optional[float]:
    """
    Extracts a numeric amount from strings with currency symbols, commas, or Hindi words.
    e.g.:
      '₹ 2,50,000/-' -> 250000.0
      '२,५०,०००'     -> 250000.0
      'ढाई लाख'      -> 250000.0
    """
    if val is None:
        return None

    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    if not s:
        return None

    # Replace Devanagari digits
    s = normalize_devanagari_digits(s)

    # Check Hindi number words
    hindi_num = parse_hindi_number_words(s)
    if hindi_num is not None:
        return hindi_num

    # Remove currency symbols (₹, Rs, INR) and suffixes (/-)
    s = re.sub(r"[₹\$,]|(rs\.?)|(inr)|(/-)", "", s, flags=re.IGNORECASE)
    s = s.strip()

    # Find first continuous numeric block with optional decimal
    match = re.search(r"\b(\d+(\.\d+)?)\b", s)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass

    return None


def format_inr(val: Union[int, float]) -> str:
    """Formats a number with Indian currency grouping (e.g. 250000 -> 2,50,000)."""
    s = str(int(val))
    if len(s) <= 3:
        return s
    last_three = s[-3:]
    remaining = s[:-3]
    chunks = []
    while len(remaining) > 2:
        chunks.insert(0, remaining[-2:])
        remaining = remaining[:-2]
    if remaining:
        chunks.insert(0, remaining)
    return ",".join(chunks) + "," + last_three

