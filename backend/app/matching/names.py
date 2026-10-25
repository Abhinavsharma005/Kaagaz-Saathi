import re
from typing import Tuple
from unidecode import unidecode
from rapidfuzz import fuzz
from indic_transliteration import sanscript
from indic_transliteration.sanscript import SchemeMap, SCHEMES, transliterate

# Regex for common honorifics in English and Hindi
HONORIFICS_EN = r"\b(mr|mrs|ms|miss|shri|shree|sri|smt|shrimati|dr|kumar|kumari|late)\b"
HONORIFICS_HI = r"\b(श्री|श्रीमती|सुश्री|डॉ|डॉक्टर|कुमार|कुमारी|स्व|स्वर्गीय|जी)\b"

# Common sound-alike phonetic clusters in Indian names for lenient comparison
PHONETIC_REPLACEMENTS = [
    (r"sh", "s"),
    (r"ee", "i"),
    (r"oo", "u"),
    (r"v", "w"),
    (r"ou", "au"),
    (r"th", "t"),
    (r"dh", "d"),
    (r"kh", "k"),
    (r"bh", "b"),
    (r"gh", "g"),
    (r"ch", "c"),
]


def is_devanagari(text: str) -> bool:
    """Checks if the string contains Devanagari characters."""
    return bool(re.search(r"[\u0900-\u097F]", text))


def transliterate_to_latin(text: str) -> str:
    """Transliterates Devanagari Hindi text to Latin ASCII, handling schwa syncope."""
    if is_devanagari(text):
        # Transliterate from Devanagari to ITRANS then unidecode
        latin = transliterate(text, sanscript.DEVANAGARI, sanscript.ITRANS)
        raw_latin = unidecode(latin).lower()
        
        # Apply modern Hindi schwa syncope: words ending in inherent 'a' drop the 'a'
        # e.g., 'rajesha' -> 'rajesh', 'kumara' -> 'kumar', while keeping 'sharma'
        words = raw_latin.split()
        normalized_words = []
        for w in words:
            # If word transliterated from Devanagari ends with single 'a', and is not a protected surname like sharma
            # In ITRANS, dirgha A is 'A', hrasva a is 'a'.
            # Let's check original ITRANS: if original had lowercase 'a' at end, it's a dropped schwa!
            pass
        return raw_latin
    return text


def apply_schwa_syncope(text: str, is_from_devanagari: bool) -> str:
    """Applies modern Hindi schwa deletion for inherent Sanskrit 'a'."""
    if not is_from_devanagari:
        return text
    words = text.split()
    res = []
    for w in words:
        # Common suffixes/words that drop trailing inherent 'a' in modern Hindi
        if len(w) > 3 and w.endswith("a") and not w.endswith(("aa", "ia", "ya", "ma", "va", "da")):
            res.append(w[:-1])
        elif len(w) > 4 and w.endswith("a") and not w.endswith(("aa", "ia", "rma")):
            res.append(w[:-1])
        else:
            res.append(w)
    return " ".join(res)


def clean_name(name: str) -> str:
    """Normalizes an Indian name by stripping honorifics, punctuation, and extra whitespace."""
    if not name:
        return ""

    from_devanagari = is_devanagari(name)
    # Transliterate if Devanagari
    text = transliterate_to_latin(name)
    # Convert to lowercase ASCII
    text = unidecode(text).lower()

    # Remove special punctuation
    text = re.sub(r"[^\w\s]", " ", text)

    # Strip English honorifics
    text = re.sub(HONORIFICS_EN, " ", text)

    # Apply modern Hindi schwa deletion
    text = apply_schwa_syncope(text, from_devanagari)

    # Normalize whitespace
    words = [w for w in text.split() if len(w) > 1]
    return " ".join(words)


def phonetic_simplify(name: str) -> str:
    """Applies common Indian phonetic simplifications (e.g., sharma -> sarma)."""
    s = clean_name(name)
    for pattern, replacement in PHONETIC_REPLACEMENTS:
        s = re.sub(pattern, replacement, s)
    return s


def compare_names(name1: str, name2: str) -> Tuple[float, str]:
    """
    Compares two Indian names across scripts (Devanagari/Latin) and spellings.
    Returns:
        (score: float [0-100], explanation: str)
    """
    c1 = clean_name(name1)
    c2 = clean_name(name2)

    if not c1 or not c2:
        return 0.0, "One or both names are empty"

    if c1 == c2:
        return 100.0, "Exact match after normalization"

    # RapidFuzz standard comparisons
    token_sort = fuzz.token_sort_ratio(c1, c2)
    token_set = fuzz.token_set_ratio(c1, c2)
    standard_ratio = fuzz.ratio(c1, c2)

    # Phonetic comparison for common Indian surname/name variations (e.g. Sharma vs Sarma)
    p1 = phonetic_simplify(name1)
    p2 = phonetic_simplify(name2)
    phonetic_sort = fuzz.token_sort_ratio(p1, p2)

    # Weighted composite score
    max_score = max(token_sort, token_set, standard_ratio, phonetic_sort)

    explanation = f"token_sort: {token_sort}, token_set: {token_set}, phonetic: {phonetic_sort}"
    return float(max_score), explanation
