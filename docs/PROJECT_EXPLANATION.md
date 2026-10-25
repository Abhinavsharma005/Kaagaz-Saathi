# Kaagaz Saathi (कागज़ साथी) — Project Explanation

**Contest Submission:** The Great Indian AI Internship Challenge by Gnani AI  
**Applicant Track:** Solo Ninja / Real Deal / Main Character  
**Submission Category:** Speech & Vision AI for Real-World Social Impact  

---

## 1. The Problem

Every year, millions of Indian students, low-income families, and senior citizens apply for central and state government schemes (such as Post-Matric Scholarships, PM-Kisan, and old-age pensions). 

Tragically, **over 30% of eligible applications are rejected or returned** due to minor clerical mismatches:
- A one-letter spelling difference between an Aadhaar card and a Bank Passbook (e.g. *Rajesh Sharma* vs *Rajesh Sarma*).
- An income certificate that expired 2 months ago (certificates are only valid for 3 years).
- Income exceeding a scheme ceiling by a small margin.
- Missing mandatory pages (e.g., uploading the front cover of a passbook instead of the account page).

When an application is rejected at a government verification desk, the applicant typically loses **weeks or months** waiting for notices, making repeat trips to district offices (Tehsil/Collectorate), and often misses hard submission deadlines entirely. Many applicants are first-generation learners or rural citizens who find typing English web forms intimidating.

---

## 2. Who Will Use It?

1. **First-Time Student Applicants:** Applying for state and central scholarships without needing English typing skills.
2. **Rural Families & Elderly Pensioners:** Citizens who are far more comfortable speaking in their regional tongue (Hindi/Hinglish) than reading complex PDF guidelines.
3. **Village Cyber-Café & CSC Operators (VLEs):** Operators who file hundreds of forms daily and need a 30-second automated sanity check before pressing "Submit" on official state portals.

---

## 3. The Solution: Kaagaz Saathi

**Kaagaz Saathi** ("कागज़ साथी" — Document Companion) is a voice-first, mobile web application that conducts an end-to-end pre-submission sanity check in 30 seconds:
1. **Speaks and Listens:** The applicant speaks their name and income in Hindi or English into their mobile mic.
2. **Inspects Documents:** The applicant snaps a photo of their Aadhaar card, income certificate, marksheet, and bank passbook.
3. **Delivers an Explainable Verdict:** The app highlights exactly what is wrong, quotes the offending text from the document, and reads out a clear spoken summary in Hindi explaining how to fix it before submission.

**Impact Claim:** *"Rejected twice for a one-letter name mismatch → caught in 30 seconds before submission."*

---

## 4. Gnani AI Technology in the Core Path

Kaagaz Saathi is built directly on **Gnani.ai's proprietary Indian voice technology stack**:

### A. Gnani Prisma (Speech-to-Text)
- **Role:** Transcribing spoken applicant inputs in Hindi (`hi-IN`) and Indian English (`en-IN`).
- **Why Prisma?** Indian names, accents, and code-mixed spoken phrases (like *"मेरी आय ढाई लाख रुपये है"*) fail consistently on Western speech models. Gnani Prisma v2.5 accurately transcribed dialectal Hindi and handles background telephony/microphone noise effortlessly.
- **API Endpoint Used:** `POST https://api.vachana.ai/stt/v3` with multipart audio buffers.

### B. Gnani Timbre (Text-to-Speech)
- **Role:** Providing natural, expressive Hindi speech guidance across the entire experience:
  1. Speaking guided wizard questions (*"कृपया अपना पूरा नाम बताएं..."*).
  2. Spoken confirmation loop (*"आपने कहा: राजेश कुमार शर्मा, क्या यह सही है?"*).
  3. Reading the final audit report summary (*"सावधान! आपके दस्तावेज़ों में 2 सुधार की आवश्यकता है..."*).
- **Why Timbre?** Timbre v2.5 with voice `Nalini` delivers human-like contextual normalization of Indian currencies (e.g. ₹2,50,000) and dates, crucial for citizen comprehension.
- **API Endpoint Used:** `POST https://api.vachana.ai/api/v1/tts/inference` with MD5 disk caching for credit frugality.

---

## 5. Trust Principles & Engineering Pillars

1. **No LLM Hallucinations:** We deliberately excluded LLMs. Eligibility rules are evaluated by a 100% deterministic, pure-Python engine.
2. **"No Quote, No Pass":** Every flag shows the exact characters read by OCR from the document image and the official rule ID. If an image is blurry or unreadable, the engine returns `COULD_NOT_VERIFY` with instructions to retake the photo. It never guesses.
3. **Zero Data Retention:** No databases are used. All documents and audio buffers exist purely in volatile memory (RAM) and are permanently purged on request or session timeout.
4. **Devanagari-to-Latin Transliteration:** Uses `indic-transliteration` with phonetic clustering to bridge English passbooks with Hindi Aadhaar cards.

---

## 6. Single Developer Contribution (Solo Build)

This entire application was designed, engineered, and delivered end-to-end by a single developer:
- **Architecture & System Design:** Designed the 3-step voice-to-report pipeline, ephemeral session manager, and API protocols.
- **Gnani AI Integration:** Built async REST clients with automatic retry backoff, credit-saving MD5 TTS caching, and CLI smoke testing.
- **OpenCV & OCR Pipeline:** Implemented grayscale, Gaussian denoising, Laplacian blur scoring, deskewing, and adaptive thresholding.
- **Deterministic Rules Engine:** Authored the scheme definition format, multi-condition rule evaluators, and Indian currency/date parsers.
- **Mobile-First PWA:** Built the responsive Next.js 16 (App Router) + Tailwind CSS interface with audio visualizer, camera capture, and bilingual toggle.
- **Documentation & Verification:** Authored unit test suites (29 passing tests), demo scripts, and social posts.
