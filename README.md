# Kaagaz Saathi 

> **Voice-First Document Pre-Check for Government Schemes**  
> Built for **The Great Indian AI Internship Challenge by Gnani AI**  

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat&logo=next.js)](https://nextjs.org)
[![Gnani AI](https://img.shields.io/badge/Powered%20By-Gnani%20Prisma%20%26%20Timbre-orange?style=flat)](https://gnani.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 1. Problem Statement & Impact

Over **30% of eligible Indian citizens** applying for government scholarships, pensions, and certificates face disqualification or months-long delays due to minor clerical document errors:
- A one-letter spelling mismatch between Aadhaar and a bank passbook (e.g. *Sharma* vs *Sarma*).
- An expired income certificate (issued > 3 years ago).
- An annual income exceeding the scheme ceiling.
- Unreadable or missing document pages.

**Kaagaz Saathi** transforms this multi-month rejection ordeal into a **30-second pre-submission sanity check** on a mobile phone:
1. **Speaks & Listens:** The applicant speaks their name and income in Hindi/English.
2. **Inspects Documents:** Snaps photos of their Aadhaar, Income Certificate, Marksheet, and Passbook.
3. **Explains Fixes:** Highlights the exact errors with quoted document text and speaks a plain-language Hindi summary of what to fix before filing.

> **Impact Line:** *"Rejected twice for a one-letter name mismatch → caught in 30 seconds before submission."*

---

## 2. Gnani AI Technology in the Core Path

Kaagaz Saathi integrates Gnani AI's proprietary speech stack directly into the application loop:

1. **Gnani Prisma (Speech-to-Text):**
   - Transcribes natural Hindi (`hi-IN`) and Indian English (`en-IN`) speech from mobile microphones.
   - Robust against Indian accents, phonetic variants, and background telephony noise.
   - Used in `POST /api/voice/answer` and `POST /api/voice/confirm`.
2. **Gnani Timbre (Text-to-Speech):**
   - Expressive multilingual speech synthesis (`timbre-v2.5`, voice: `Nalini`).
   - Contextual normalization of Indian numbers, currencies (₹2,50,000), and dates.
   - Speaks guided questions, voice confirmation queries, and final audit summaries.
   - **Credit Frugality:** All Timbre audio is cached locally by MD5 hash (`backend/cache/tts/`) so identical prompts never consume extra Gnani credits.

---

## 3. Trust Principles & Engineering Highlights

- **Strictly No LLMs:** All verification rules are evaluated by a 100% deterministic pure-Python engine. Zero stochastic hallucinations.
- **"No Quote, No Pass":** Every flag displays the exact text read from the document and the official rule ID. If an image is blurry or unreadable, the engine returns `COULD_NOT_VERIFY` rather than guessing.
- **Zero Data Retention:** No databases are used. All documents and audio buffers exist purely in volatile memory (RAM) and are permanently purged on request (`DELETE /api/session/{id}`).
- **Cross-Script Indic Matching:** Bridges Devanagari Hindi script with Latin English using `indic-transliteration` (ITRANS) and `rapidfuzz`, including modern Hindi schwa syncope handling.

---

## 4. Repository Structure

```
kaagaz-saathi/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI endpoints & route wiring
│   │   ├── config.py               # Pydantic v2 settings & env config
│   │   ├── models.py               # Pydantic schemas (rules, reports, docs)
│   │   ├── session.py              # In-memory session manager with TTL
│   │   ├── gnani/                  # Gnani Prisma (STT) and Timbre (TTS) wrappers
│   │   ├── docs/                   # OpenCV preprocessing, OCR, and document parsers
│   │   ├── matching/               # Indic transliteration, date & currency parsers
│   │   └── rules/                  # Pure-Python rules engine & scheme definitions
│   ├── tests/                      # Automated pytest unit & integration tests
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Container definition
│   └── .env.example
├── frontend/                       # Mobile-first Next.js 16 (App Router + Tailwind)
│   ├── src/app/                    # App Router layout & page
│   ├── src/components/             # VoiceStep, UploadStep, ReportStep, PrivacyModal
│   └── src/lib/                    # API client & bilingual translations (hi/en)
├── samples/                        # 6 synthetic mock documents for testing (clean & defect)
├── docs/                           # Architecture, demo script, project explanation & posts
├── render.yaml                     # Cloud deployment configuration
└── README.md
```

---

## 5. Local Setup & Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Navigate to backend and create virtual environment
cd backend
python -m venv venv

# Activate venv:
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Open .env and add your GNANI_API_KEY (optional: DEV_MOCK_GNANI=true for offline testing)

# Run the Gnani AI smoke test
python test_gnani_smoke.py

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend runs at: `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).

### 2. Frontend Setup
```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open `http://localhost:3000` on your mobile browser or desktop.

---

## 6. Running Automated Tests

Run the comprehensive pytest suite covering rules engine, parsers, Indic matching, and hardening:

```bash
# From repository root
.\backend\venv\Scripts\pytest
```

**Test Coverage Highlights:**
- `tests/test_rules_engine.py`: PASS, FIX, and COULD_NOT_VERIFY rule scenarios.
- `tests/test_matching.py`: Devanagari transliteration, "Sharma" vs "Sarma", DD/MM swap, Hindi number words.
- `tests/test_parsers.py`: Aadhaar, Income Certificate, Marksheet, Passbook OCR parsers.
- `tests/test_voice_flow.py`: Full session lifecycle and confirmation loop.
- `tests/test_hardening.py`: 10MB upload limit, empty audio rejection, and Laplacian blur detection.

---

## 7. Limitations & Honest Scope

- **Scheme Coverage:** The MVP is pre-configured for the **Madhya Pradesh Post-Matric Scholarship Scheme** (`mp_post_matric_scholarship.json`). New schemes can be added by placing a JSON rule file in `backend/app/rules/schemes/`.
- **Known Layouts:** OCR field parsers use regular expressions and key anchors optimized for standard Indian government document formats (Aadhaar cards, Lok Seva Kendra income certificates, state education boards, and PSU bank passbooks).
- **Advisory Pre-Check:** Kaagaz Saathi provides pre-submission guidance and does not replace official scrutiny by government verification officers.

---

## 8. Contest Checklist for the User

- [x] Phase 1–8 implementation completed end-to-end.
- [x] 29 automated tests passing.
- [x] Next.js frontend builds with 0 errors.
- [ ] **Fill Scheme & Key:** Add your official `GNANI_API_KEY` in `backend/.env` (and adjust limits in `backend/app/rules/schemes/mp_post_matric_scholarship.json` if desired).
- [ ] **Record Demo Video:** Follow [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) (50s captioned video with the 3s hook).
- [ ] **Post on LinkedIn & X:** Use the ready-to-post drafts in [`docs/POST_DRAFTS.md`](docs/POST_DRAFTS.md) with `#GreatIndianAIInternshipChallenge` and `#GnaniAI`.
- [ ] **Submit Form:** Submit demo video link, post URL, and project explanation before the deadline.
