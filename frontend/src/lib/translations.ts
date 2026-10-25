export type Language = "hi" | "en";

export interface Translations {
  appName: string;
  appTagline: string;
  subTagline: string;
  step1: string;
  step2: string;
  step3: string;
  langToggle: string;
  privacyNotice: string;
  privacyModalTitle: string;
  privacyModalText: string;
  close: string;
  deleteMyData: string;
  deleteSuccess: string;
  activeScheme: string;
  officialSource: string;
  placeholderNotice: string;

  // Voice step
  voiceStepTitle: string;
  voiceStepDesc: string;
  listenPrompt: string;
  pressToSpeak: string;
  listening: string;
  stopSpeaking: string;
  processingAudio: string;
  youSaid: string;
  isCorrect: string;
  yesCorrect: string;
  noRetry: string;
  nextStepUpload: string;
  skipToUpload: string;
  orTypeAnswer: string;
  editRecognized: string;

  // Upload step
  uploadStepTitle: string;
  uploadStepDesc: string;
  takePhoto: string;
  uploadFile: string;
  uploaded: string;
  processingDoc: string;
  loadSampleDocs: string;
  loadCleanSample: string;
  loadDefectSample: string;
  runCheck: string;
  runPreCheck: string;

  // Report step
  reportTitle: string;
  readyToApply: string;
  fixesRequired: string;
  listenSummary: string;
  playingAudio: string;
  checksSummary: string;
  fixesCount: string;
  unverifiedCount: string;
  passCount: string;
  quotedTextLabel: string;
  ruleIdLabel: string;
  fixActionLabel: string;
  disclaimerTitle: string;
  disclaimerText: string;
  startNewSession: string;
  missingDocsTitle: string;
  availableDocsTitle: string;
  pendingChecksTitle: string;
  addMoreDocs: string;
  officialDisclaimer: string;
}

export const translations: Record<Language, Translations> = {
  hi: {
    appName: "कागज़ साथी",
    appTagline: "सरकारी योजनाओं के लिए आवाज़-आधारित दस्तावेज़ पूर्व-जांच",
    subTagline: "आवेदन करने से पहले 30 सेकंड में गलतियां पकड़ें — नाम, आय और प्रमाण पत्र की सही जांच",
    step1: "1. बोलकर बताएं",
    step2: "2. दस्तावेज़ अपलोड",
    step3: "3. जांच रिपोर्ट",
    langToggle: "English",
    privacyNotice: "गोपनीयता नीति: आपका कोई भी निजी डेटा सहेजा नहीं जाता।",
    privacyModalTitle: "डेटा गोपनीयता और सुरक्षा सिद्धांत",
    privacyModalText:
      "कागज़ साथी में आपका कोई भी दस्तावेज़ या व्यक्तिगत डेटा स्थायी रूप से किसी डेटाबेस में स्टोर नहीं किया जाता। सभी दस्तावेज़ केवल मेमोरी में प्रोसेस होते हैं। सत्र समाप्त होने या 'मेरा डेटा मिटाएं' दबाने पर सब कुछ तुरंत मिटा दिया जाता है।",
    close: "बंद करें",
    deleteMyData: "मेरा डेटा तुरंत मिटाएं",
    deleteSuccess: "आपका सभी डेटा मेमोरी से सफलतापूर्वक मिटा दिया गया है।",
    activeScheme: "योजना: मध्य प्रदेश पोस्ट-मैट्रिक छात्रवृत्ति योजना",
    officialSource: "आधिकारिक पोर्टल देखें",
    placeholderNotice: "[PLACEHOLDER] यह संदर्भ नियम है। अंतिम सीमाएं आधिकारिक पोर्टल अनुसार होंगी।",

    voiceStepTitle: "आवाज़ से जानकारी दें",
    voiceStepDesc: "नीचे दिए गए माइक बटन को दबाकर सवाल का जवाब अपनी भाषा में दें।",
    listenPrompt: "सवाल सुनें",
    pressToSpeak: "बोलने के लिए माइक दबाएं",
    listening: "सुन रहे हैं... कृपया बोलें",
    stopSpeaking: "बोलना पूरा हुआ",
    processingAudio: "Gnani Prisma STT द्वारा आवाज़ को समझा जा रहा है...",
    youSaid: "आपने कहा:",
    isCorrect: "क्या यह सही है? 'हाँ' या 'नहीं' बोलें।",
    yesCorrect: "हाँ, सही है",
    noRetry: "नहीं, दोबारा बोलें",
    nextStepUpload: "अगला: दस्तावेज़ अपलोड करें",
    skipToUpload: "आवाज़ छोड़ें, सीधे दस्तावेज़ अपलोड करें",
    orTypeAnswer: "या यहाँ अपना विवरण टाइप करें",
    editRecognized: "सुधारें (Edit):",

    uploadStepTitle: "आवश्यक दस्तावेज़ों की फोटो लें",
    uploadStepDesc: "प्रत्येक दस्तावेज़ की साफ, बिना चमक वाली फोटो खींचें या अपलोड करें।",
    takePhoto: "कैमरा से फोटो लें",
    uploadFile: "फाइल चुनें",
    uploaded: "अपलोड पूर्ण",
    processingDoc: "OpenCV व OCR द्वारा दस्तावेज़ पढ़ा जा रहा है...",
    loadSampleDocs: "नमूना दस्तावेज़ लोड करें (परीक्षण हेतु)",
    loadCleanSample: "सही दस्तावेज़ लोड करें (Pass Case)",
    loadDefectSample: "त्रुटिपूर्ण दस्तावेज़ लोड करें (Mismatch & Expired)",
    runCheck: "पूर्व-जाँच चलाएँ (Run Pre-Check)",
    runPreCheck: "पूर्व-जाँच चलाएँ (Run Pre-Check)",

    reportTitle: "दस्तावेज़ पूर्व-जांच रिपोर्ट",
    readyToApply: "बधाई! आपके दस्तावेज़ आवेदन हेतु तैयार हैं",
    fixesRequired: "सावधान! आवेदन से पहले आवश्यक सुधार करें",
    listenSummary: "Gnani Timbre द्वारा बोलकर सारांश सुनें",
    playingAudio: "ऑडियो बज रहा है...",
    checksSummary: "कुल नियम जांच:",
    fixesCount: "सुधार आवश्यक:",
    unverifiedCount: "सत्यापित नहीं हो सका / लंबित:",
    passCount: "सत्यापित (पास):",
    quotedTextLabel: "दस्तावेज़ से पढ़ा गया शब्द (Exact Quote):",
    ruleIdLabel: "नियम आईडी:",
    fixActionLabel: "सुधारने का उपाय:",
    disclaimerTitle: "महत्वपूर्ण सूचना (Disclaimers):",
    disclaimerText:
      "यह केवल एक पूर्व-जांच (Pre-check) है, आधिकारिक सरकारी फैसला नहीं। अस्वीकृति से बचने के लिए आधिकारिक पोर्टल पर दिए गए नियमों का पालन करें।",
    startNewSession: "नया आवेदन जांचें",
    missingDocsTitle: "योजना अनुसार शेष आवश्यक दस्तावेज़ (Documents Still Needed):",
    availableDocsTitle: "उपलब्ध दस्तावेज़ों की जाँच स्थिति (Checks on Uploaded Documents):",
    pendingChecksTitle: "लंबित मिलान जाँचें (Checks Pending Document Upload):",
    addMoreDocs: "➕ और दस्तावेज़ जोड़ें (Add More Docs)",
    officialDisclaimer:
      "⚠️ आधिकारिक अस्वीकरण: यह कागज़ साथी द्वारा प्रदान की गई एक प्रारंभिक पूर्व-जाँच है ताकि आप आवेदन करने से पहले गलतियों को सुधार सकें। यह किसी भी सरकारी योजना की आधिकारिक पात्रता, स्वीकृति या चयन की गारंटी नहीं है।"
  },
  en: {
    appName: "Kaagaz Saathi",
    appTagline: "Voice-First Document Pre-Check for Government Schemes",
    subTagline: "Catch disqualifying document errors in 30 seconds before submission",
    step1: "1. Voice Q&A",
    step2: "2. Upload Docs",
    step3: "3. Pre-Check Report",
    langToggle: "हिन्दी",
    privacyNotice: "Privacy: Zero personal data persisted. Ephemeral in-memory processing.",
    privacyModalTitle: "Data Privacy & Trust Principles",
    privacyModalText:
      "Kaagaz Saathi adheres to strict zero-retention principles. No identity documents or personal details are persisted to disk or databases. All OCR and matching runs in temporary volatile memory and is instantly purged upon session reset or clicking 'Delete My Data'.",
    close: "Close",
    deleteMyData: "Delete My Data Now",
    deleteSuccess: "All session data has been permanently purged from memory.",
    activeScheme: "Scheme: Madhya Pradesh Post-Matric Scholarship",
    officialSource: "View Official Portal",
    placeholderNotice: "[PLACEHOLDER] Reference rule definition. Verified against official scheme guidelines.",

    voiceStepTitle: "Guided Voice Q&A",
    voiceStepDesc: "Answer the questions by speaking clearly into your microphone.",
    listenPrompt: "Play Spoken Prompt",
    pressToSpeak: "Tap Mic to Answer",
    listening: "Listening... speak now",
    stopSpeaking: "Done Speaking",
    processingAudio: "Transcribing with Gnani Prisma STT...",
    youSaid: "You said:",
    isCorrect: "Is this correct? Say 'Yes' or 'No'.",
    yesCorrect: "Yes, Correct",
    noRetry: "No, Re-record",
    nextStepUpload: "Next: Upload Documents",
    skipToUpload: "Skip Voice & Go Directly to Document Upload",
    orTypeAnswer: "Or type your answer here",
    editRecognized: "Edit recognized text:",

    uploadStepTitle: "Capture Required Documents",
    uploadStepDesc: "Take clear, glare-free photos of each required document.",
    takePhoto: "Take Camera Photo",
    uploadFile: "Select File",
    uploaded: "Uploaded",
    processingDoc: "Processing with OpenCV & OCR...",
    loadSampleDocs: "Load Demo Samples (Offline Testing)",
    loadCleanSample: "Load Valid Documents (Pass Scenario)",
    loadDefectSample: "Load Defective Documents (Mismatch/Expired)",
    runCheck: "Run Pre-Check",
    runPreCheck: "Run Pre-Check",

    reportTitle: "Pre-Check Verification Report",
    readyToApply: "Ready to Apply! All checks passed",
    fixesRequired: "Action Required! Corrections needed before submission",
    listenSummary: "Listen to Spoken Summary (Gnani Timbre)",
    playingAudio: "Playing audio...",
    checksSummary: "Total Checks:",
    fixesCount: "Fixes Required:",
    unverifiedCount: "Could Not Verify / Pending:",
    passCount: "Passed Checks:",
    quotedTextLabel: "Exact Text Quoted from Document:",
    ruleIdLabel: "Rule ID:",
    fixActionLabel: "How to Fix:",
    disclaimerTitle: "Trust Principles & Disclaimers:",
    disclaimerText:
      "This is an automated pre-check based on deterministic rules, not an official government verdict. Every flag cites exact quoted text ('no quote, no pass'). Please verify against the official scheme portal before final filing.",
    startNewSession: "Start New Pre-Check",
    missingDocsTitle: "Documents Still Needed According to Scheme:",
    availableDocsTitle: "Checks on Available Uploaded Documents:",
    pendingChecksTitle: "Checks Pending Document Upload:",
    addMoreDocs: "➕ Add More Documents",
    officialDisclaimer:
      "⚠️ Official Pre-Check Notice: This is an unofficial preliminary pre-check tool designed to identify discrepancies before official submission. It does not constitute official verification or guaranteed scheme approval."
  }
};
