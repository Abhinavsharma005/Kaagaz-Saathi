import re
from datetime import datetime, date
from typing import Optional, Tuple


DATE_PATTERNS = [
    # DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    (r"(\b\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4}\b)", "%d/%m/%Y"),
    # YYYY-MM-DD or YYYY/MM/DD
    (r"(\b\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2}\b)", "%Y/%m/%d"),
    # DD Mon YYYY (e.g. 15 Aug 2023, 15-Aug-2023)
    (r"(\b\d{1,2})[/\-\s]([A-Za-z]{3,9})[/\-\s](\d{4}\b)", None),
    # DD/MM/YY
    (r"(\b\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2}\b)", "%d/%m/%y")
]

MONTH_NAMES = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12
}


def parse_flexible_date(date_str: str) -> Optional[datetime]:
    """
    Parses dates across Indian government document formats.
    Defaults to DD/MM/YYYY convention.
    """
    if not date_str:
        return None

    clean = str(date_str).strip()

    # Try textual month first (e.g. 15 Aug 2023)
    match_txt = re.search(r"(\b\d{1,2})[/\-\s]([A-Za-z]{3,9})[/\-\s](\d{4}\b)", clean)
    if match_txt:
        d, m_str, y = match_txt.groups()
        m_lower = m_str.lower()
        if m_lower in MONTH_NAMES:
            try:
                return datetime(int(y), MONTH_NAMES[m_lower], int(d))
            except ValueError:
                pass

    # Try standard DD/MM/YYYY or DD-MM-YYYY
    match_dmy = re.search(r"(\b\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4}\b)", clean)
    if match_dmy:
        part1, part2, year = match_dmy.groups()
        p1, p2, y = int(part1), int(part2), int(year)

        # In India, government standard is DD/MM/YYYY
        # Check for swap if p1 > 12 (must be day) or p2 > 12 (swapped month/day)
        if p1 <= 31 and p2 <= 12:
            try:
                return datetime(y, p2, p1)
            except ValueError:
                pass
        elif p2 <= 31 and p1 <= 12:
            # Swapped MM/DD/YYYY
            try:
                return datetime(y, p1, p2)
            except ValueError:
                pass

    # Try YYYY-MM-DD
    match_ymd = re.search(r"(\b\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2}\b)", clean)
    if match_ymd:
        year, month, day = match_ymd.groups()
        try:
            return datetime(int(year), int(month), int(day))
        except ValueError:
            pass

    return None


def days_since(dt: datetime, reference_date: Optional[date] = None) -> int:
    """Calculates elapsed days from dt to reference_date (defaults to today)."""
    ref = reference_date or date.today()
    target = dt.date()
    delta = ref - target
    return max(0, delta.days)


def detect_dd_mm_swap(date_str: str) -> Tuple[bool, str]:
    """Detects if a date string is likely written in US MM/DD format instead of Indian DD/MM format."""
    match = re.search(r"(\b\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4}\b)", str(date_str))
    if not match:
        return False, "Not a standard numeric date"

    p1, p2, y = [int(x) for x in match.groups()]
    if p1 <= 12 and p2 > 12:
        return True, f"Detected MM/DD/YYYY swap: Month is {p1}, Day is {p2}. Indian standard is DD/MM/YYYY."
    return False, "Standard DD/MM/YYYY order"
