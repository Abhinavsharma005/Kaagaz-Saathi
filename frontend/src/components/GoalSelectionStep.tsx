"use client";

import React, { useState, useRef, useEffect } from "react";
import { Language } from "../lib/translations";
import { SchemeInfo, fetchSpokenAudio } from "../lib/api";

interface GoalSelectionStepProps {
  schemes: SchemeInfo[];
  selectedSchemeId: string;
  onSelectScheme: (schemeId: string) => void;
  onProceed: () => void;
  onSkipToUpload: () => void;
  lang: Language;
}

const SCHEME_BADGES: Record<string, { hi: string; en: string; type: "primary" | "single" | "general" }> = {
  mp_post_matric_scholarship: {
    hi: "मुख्य योजना • 4 दस्तावेज़",
    en: "Full Scheme • 4 Docs",
    type: "primary"
  },
  aadhaar_check: {
    hi: "1 मुख्य दस्तावेज़ • 1 प्रश्न",
    en: "1 Key Doc • 1 Question",
    type: "single"
  },
  income_cert_check: {
    hi: "1 मुख्य दस्तावेज़ • 1 प्रश्न",
    en: "1 Key Doc • 1 Question",
    type: "single"
  },
  caste_cert_check: {
    hi: "1 मुख्य दस्तावेज़ • 1 प्रश्न",
    en: "1 Key Doc • 1 Question",
    type: "single"
  },
  other_doc_check: {
    hi: "सामान्य पूर्व-जाँच",
    en: "General Pre-Check",
    type: "general"
  }
};

export const GoalSelectionStep: React.FC<GoalSelectionStepProps> = ({
  schemes,
  selectedSchemeId,
  onSelectScheme,
  onProceed,
  onSkipToUpload,
  lang
}) => {
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    transcript: string;
    matchedId: string | null;
    matchedTitle: string | null;
  } | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const speechRecognitionRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  // Match spoken keywords to scheme
  const matchSpokenGoal = (text: string): string | null => {
    const lower = text.toLowerCase().trim();

    // Aadhaar Details
    if (
      lower.includes("आधार") ||
      lower.includes("आधर") ||
      lower.includes("aadhaar") ||
      lower.includes("adhar") ||
      lower.includes("uid") ||
      lower.includes("uidai")
    ) {
      return "aadhaar_check";
    }

    // Income Certificate / Income Tax / Salary
    if (
      lower.includes("आय") ||
      lower.includes("इनकम") ||
      lower.includes("इन्कम") ||
      lower.includes("income") ||
      lower.includes("tax") ||
      lower.includes("टैक्स") ||
      lower.includes("सैलरी") ||
      lower.includes("salary") ||
      lower.includes("aay") ||
      lower.includes("aaye")
    ) {
      return "income_cert_check";
    }

    // MP Post Matric Scholarship
    if (
      lower.includes("छात्रवृत्ति") ||
      lower.includes("स्कॉलरशिप") ||
      lower.includes("scholarship") ||
      lower.includes("पोस्ट") ||
      lower.includes("मैट्रिक") ||
      lower.includes("वजीफा") ||
      lower.includes("post matric") ||
      lower.includes("कॉलेज")
    ) {
      return "mp_post_matric_scholarship";
    }

    // Caste Certificate
    if (
      lower.includes("जाति") ||
      lower.includes("caste") ||
      lower.includes("jati") ||
      lower.includes("ओबीसी") ||
      lower.includes("एससी") ||
      lower.includes("एसटी") ||
      lower.includes("obc") ||
      lower.includes("sc") ||
      lower.includes("st")
    ) {
      return "caste_cert_check";
    }

    // Other / General Documents
    if (
      lower.includes("अन्य") ||
      lower.includes("other") ||
      lower.includes("कागज़") ||
      lower.includes("कागज") ||
      lower.includes("दस्तावेज़") ||
      lower.includes("दस्तावेज") ||
      lower.includes("general") ||
      lower.includes("डॉक्यूमेंट") ||
      lower.includes("सारे")
    ) {
      return "other_doc_check";
    }

    return null;
  };

  // Listen for spoken "हाँ" or "नहीं" for instant voice confirmation
  const startListeningForYesNo = () => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const text = (event.results[0]?.[0]?.transcript || "").toLowerCase();
        const affirmative = ["हाँ", "हां", "सही", "yes", "yeah", "ha", "haan", "sahi", "करनी है", "karni hai", "pre-check"];
        const negative = ["नहीं", "नही", "गलत", "no", "nope", "nahi", "wrong", "दोबारा", "फिर से"];

        if (affirmative.some((w) => text.includes(w))) {
          onProceed();
        } else if (negative.some((w) => text.includes(w))) {
          handleRetryVoice();
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.warn("Yes/No speech recognition error:", e);
    }
  };

  const handleStartVoiceSelection = () => {
    setVoiceNotice(null);
    setConfirmation(null);

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }

    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceNotice(
        lang === "hi"
          ? "आपके ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। कृपया नीचे कार्ड पर क्लिक करके चुनें।"
          : "Voice recognition not supported in this browser. Please click a card below."
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningVoice(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0]?.[0]?.transcript || "";
        setIsListeningVoice(false);

        const matchedId = matchSpokenGoal(text);
        if (matchedId) {
          onSelectScheme(matchedId);
          const found = schemes.find((s) => s.id === matchedId);
          const title = found ? (lang === "hi" ? found.title_hi : found.title_en) : matchedId;

          setConfirmation({
            transcript: text,
            matchedId,
            matchedTitle: title
          });

          // Spoken question: "क्या आप इसकी पूर्व-जाँच करना चाहते हैं?"
          try {
            const promptText =
              lang === "hi"
                ? `आपने कहा: ${title}। क्या आपको इसकी पूर्व-जाँच करनी है? 'हाँ' बोलें या 'नहीं' बोलकर दोबारा प्रयास करें।`
                : `You said: ${title}. Do you want to pre-check this? Say 'Yes' or 'No' to try again.`;

            fetchSpokenAudio(promptText, lang === "hi" ? "hi-IN" : "en-IN").then((blob) => {
              if (audioElementRef.current) {
                audioElementRef.current.src = URL.createObjectURL(blob);
                audioElementRef.current.play().catch(() => {});
                audioElementRef.current.onended = () => {
                  startListeningForYesNo();
                };
              }
            });
          } catch (e) {}
        } else {
          setConfirmation({
            transcript: text,
            matchedId: null,
            matchedTitle: null
          });

          try {
            const failText =
              lang === "hi"
                ? `आपने कहा: ${text}। इसके लिए कोई लक्ष्य नहीं मिला। कृपया दोबारा बोलें — जैसे 'आधार', 'आय', या 'छात्रवृत्ति'।`
                : `Could not match "${text}". Please speak again — like 'Aadhaar', 'Income', or 'Scholarship'.`;

            fetchSpokenAudio(failText, lang === "hi" ? "hi-IN" : "en-IN").then((blob) => {
              if (audioElementRef.current) {
                audioElementRef.current.src = URL.createObjectURL(blob);
                audioElementRef.current.play().catch(() => {});
              }
            });
          } catch (e) {}
        }
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
        setVoiceNotice(
          lang === "hi"
            ? "आवाज़ स्पष्ट नहीं सुनाई दी। कृपया दोबारा माइक दबाकर बोलें।"
            : "Could not hear audio clearly. Please tap mic again."
        );
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err: any) {
      console.error("Speech recognition error:", err);
      setIsListeningVoice(false);
      setVoiceNotice("Microphone error. Please click a card below.");
    }
  };

  const handleStopVoiceSelection = () => {
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }
    setIsListeningVoice(false);
  };

  const handleRetryVoice = () => {
    setConfirmation(null);
    setVoiceNotice(null);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setTimeout(() => {
      handleStartVoiceSelection();
    }, 150);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 animate-fadeIn">
      <audio ref={audioElementRef} className="hidden" />

      {/* Header - Matching Target Minimal Typography */}
      <div className="mb-6">
        <div className="text-xs sm:text-sm font-medium text-slate-500 mb-1">
          {lang === "hi" ? "सबसे पहले · बोलें या चुनें" : "First · Speak or Choose"}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {lang === "hi" ? "आप क्या जाँचना चाहते हैं?" : "What do you want to check?"}
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {lang === "hi"
            ? "जो चुनेंगे, उसी के सवाल और दस्तावेज़ दिखेंगे — बेकार के सवाल नहीं।"
            : "Only questions and documents relevant to what you select will appear."}
        </p>
      </div>

      {/* Center Large Circular Microphone Button */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1">
        <button
          type="button"
          onClick={isListeningVoice ? handleStopVoiceSelection : handleStartVoiceSelection}
          className={`relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full transition-all duration-300 cursor-pointer shadow-md active:scale-95 ${
            isListeningVoice
              ? "bg-red-600 ring-8 ring-red-200 animate-pulse"
              : "bg-[#1F514C] hover:bg-[#18413D] hover:shadow-xl hover:scale-105"
          }`}
          aria-label={lang === "hi" ? "माइक दबाएँ और बोलें" : "Tap mic and speak"}
        >
          {/* Angled metallic/purple microphone matching target visual */}
          <svg
            className="w-14 h-14 sm:w-16 sm:h-16 transform -rotate-45"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="micHeadGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8A6E94" />
                <stop offset="50%" stopColor="#5C4764" />
                <stop offset="100%" stopColor="#3C2E42" />
              </linearGradient>
              <linearGradient id="micBodyGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#DCE3E8" />
                <stop offset="45%" stopColor="#F5F8FA" />
                <stop offset="100%" stopColor="#9CA3AF" />
              </linearGradient>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4A5568" />
                <stop offset="100%" stopColor="#1A202C" />
              </linearGradient>
            </defs>
            {/* Mic Head capsule */}
            <rect x="18" y="4" width="12" height="18" rx="6" fill="url(#micHeadGrad)" />
            <path
              d="M19 10H29M19 14H29M20 7H28"
              stroke="#D8B4FE"
              strokeWidth="0.75"
              strokeOpacity="0.45"
              strokeLinecap="round"
            />
            {/* Collar ring */}
            <rect x="17" y="20.5" width="14" height="3" rx="1.5" fill="url(#ringGrad)" />
            {/* Handle shaft */}
            <path
              d="M19.5 23.5H28.5L27 42C27 43.1 26.1 44 25 44H23C21.9 44 21 43.1 21 42L19.5 23.5Z"
              fill="url(#micBodyGrad)"
            />
            <rect x="22" y="43" width="4" height="2" rx="1" fill="#4B5563" />
          </svg>
        </button>

        {/* Text Below Microphone */}
        <div className="mt-4 text-center">
          <div className="text-base sm:text-lg font-bold text-[#1F514C]">
            {isListeningVoice
              ? (lang === "hi" ? "सुन रहे हैं... बोलें" : "Listening... speak now")
              : (lang === "hi" ? "माइक दबाएँ और बोलें" : "Tap mic and speak")}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 italic">
            {lang === "hi"
              ? "जैसे — “मेरी छात्रवृत्ति के कागज़ जाँचने हैं”"
              : 'e.g. — "I want to verify scholarship documents"'}
          </p>
        </div>

        {/* Notice/Error if any */}
        {voiceNotice && (
          <div className="mt-3 text-center text-xs text-amber-800 font-medium max-w-md mx-auto">
            {voiceNotice}
          </div>
        )}

        {/* Confirmation State on the SAME page */}
        {confirmation && (
          <div className="mt-5 w-full max-w-md rounded-2xl border-2 border-[#1F514C]/25 bg-white p-4 sm:p-5 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>🎙️</span>
              <span>{lang === "hi" ? "आपने बोला:" : "You said:"}</span>
              <span className="font-bold text-slate-900 bg-[#FAF7F0] px-2.5 py-0.5 rounded border border-[#EAE5D8]">
                "{confirmation.transcript}"
              </span>
            </div>

            {confirmation.matchedId ? (
              <div className="mt-3">
                <div className="text-sm sm:text-base font-bold text-slate-900">
                  {lang === "hi" ? (
                    <>
                      पहचाना गया लक्ष्य:{" "}
                      <span className="text-[#1F514C]">{confirmation.matchedTitle}</span>
                    </>
                  ) : (
                    <>
                      Matched Goal:{" "}
                      <span className="text-[#1F514C]">{confirmation.matchedTitle}</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
                  {lang === "hi"
                    ? "क्या आपको इसकी पूर्व-जाँच करनी है? (Pre-check it?)"
                    : "Do you want to pre-check this?"}
                </p>

                {/* Yes, Pre-check it OR No, Speak again */}
                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onProceed}
                    className="flex-1 rounded-xl bg-[#1F514C] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#18413D] active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>✓</span>
                    <span>
                      {lang === "hi"
                        ? "हाँ, इसकी पूर्व-जाँच करें"
                        : "Yes, Pre-check it"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRetryVoice}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>
                      {lang === "hi"
                        ? "नहीं, दोबारा बोलें"
                        : "No, speak again"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-xs sm:text-sm text-amber-800 font-medium">
                  {lang === "hi"
                    ? `"${confirmation.transcript}" के लिए कोई लक्ष्य नहीं मिला। कृपया दोबारा बोलें या नीचे से कार्ड चुनें।`
                    : `Could not match "${confirmation.transcript}". Please speak again or select a card below.`}
                </p>
                <button
                  type="button"
                  onClick={handleRetryVoice}
                  className="mt-3 rounded-xl bg-[#1F514C] px-4 py-2 text-xs font-bold text-white hover:bg-[#18413D] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>{lang === "hi" ? "दोबारा बोलें (Speak again)" : "Speak again"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Target Separator: horizontal line — "या नीचे से चुनें" — horizontal line */}
      <div className="relative my-7 flex items-center justify-center">
        <div className="w-full border-t border-[#D5CEC0]" />
        <span className="absolute bg-[#F7F2E8] px-4 text-xs sm:text-sm font-medium text-slate-600">
          {lang === "hi" ? "या नीचे से चुनें" : "or choose from below"}
        </span>
      </div>

      {/* 5 Goal Selection Cards */}
      <div className="space-y-3.5">
        {schemes.map((sc) => {
          const isSelected = sc.id === selectedSchemeId;
          const badge = SCHEME_BADGES[sc.id] || {
            hi: "दस्तावेज़ पूर्व-जाँच",
            en: "Document Check",
            type: "general"
          };

          return (
            <div
              key={sc.id}
              onClick={() => onSelectScheme(sc.id)}
              className={`rounded-2xl border-2 p-4 sm:p-5 transition-all cursor-pointer shadow-xs ${
                isSelected
                  ? "border-[#1F514C] bg-white ring-2 ring-[#1F514C]/15"
                  : "border-[#EAE5D8] bg-white/90 hover:border-[#C8BEAB] hover:bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-2xs ${
                      isSelected
                        ? "bg-[#1F514C] text-white"
                        : "bg-[#F4EFE6] text-slate-800"
                    }`}
                  >
                    {sc.icon || "📄"}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {lang === "hi" ? sc.title_hi : sc.title_en}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-md">
                      {lang === "hi" ? sc.description_hi : sc.description_en}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          badge.type === "primary"
                            ? "bg-emerald-100 text-emerald-800"
                            : badge.type === "single"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {lang === "hi" ? badge.hi : badge.en}
                      </span>

                      {sc.source_url && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new URL(sc.source_url).hostname}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Radio selection circle */}
                <div className="shrink-0 pt-1">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                      isSelected
                        ? "border-[#1F514C] bg-[#1F514C] text-white"
                        : "border-[#DDD7C9] bg-white"
                    }`}
                  >
                    {isSelected && <span className="text-xs">✓</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Buttons */}
      <div className="mt-8 space-y-3">
        <button
          onClick={onProceed}
          className="w-full rounded-2xl bg-[#1F514C] py-4 text-base font-bold text-white shadow-md hover:bg-[#18413D] active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {lang === "hi"
              ? "आगे बढ़ें (Continue to Voice Check)"
              : "Continue to Voice Check"}
          </span>
          <span>➔</span>
        </button>

        <div className="text-center">
          <button
            onClick={onSkipToUpload}
            className="text-xs font-semibold text-[#1F514C] hover:underline cursor-pointer"
          >
            {lang === "hi"
              ? "आवाज़ छोड़ें, सीधे दस्तावेज़ अपलोड करें →"
              : "Skip voice and jump directly to upload documents →"}
          </button>
        </div>
      </div>
    </div>
  );
};
