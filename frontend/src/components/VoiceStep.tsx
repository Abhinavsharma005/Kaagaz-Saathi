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
}

export const VoiceStep: React.FC<VoiceStepProps> = ({
  sessionId,
  currentQuestion,
  onQuestionCompleted,
  lang,
  onProceedToUpload,
  spokenAnswers
}) => {
  const t = translations[lang];

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
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
        audioElementRef.current.play();
        audioElementRef.current.onended = () => setIsPlayingAudio(false);
      }
    } catch (err: any) {
      console.error("Failed to play prompt audio:", err);
      setIsPlayingAudio(false);
    }
  };

  // Start recording (with browser Web Speech recognition as high-accuracy client assistance)
  const startRecording = async () => {
    try {
      setErrorMsg(null);
      capturedBrowserTranscriptRef.current = "";

      // Try browser speech recognition in parallel to accurately capture "Abhinav Sharma"
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

        // Speak the confirmation question automatically
        const confirmSpeech = lang === "hi" ? res.confirmation_hi : res.confirmation_en;
        const confirmBlob = await fetchSpokenAudio(confirmSpeech, lang === "hi" ? "hi-IN" : "en-IN");
        if (audioElementRef.current) {
          audioElementRef.current.src = URL.createObjectURL(confirmBlob);
          audioElementRef.current.play();
        }
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
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <audio ref={audioElementRef} className="hidden" />

      {/* Card Container */}
      <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        {/* Header Indicator */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">
            सवाल {Object.keys(spokenAnswers).length + 1}/3 • बोलकर जवाब दें
          </span>
          <button
            onClick={onProceedToUpload}
            className="text-xs font-bold text-[#1C4D43] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {t.skipToUpload} ➔
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-2xl bg-red-50 p-3.5 text-xs font-medium text-red-800 border border-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Current Active Question Box (Matching Image 3) */}
        {!isQuestionsFinished && currentQuestion ? (
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4">
              <span className="text-2xl mt-0.5">🎙️</span>
              <div className="flex-1">
                <h2 className="text-xl font-black text-slate-900 sm:text-2xl leading-tight">
                  {lang === "hi" ? currentQuestion.prompt_hi : currentQuestion.prompt_en}
                </h2>
                <p className="mt-1 font-serif italic text-sm text-slate-500">
                  {lang === "hi" ? currentQuestion.prompt_en : currentQuestion.prompt_hi}
                </p>

                <button
                  onClick={playPromptAudio}
                  disabled={isPlayingAudio}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#1C4D43] hover:underline cursor-pointer"
                >
                  <span>🔊</span>
                  <span>{isPlayingAudio ? t.playingAudio : "दोबारा सुनें"}</span>
                </button>
              </div>
            </div>

            {/* Pending Confirmation View */}
            {pendingConfirmation ? (
              <div className="mt-6 rounded-2xl bg-[#FAF7F0] p-5 border border-[#EAE5D8] text-center animate-fade-in">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.youSaid}
                </span>

                {/* Editable Input for complete user control */}
                <div className="my-2">
                  <input
                    type="text"
                    value={editedValue}
                    onChange={(e) => setEditedValue(e.target.value)}
                    className="w-full text-center text-xl font-black text-slate-900 bg-white border-2 border-[#1C4D43]/40 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#1C4D43]"
                    placeholder="Enter or edit name..."
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    ✏️ {t.editRecognized} यदि नाम गलत सुनाई दिया हो, तो ऊपर ठीक कर सकते हैं
                  </p>
                </div>

                <p className="text-xs font-medium text-slate-600 mb-4">
                  {t.isCorrect}
                </p>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => handleConfirmDecision("yes")}
                    disabled={isProcessing}
                    className="flex-1 rounded-xl bg-[#1C4D43] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#153B33] active:scale-95 transition cursor-pointer"
                  >
                    ✓ {t.yesCorrect}
                  </button>
                  <button
                    onClick={() => handleConfirmDecision("no")}
                    disabled={isProcessing}
                    className="flex-1 rounded-xl bg-[#EAE5D8] py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-[#DCD5C4] active:scale-95 transition cursor-pointer"
                  >
                    ✗ {t.noRetry}
                  </button>
                </div>
              </div>
            ) : (
              /* Big Center Green Microphone (Matching Image 3) */
              <div className="mt-8 flex flex-col items-center">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl shadow-xl transition-all duration-300 active:scale-95 cursor-pointer ${
                    isRecording
                      ? "bg-red-600 text-white ring-8 ring-red-200 animate-pulse"
                      : "bg-[#1C4D43] text-white hover:scale-105 hover:bg-[#153B33] ring-6 ring-[#1C4D43]/15"
                  }`}
                >
                  {isRecording ? "⏹️" : "🎤"}
                </button>

                <p className="mt-3.5 text-sm font-bold text-[#1C4D43]">
                  {isProcessing
                    ? t.processingAudio
                    : isRecording
                    ? `${t.listening} (${recordSeconds}s)`
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
                      placeholder={currentQuestion.expected_type === "name" ? "उदा: Suresh Kumar Yadav" : "उदा: 180000"}
                      className="flex-1 rounded-xl border border-[#D5CEBF] bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1C4D43]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!typedInput.trim()}
                      className="rounded-xl bg-[#1C4D43] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#153B33] transition"
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
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1C4D43] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#153B33] active:scale-95 transition cursor-pointer"
            >
              <span>कागज़ की फोटो लें ➔</span>
            </button>
          </div>
        )}

        {/* Confirmed answers summary list: "आपने जो बताया" (Matching Image 3) */}
        {Object.keys(spokenAnswers).length > 0 && (
          <div className="mt-8">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              आपने जो बताया
            </h4>
            <div className="space-y-2">
              {Object.entries(spokenAnswers).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-2xl bg-white border border-[#EAE5D8] px-4 py-3 shadow-2xs text-xs"
                >
                  <span className="font-medium text-slate-500">
                    {k === "name" ? "नाम" : k === "annual_income" ? "वार्षिक आय" : k === "category" ? "श्रेणी" : k}:
                  </span>
                  <span className="font-bold text-slate-900">
                    {k === "annual_income" && typeof v === "number" ? `₹ ${v.toLocaleString("en-IN")}` : String(v)}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>💡</span>
              <span>डेमो: माइक दबाने पर mock जवाब भरता है। आपकी आवाज़ कहीं save नहीं होती।</span>
            </p>

            <button
              onClick={onProceedToUpload}
              className="mt-6 w-full rounded-2xl bg-[#1C4D43] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#153B33] active:scale-95 transition cursor-pointer text-center"
            >
              अगला: कागज़ की फोटो लें ➔
            </button>
          </div>
        )}

        {/* Global Skip Button at Bottom */}
        {!isQuestionsFinished && (
          <div className="mt-6 pt-4 border-t border-[#EAE5D8] text-center">
            <button
              onClick={onProceedToUpload}
              className="text-xs font-semibold text-slate-500 hover:text-[#1C4D43] transition cursor-pointer"
            >
              ⏩ {t.skipToUpload} ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

