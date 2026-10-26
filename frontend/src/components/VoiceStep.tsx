"use client";

import React, { useState, useRef, useEffect } from "react";
import { Language, translations } from "../lib/translations";
import {
  VoiceQuestion,
  submitVoiceAnswer,
  confirmVoiceAnswer,
  fetchSpokenAudio
} from "../lib/api";

interface VoiceStepProps {
  sessionId: string;
  currentQuestion: VoiceQuestion | null;
  onQuestionCompleted: (nextQ: VoiceQuestion | null, allDone: boolean) => void;
  lang: Language;
  onProceedToUpload: () => void;
  spokenAnswers: Record<string, any>;
  totalQuestions?: number;
  questionIndex?: number;
}

export const VoiceStep: React.FC<VoiceStepProps> = ({
  sessionId,
  currentQuestion,
  onQuestionCompleted,
  lang,
  onProceedToUpload,
  spokenAnswers,
  totalQuestions = 1,
  questionIndex = 0
}) => {
  const t = translations[lang];

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isListeningYesNo, setIsListeningYesNo] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    transcript: string;
    displayValue: string;
    confirmationText: string;
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [typedInput, setTypedInput] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const capturedBrowserTranscriptRef = useRef<string>("");

  // Play question prompt via Timbre TTS
  const playPromptAudio = async () => {
    if (!currentQuestion) return;
    try {
      setIsPlayingAudio(true);
      const textToSpeak = lang === "hi" ? currentQuestion.prompt_hi : currentQuestion.prompt_en;
      const audioBlob = await fetchSpokenAudio(textToSpeak, lang === "hi" ? "hi-IN" : "en-IN");
      const url = URL.createObjectURL(audioBlob);

      if (audioElementRef.current) {
        audioElementRef.current.src = url;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay was prevented by browser policy:", err);
          setIsPlayingAudio(false);
        });
        audioElementRef.current.onended = () => setIsPlayingAudio(false);
      }
    } catch (err: any) {
      console.error("Failed to play prompt audio:", err);
      setIsPlayingAudio(false);
    }
  };

  // Requirement: When we direct to "bole" page, start speaking automatically!
  useEffect(() => {
    if (currentQuestion && !pendingConfirmation) {
      playPromptAudio();
    }
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [currentQuestion?.id]);

  // Stop any active audio playback immediately
  const stopAudioPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
  };

  // Start recording
  const startRecording = async () => {
    // Requirement: On clicking to mic, the speaker stopped!
    stopAudioPlayback();

    try {
      setErrorMsg(null);
      capturedBrowserTranscriptRef.current = "";

      if (typeof window !== "undefined") {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const recognition = new SpeechRec();
            recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.onresult = (event: any) => {
              const text = event.results[0]?.[0]?.transcript;
              if (text) {
                capturedBrowserTranscriptRef.current = text;
              }
            };
            recognition.start();
            speechRecognitionRef.current = recognition;
          } catch (e) {
            console.warn("Speech recognition initialization skipped:", e);
          }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await handleSendAudio(audioBlob, capturedBrowserTranscriptRef.current);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setErrorMsg("Microphone permission was denied or not supported in this browser.");
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Requirement: Clicking mic stops speaker and toggles recording
  const handleToggleRecording = () => {
    stopAudioPlayback();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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

      recognition.onstart = () => setIsListeningYesNo(true);

      recognition.onresult = (event: any) => {
        const text = (event.results[0]?.[0]?.transcript || "").toLowerCase();
        setIsListeningYesNo(false);
        const affirmative = ["हाँ", "हां", "सही", "yes", "yeah", "ha", "haan", "sahi", "correct"];
        const negative = ["नहीं", "नही", "गलत", "no", "nope", "nahi", "wrong"];

        if (affirmative.some((w) => text.includes(w))) {
          handleConfirmDecision("yes");
        } else if (negative.some((w) => text.includes(w))) {
          handleConfirmDecision("no");
        }
      };

      recognition.onerror = () => setIsListeningYesNo(false);
      recognition.onend = () => setIsListeningYesNo(false);

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      setIsListeningYesNo(false);
    }
  };

  // Requirement: On tapping to mic again, instantly speak confirmation like "yes or no"
  const handleSendAudio = async (blob?: Blob, browserText?: string) => {
    if (!currentQuestion) return;
    setIsProcessing(true);
    try {
      const res = await submitVoiceAnswer(
        sessionId,
        currentQuestion.id,
        blob,
        lang === "hi" ? "hi-IN" : "en-IN",
        browserText || undefined
      );

      if (res.success) {
        setPendingConfirmation({
          transcript: res.transcript,
          displayValue: res.display_value,
          confirmationText: lang === "hi" ? res.confirmation_hi : res.confirmation_en
        });
        setEditedValue(res.display_value);

        // Instantly speak the confirmation question!
        const confirmSpeech = lang === "hi" ? res.confirmation_hi : res.confirmation_en;
        setIsPlayingAudio(true);
        fetchSpokenAudio(confirmSpeech, lang === "hi" ? "hi-IN" : "en-IN").then((confirmBlob) => {
          if (audioElementRef.current) {
            audioElementRef.current.src = URL.createObjectURL(confirmBlob);
            audioElementRef.current.play().catch(() => {});
            audioElementRef.current.onended = () => {
              setIsPlayingAudio(false);
              // After speaking question, automatically listen for user saying "हाँ" or "नहीं"!
              startListeningForYesNo();
            };
          }
        }).catch(() => {
          setIsPlayingAudio(false);
        });
      } else {
        setErrorMsg(lang === "hi" ? res.message_hi || "Error" : res.message_en || "Error");
      }
    } catch (err: any) {
      console.error("Voice processing error:", err);
      setErrorMsg(err.message || "Failed to contact voice server");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTypedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    await handleSendAudio(undefined, typedInput.trim());
    setTypedInput("");
  };

  const handleConfirmDecision = async (decision: "yes" | "no") => {
    stopAudioPlayback();
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }
    setIsListeningYesNo(false);
    setIsProcessing(true);
    try {
      const res = await confirmVoiceAnswer(
        sessionId,
        decision,
        undefined,
        lang === "hi" ? "hi-IN" : "en-IN",
        editedValue || undefined
      );

      if (res.status === "ACCEPTED") {
        setPendingConfirmation(null);
        setEditedValue("");
        const hasNext = res.has_next_question && Boolean(res.next_question);
        onQuestionCompleted(res.next_question || null, !hasNext);
      } else {
        setPendingConfirmation(null);
        setEditedValue("");
        // If rejected, auto-play question again
        setTimeout(() => playPromptAudio(), 300);
      }
    } catch (err: any) {
      console.error("Confirm error:", err);
      setErrorMsg("Confirmation failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isQuestionsFinished = !currentQuestion && Object.keys(spokenAnswers).length > 0;

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6 animate-fadeIn">
      <audio ref={audioElementRef} className="hidden" />

      {/* Card Container */}
      <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200">
        {/* Header Indicator */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">
            {lang === "hi"
              ? `सवाल ${(questionIndex ?? Object.keys(spokenAnswers).length) + 1}/${totalQuestions || 1} • बोलकर जवाब दें`
              : `Question ${(questionIndex ?? Object.keys(spokenAnswers).length) + 1}/${totalQuestions || 1} • Voice Response`}
          </span>
          <button
            onClick={onProceedToUpload}
            className="text-xs font-bold text-[#1F514C] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {t.skipToUpload} ➔
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-2xl bg-red-50 p-3.5 text-xs font-medium text-red-800 border border-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Current Active Question Box */}
        {!isQuestionsFinished && currentQuestion ? (
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-5 sm:p-7 shadow-xs">
            <div className="flex items-start gap-4">
              <span className="text-2xl mt-0.5">🎙️</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 sm:text-2xl leading-tight">
                    {lang === "hi" ? currentQuestion.prompt_hi : currentQuestion.prompt_en}
                  </h2>
                </div>
                <p className="mt-1 font-serif italic text-sm text-slate-500">
                  {lang === "hi" ? currentQuestion.prompt_en : currentQuestion.prompt_hi}
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={isPlayingAudio ? stopAudioPlayback : playPromptAudio}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F514C] hover:underline cursor-pointer"
                  >
                    <span>{isPlayingAudio ? "⏹️" : "🔊"}</span>
                    <span>
                      {isPlayingAudio
                        ? (lang === "hi" ? "आवाज़ बंद करें" : "Stop Voice")
                        : (lang === "hi" ? "दोबारा सुनें" : "Listen Again")}
                    </span>
                  </button>

                  {isPlayingAudio && (
                    <span className="text-[11px] font-semibold text-emerald-700 animate-pulse flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                      <span>{lang === "hi" ? "आवाज़ चल रही है..." : "Speaking..."}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pending Confirmation View (Spoken aloud instantly on mic stop) */}
            {pendingConfirmation ? (
              <div className="mt-6 rounded-2xl bg-[#FAF7F0] p-5 border border-[#EAE5D8] text-center animate-fadeIn">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.youSaid}
                </span>

                {/* Editable Input for complete user control */}
                <div className="my-2">
                  <input
                    type="text"
                    value={editedValue}
                    onChange={(e) => setEditedValue(e.target.value)}
                    className="w-full text-center text-xl font-black text-slate-900 bg-white border-2 border-[#1F514C]/40 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#1F514C]"
                    placeholder="Enter or edit answer..."
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    ✏️ {t.editRecognized} यदि गलत सुनाई दिया हो, तो ऊपर ठीक कर सकते हैं
                  </p>
                </div>

                <div className="my-3 flex flex-col items-center">
                  <button
                    onClick={isListeningYesNo ? () => setIsListeningYesNo(false) : startListeningForYesNo}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                      isListeningYesNo
                        ? "bg-red-600 text-white animate-pulse ring-4 ring-red-200"
                        : "bg-[#1F514C] text-white hover:bg-[#18413D]"
                    }`}
                  >
                    <span>🎤</span>
                    <span>
                      {isListeningYesNo
                        ? (lang === "hi" ? "'हाँ' या 'नहीं' बोलें... (सुन रहे हैं)" : "Say 'Yes' or 'No'... (Listening)")
                        : (lang === "hi" ? "माइक दबाकर 'हाँ' या 'नहीं' बोलें" : "Tap to say 'Yes' or 'No'")}
                    </span>
                  </button>
                </div>

                <div className="flex gap-3 justify-center mt-4">
                  <button
                    onClick={() => handleConfirmDecision("yes")}
                    disabled={isProcessing}
                    className="flex-1 rounded-xl bg-[#1F514C] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#18413D] active:scale-95 transition cursor-pointer"
                  >
                    ✓ {t.yesCorrect}
                  </button>
                  <button
                    onClick={() => handleConfirmDecision("no")}
                    disabled={isProcessing}
                    className="flex-1 rounded-xl bg-[#EAE5D8] py-3 text-xs font-bold text-slate-700 shadow-xs hover:bg-[#DCD5C4] active:scale-95 transition cursor-pointer"
                  >
                    ✗ {t.noRetry}
                  </button>
                </div>
              </div>
            ) : (
              /* Big Center Green Microphone (Requirement: Stops speaker immediately and records) */
              <div className="mt-8 flex flex-col items-center">
                <button
                  onClick={handleToggleRecording}
                  disabled={isProcessing}
                  className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl shadow-xl transition-all duration-300 active:scale-95 cursor-pointer ${
                    isRecording
                      ? "bg-red-600 text-white ring-8 ring-red-200 animate-pulse"
                      : "bg-[#1F514C] text-white hover:scale-105 hover:bg-[#18413D] ring-6 ring-[#1F514C]/15"
                  }`}
                  title={isRecording ? "टैप करके रिकॉर्डिंग समाप्त करें" : "माइक दबाएँ और बोलें"}
                >
                  {isRecording ? "⏹️" : "🎤"}
                </button>

                <p className="mt-3.5 text-sm font-bold text-[#1F514C]">
                  {isProcessing
                    ? t.processingAudio
                    : isRecording
                    ? `${t.listening} (${recordSeconds}s) — रोकने हेतु पुनः दबाएँ`
                    : "माइक दबाएँ और बोलें"}
                </p>

                <button
                  onClick={() => setTypedInput(typedInput ? "" : " ")}
                  className="mt-1 text-xs text-slate-500 underline hover:text-slate-800 cursor-pointer"
                >
                  बोलने में दिक्कत? टाइप करें
                </button>

                {/* Direct Typing Alternative */}
                {typedInput !== "" && (
                  <form onSubmit={handleTypedSubmit} className="mt-4 flex gap-2 w-full max-w-sm">
                    <input
                      type="text"
                      value={typedInput.trim()}
                      onChange={(e) => setTypedInput(e.target.value)}
                      placeholder={currentQuestion.expected_type === "name" ? "उदा: Rajesh Kumar Sharma" : "उदा: 180000"}
                      className="flex-1 rounded-xl border border-[#D5CEBF] bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1F514C]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!typedInput.trim()}
                      className="rounded-xl bg-[#1F514C] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#18413D] transition"
                    >
                      जमा करें
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Finished Questions View */
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-8 text-center shadow-xs">
            <span className="text-4xl">🎉</span>
            <h3 className="mt-3 text-lg font-black text-slate-900">
              बोलकर जानकारी पूरी हो गई!
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              अब अपने दस्तावेज़ों की फोटो खींचें ताकि नियमों की जांच हो सके।
            </p>
            <button
              onClick={onProceedToUpload}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1F514C] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#18413D] active:scale-95 transition cursor-pointer"
            >
              <span>कागज़ की फोटो लें ➔</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
