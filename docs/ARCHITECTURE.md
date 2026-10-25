# Kaagaz Saathi — Architecture & Technical Design

## 1. Executive Summary

**Kaagaz Saathi** ("कागज़ साथी" — Document Companion) is a mobile-first, voice-guided pre-verification engine built for Indian citizens applying for government welfare schemes (scholarships, pensions, income certificates). 

Its core mission is to transform a painful, multi-month rejection cycle caused by trivial clerical errors (a single-letter typo, expired certificate, or income limit violation) into a **30-second pre-submission check** conducted entirely by voice in regional languages (Hindi / Indian English).

---

## 2. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            MOBILE BROWSER (PWA)                                   |
|  - Next.js 16 (App Router) + Tailwind CSS + TypeScript                             |
|  - MediaRecorder Audio Capture (Mic)                                              |
|  - Camera Photo Capture (<input type=file capture="environment">)                 |
|  - Bilingual Toggle (Hindi default / English)                                    |
+-----------------------------------------------------------------------------------+
                                    |        ^
                       HTTP / REST  |        |  Audio Streams (WAV)
                                    v        |
+-----------------------------------------------------------------------------------+
|                        FASTAPI BACKEND SERVICE                                    |
|                                                                                   |
|  +------------------------+  +----------------------+  +-----------------------+  |
|  |     GNANI SPEECH       |  |   OPENCV & OCR       |  |  INDIC MATCHING       |  |
|  |  - Prisma STT Client   |  |  - Grayscale         |  |  - Transliteration    |  |
|  |  - Timbre TTS Client   |  |  - Bilateral Denoise |  |  - RapidFuzz Match    |  |
|  |  - Local MD5 TTS Cache |  |  - Deskew Transform  |  |  - DD/MM Swap Check   |  |
|  |  - Retry & Rate Limit  |  |  - Adaptive Thresh   |  |  - Hindi Number Words |  |
|  +------------------------+  +----------------------+  +-----------------------+  |
|                                      |                                            |
|                                      v                                            |
|  +-----------------------------------------------------------------------------+  |
|  |                 DETERMINISTIC RULES ENGINE ("NO QUOTE, NO PASS")            |  |
|  |  - Required Document Verifier                                               |  |
|  |  - Cross-Document Name Consistency Verifier (Devanagari vs Latin)           |  |
|  |  - Income Ceiling Verifier (e.g. <= ₹2,50,000)                               |  |
|  |  - Certificate Validity & Freshness Verifier (e.g. <= 3 years)              |  |
|  |  - Status: PASS | FIX | COULD_NOT_VERIFY (Zero Guessing Policy)             |  |
|  +-----------------------------------------------------------------------------+  |
|                                      |                                            |
|                                      v                                            |
|  +-----------------------------------------------------------------------------+  |
|  |                      EPHEMERAL SESSION STORE                                |  |
|  |  - In-Memory Volatile TTL Cache (No persistent database, No PII on disk)    |  |
|  |  - Instant Session Purge via DELETE /api/session/{id}                       |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                    |
           HTTPS REST API           |  X-API-Key-ID Header
                                    v
+-----------------------------------------------------------------------------------+
|                           GNANI AI CLOUD PLATFORM                                 |
|                                                                                   |
|  - Gnani Prisma v2.5 (STT): Robust Indian language transcription (hi-IN, en-IN)   |
|  - Gnani Timbre v2.5 (TTS): Expressive Indian voice synthesis (Nalini, hi-IN)     |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Processing Flows

### Flow A: Guided Voice Q&A Interaction
1. **Prompt Speech:** The backend retrieves or synthesizes the question via **Gnani Timbre** (e.g., *"कृपया अपना पूरा नाम बताएं जैसे आधार कार्ड पर लिखा है।"*). Audio is streamed back as WAV (or retrieved instantly from the local MD5 cache).
2. **Audio Capture:** The browser records raw audio chunks via `navigator.mediaDevices.getUserMedia` and `MediaRecorder`.
3. **Transcription:** Audio is sent to `POST /api/voice/answer`. The backend forwards the audio to **Gnani Prisma STT** (`POST https://api.vachana.ai/stt/v3`), obtaining transcript text.
4. **Extraction:** Specialized parsers normalize the spoken input (e.g., extracting Hindi number words like *"ढाई लाख"* into `250000.0`).
5. **Voice Confirmation Loop:** Timbre generates a verification prompt (*"आपने कहा: Rajesh Kumar Sharma। क्या यह सही है?"*).
6. **Affirmation:** The applicant replies *"हाँ"* (Yes) or *"नहीं"* (No). On confirmation, the field is saved into the ephemeral session state, and the wizard advances.

### Flow B: Document Preprocessing & Parsing
1. **Capture:** The user takes a smartphone camera photo or uploads a scan.
2. **OpenCV Preprocessing Pipeline (`app/docs/preprocess.py`):**
   - **Quality Check:** Laplacian variance calculation flags blurry or illegible photos (`blur_score < 30`).
   - **Grayscale Conversion:** Reduces RGB channels to single luminance channel.
   - **Gaussian & Bilateral Denoising:** Suppresses sensor noise while maintaining sharp document edge boundaries.
   - **Deskew Correction:** Calculates the angle of minimum bounding area and rotates the image straight.
   - **Adaptive Thresholding:** Applies Otsu/Gaussian adaptive binarization to maximize OCR contrast.
3. **OCR Engine (`app/docs/ocr.py`):** Runs dual-language (Hindi + English) recognition.
4. **Document Parsers (`app/docs/parsers/*.py`):**
   - **Aadhaar Parser:** Extracts Name, masked/full UID, and DOB.
   - **Income Certificate Parser:** Extracts Annual Income (`₹ 1,80,000/-`), Issue Date (`15/09/2026`), and Certificate Number.
   - **Marksheet Parser:** Extracts Student Name, Roll Number, Passing Year, and Percentage (`74.5%`).
   - **Bank Passbook Parser:** Extracts Account Holder Name, Account Number, and IFSC Code.
   - **Mandatory Quote Binding:** Every extracted value is permanently tied to its exact `quoted_text` from the original document.

### Flow C: Deterministic Evaluation ("No Quote, No Pass")
1. **Transliteration & Normalization:** Devanagari script is converted to Latin ASCII via `indic-transliteration` (ITRANS). Modern Hindi schwa syncope (dropping inherent trailing 'a' in names like "Rajesh" vs "Rajesha") is applied.
2. **Fuzzy Comparison:** RapidFuzz token sort and phonetic matching compare the applicant's spoken name against the Aadhaar card, Bank Passbook, and Marksheet.
3. **Date & Age Arithmetic:** Checks if the certificate issue date exceeds the allowed freshness threshold (e.g. 1095 days).
4. **Income Ceiling:** Checks if annual family income is within limits (e.g. <= ₹2,50,000).
5. **Verdict Generation:**
   - `PASS`: Rule passed with verified quoted evidence.
   - `FIX`: Rule violated. Cites exact quoted snippet and specifies plain-language fix.
   - `COULD_NOT_VERIFY`: Value unreadable or missing. Never guesses. Prompts manual verification.
6. **Spoken Summary:** Timbre synthesizes a clear, concise audio explanation of the fixes.

---

## 4. Trust Principles & Security

- **Strictly No LLMs:** Eligibility cannot be delegated to stochastic language models that hallucinate. All validation logic is 100% deterministic Python code.
- **Zero Data Retention:** No databases (SQL/NoSQL) are used. Files and session state live in RAM only and are purged on demand.
- **"No Quote, No Pass":** If the system cannot cite the exact text read from the document, it outputs `COULD_NOT_VERIFY` rather than guessing.
- **Pre-Check Disclaimer:** The application states clearly in Hindi and English that it is a pre-submission companion, not an official government verdict.
