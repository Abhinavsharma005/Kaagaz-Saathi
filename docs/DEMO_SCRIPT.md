# Kaagaz Saathi — Video Demo Script (45–60 Seconds)

**Target Duration:** 50–55 seconds  
**Format:** Mobile screen recording with split voiceover + on-screen captions  
**Target Audience:** Judges at The Great Indian AI Internship Challenge by Gnani AI & LinkedIn/X viewers  

---

## Storyboard & Timing Breakdown

### [0:00 – 0:03] THE HOOK (Grab attention in 3 seconds)
- **Visual:** Fast zoom into a red government rejection letter or rejection stamp on a portal screen.
- **Spoken Voiceover:**  
  *"Rejected twice for a one-letter name mismatch? Watch Kaagaz Saathi catch it in 30 seconds before you submit."*
- **On-Screen Caption:**  
  `🚨 REJECTED: Name Mismatch (Sharma vs Sarma) → Caught in 30s!`

---

### [0:04 – 0:18] STEP 1: VOICE Q&A (Powered by Gnani Timbre & Prisma)
- **Visual:** Show mobile screen. Kaagaz Saathi opens. User taps microphone button.
- **Audio:** Timbre TTS speaks in natural Hindi:  
  *"नमस्ते! कृपया अपना पूरा नाम बताएं जैसे आधार कार्ड पर लिखा है।"*
- **User speaks:**  
  *"मेरा नाम राजेश कुमार शर्मा है।"*
- **Visual:** Real-time waveform pulses. Gnani Prisma STT transcribes the Hindi speech instantly into text.
- **Audio (Timbre):**  
  *"आपने कहा: राजेश कुमार शर्मा। क्या यह सही है?"*
- **User taps / says:** *"हाँ"* (Yes). Green checkmark appears.
- **On-Screen Caption:**  
  `🎙️ Gnani Timbre (TTS) & Gnani Prisma (STT) — Voice-first regional language guidance`

---

### [0:19 – 0:34] STEP 2: DOCUMENT CAPTURE & OPENCV OCR
- **Visual:** User transitions to Step 2. Taps "📸 Take Photo".
- **Visual:** Fast sequence showing Aadhaar card, Income Certificate, Marksheet, and Bank Passbook uploaded.
- **Visual:** Subtle animated scan line passes over the document. OpenCV deskews and binarizes the image; OCR extracts the key fields.
- **Visual:** The passbook shows *"Rajesh Sarma"* (misspelled) and the income certificate shows *"10/02/2022"* (expired certificate).
- **On-Screen Caption:**  
  `📄 OpenCV auto-deskew + OCR extraction of names, amounts, and validity dates`

---

### [0:35 – 0:48] STEP 3: EXPLAINABLE REPORT ("NO QUOTE, NO PASS")
- **Visual:** The user taps **"Run Pre-Check"**. Instant transition to the Report screen.
- **Visual:** A high-contrast red/amber warning banner appears:  
  **"ACTION REQUIRED: 2 Corrections Needed Before Submission"**
- **Visual:** Zoom into Card 1:
  - **Rule:** `name_aadhaar_passbook`
  - **Quote:** `[aadhaar]: 'Rajesh Kumar Sharma' vs [bank_passbook]: 'Rajesh Sarma'`
  - **Fix:** *"बैंक शाखा में आधार अनुसार नाम सुधारें या सही पासबुक अपलोड करें।"*
- **Visual:** Zoom into Card 2:
  - **Rule:** `cert_freshness`
  - **Quote:** `जारी दिनांक: 10/02/2022 (1450 days old — Exceeds 3-year limit)`
- **Audio:** User taps **"बोलकर सारांश सुनें"**. Gnani Timbre reads the summary:  
  *"सावधान! आपके दस्तावेज़ों में 2 सुधार की आवश्यकता है। आवेदन रद्द होने से बचने के लिए पहले इन्हें ठीक करें।"*
- **On-Screen Caption:**  
  `🔍 "No Quote, No Pass" — Zero hallucinations, pure deterministic verification`

---

### [0:49 – 0:55] OUTRO & CALL TO ACTION
- **Visual:** User taps **"मेरा डेटा मिटाएं / Delete My Data"** — toast confirms instant RAM wipe (zero data retained).
- **Spoken Voiceover:**  
  *"Built with Gnani Prisma and Timbre for the Great Indian AI Internship Challenge. Pure deterministic AI protecting Indian citizens."*
- **End Card:**  
  ```
  Kaagaz Saathi (कागज़ साथी)
  Voice-First Document Pre-Check for Government Schemes
  Powered by Gnani AI
  #GreatIndianAIInternshipChallenge #GnaniAI
  ```

---

## Recording Tips for the Creator
1. Record in mobile portrait mode (1080x1920 or 9:16).
2. Ensure device audio is captured cleanly so Timbre's clear Hindi voice is audible.
3. Keep screen transitions snappy.
4. Add clear auto-captions with CapCut or Premiere Pro.
