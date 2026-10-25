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
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
            🎙️ Gnani Prisma STT + Timbre TTS
          </span>
          <button
            onClick={onProceedToUpload}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline flex items-center gap-1"
          >
            {t.skipToUpload} ➔
          </button>
        </div>

        <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
          {t.voiceStepTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t.voiceStepDesc}
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Confirmed answers summary list */}
        {Object.keys(spokenAnswers).length > 0 && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              ✓ दर्ज की गई जानकारी (Confirmed Answers):
            </h4>
            <div className="space-y-1.5 text-sm">
              {Object.entries(spokenAnswers).map(([k, v]) => (
                <div key={k} className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-slate-300 capitalize">{k.replace("_", " ")}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Active Question or Completion Banner */}
        {!isQuestionsFinished && currentQuestion ? (
          <div className="mt-6 flex flex-col items-center">
            {/* Question Text Box */}
            <div className="w-full rounded-2xl bg-amber-50/70 p-4 border border-amber-200/70 dark:bg-amber-950/30 dark:border-amber-900/40 text-center">
              <p className="text-base font-bold text-amber-950 dark:text-amber-100 sm:text-lg">
                {lang === "hi" ? currentQuestion.prompt_hi : currentQuestion.prompt_en}
              </p>
              <button
                onClick={playPromptAudio}
                disabled={isPlayingAudio}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-amber-200/80 px-3.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-300 dark:bg-amber-900/60 dark:text-amber-200 transition"
              >
                {isPlayingAudio ? "🔊 " + t.playingAudio : "🔈 " + t.listenPrompt}
              </button>
            </div>

            {/* Pending Confirmation View */}
            {pendingConfirmation ? (
              <div className="mt-6 w-full rounded-2xl bg-orange-50 p-5 border-2 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900 text-center animate-fade-in">
                <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase">
                  {t.youSaid}
                </span>

                {/* Editable Input for complete user control */}
                <div className="my-2">
                  <input
                    type="text"
                    value={editedValue}
                    onChange={(e) => setEditedValue(e.target.value)}
                    className="w-full text-center text-xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter or edit name..."
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    ✏️ {t.editRecognized} यदि नाम गलत सुनाई दिया हो, तो ऊपर ठीक कर सकते हैं
                  </p>
                </div>

                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-4">
                  {t.isCorrect}
                </p>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => handleConfirmDecision("yes")}
                    disabled={isProcessing}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition"
                  >
                    ✓ {t.yesCorrect}
                  </button>
                  <button
                    onClick={() => handleConfirmDecision("no")}
                    disabled={isProcessing}
                    className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-md hover:bg-red-700 active:scale-95 transition"
                  >
                    ✗ {t.noRetry}
                  </button>
                </div>
              </div>
            ) : (
              /* Big Microphone Button & Manual Input Alternative */
              <div className="mt-8 flex flex-col items-center w-full">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`relative flex h-28 w-28 items-center justify-center rounded-full text-4xl shadow-xl transition-all duration-300 active:scale-95 ${
                    isRecording
                      ? "bg-red-600 text-white ring-8 ring-red-200 dark:ring-red-950 animate-pulse"
                      : "bg-gradient-to-tr from-orange-500 to-amber-500 text-white hover:scale-105 ring-4 ring-orange-100 dark:ring-orange-950"
                  }`}
                >
                  {isRecording ? "⏹️" : "🎙️"}
                </button>

                <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {isProcessing
                    ? t.processingAudio
                    : isRecording
                    ? `${t.listening} (${recordSeconds}s)`
                    : t.pressToSpeak}
                </p>
                {isRecording && (
                  <span className="text-xs text-red-500 font-semibold mt-1">
                    {t.stopSpeaking}
                  </span>
                )}

                {/* Direct Typing Alternative */}
                <div className="mt-6 w-full pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-center text-xs font-semibold text-slate-400 mb-2">
                    — {t.orTypeAnswer} —
                  </p>
                  <form onSubmit={handleTypedSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={typedInput}
                      onChange={(e) => setTypedInput(e.target.value)}
                      placeholder={currentQuestion.expected_type === "name" ? "उदा: Abhinav Sharma" : "उदा: 250000"}
                      className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="submit"
                      disabled={!typedInput.trim() || isProcessing}
                      className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-40 transition"
                    >
                      दर्ज करें ➔
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Finished Questions state */
          <div className="mt-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              ✓
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
              {lang === "hi" ? "आवाज़ से विवरण दर्ज हो गया!" : "Voice details recorded!"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {lang === "hi"
                ? "अब अपने आवश्यक दस्तावेज़ों की फोटो अपलोड करें।"
                : "Now upload or photograph your required scheme documents."}
            </p>

            <button
              onClick={onProceedToUpload}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 py-3.5 text-base font-bold text-white shadow-lg hover:from-orange-700 hover:to-amber-600 active:scale-95 transition"
            >
              {t.nextStepUpload} ➔
            </button>
          </div>
        )}

        {/* Global Skip Button at Bottom */}
        {!isQuestionsFinished && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={onProceedToUpload}
              className="text-xs font-bold text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition"
            >
              ⏩ {t.skipToUpload} ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
