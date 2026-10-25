"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { LandingHero } from "../components/LandingHero";
import { VoiceStep } from "../components/VoiceStep";
import { UploadStep } from "../components/UploadStep";
import { ReportStep } from "../components/ReportStep";
import { PrivacyModal } from "../components/PrivacyModal";
import { Language, translations } from "../lib/translations";
import {
  createSession,
  runPrecheck,
  purgeSession,
  VoiceQuestion,
  SchemeInfo,
  PreCheckReportResponse
} from "../lib/api";

export default function Home() {
  const [lang, setLang] = useState<Language>("hi");
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [sessionId, setSessionId] = useState<string>("");
  const [scheme, setScheme] = useState<SchemeInfo | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<VoiceQuestion | null>(null);
  const [spokenAnswers, setSpokenAnswers] = useState<Record<string, any>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, any>>({});
  const [report, setReport] = useState<PreCheckReportResponse | null>(null);

  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const t = translations[lang];

  // Initialize Session on mount
  const initNewSession = async (resetToLanding = false) => {
    setIsLoadingSession(true);
    setGlobalError(null);
    try {
      const data = await createSession("mp_post_matric_scholarship");
      setSessionId(data.session_id);
      setScheme(data.scheme);
      setCurrentQuestion(data.current_question);
      setSpokenAnswers({});
      setUploadedDocs({});
      setReport(null);
      if (resetToLanding) {
        setStep(0);
      }
    } catch (err: any) {
      console.error("Session initialization failed:", err);
      setGlobalError(
        lang === "hi"
          ? "बैकएंड सर्वर से संपर्क नहीं हो सका। कृपया सुनिश्चित करें कि FastAPI बैकएंड पोर्ट 8000 पर चल रहा है।"
          : "Could not connect to backend. Please ensure the FastAPI backend is running on port 8000."
      );
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    initNewSession(false);
  }, []);

  const handleToggleLang = () => {
    setLang((prev) => (prev === "hi" ? "en" : "hi"));
  };

  const handleQuestionCompleted = (nextQ: VoiceQuestion | null, allDone: boolean) => {
    if (nextQ) {
      setCurrentQuestion(nextQ);
    } else if (allDone) {
      setCurrentQuestion(null);
    }
  };

  const handleDocUploaded = (docType: string, data: any) => {
    setUploadedDocs((prev) => ({ ...prev, [docType]: data }));
  };

  const handleRunCheck = async () => {
    if (!sessionId) return;
    try {
      const rep = await runPrecheck(sessionId);
      setReport(rep);
      setStep(3);
    } catch (err: any) {
      console.error("Precheck error:", err);
      setGlobalError("Precheck failed: " + err.message);
    }
  };

  const handlePurgeData = async () => {
    if (!sessionId) return;
    setIsPurging(true);
    try {
      await purgeSession(sessionId);
      setIsPrivacyOpen(false);
      await initNewSession(true);
      alert(t.deleteSuccess);
    } catch (err: any) {
      console.error("Purge error:", err);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-slate-900 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        currentStep={step}
        onSelectStep={(s) => setStep(s)}
        schemeTitle={scheme ? (lang === "hi" ? scheme.title_hi : scheme.title_en) : undefined}
        sourceUrl={scheme?.source_url}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {globalError && (
          <div className="mx-auto max-w-4xl px-4 pt-6">
            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-300 text-amber-900 text-sm">
              <p className="font-bold">⚠️ सूचना / Connection Notice:</p>
              <p className="mt-1">{globalError}</p>
              <button
                onClick={() => initNewSession(false)}
                className="mt-2 text-xs font-bold underline hover:text-amber-700"
              >
                पुनः प्रयास करें / Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Step 0: Landing Hero */}
        {step === 0 && (
          <LandingHero
            onStart={() => setStep(1)}
            lang={lang}
          />
        )}

        {/* Wizard Steps (1, 2, 3) */}
        {step > 0 && (
          <div className="w-full max-w-4xl mx-auto py-6 px-4">
            {isLoadingSession ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-10 w-10 rounded-full border-4 border-[#1C4D43] border-t-transparent animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-600">
                  {lang === "hi" ? "सत्र प्रारंभ किया जा रहा है..." : "Initializing pre-check session..."}
                </p>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <VoiceStep
                    sessionId={sessionId}
                    currentQuestion={currentQuestion}
                    onQuestionCompleted={handleQuestionCompleted}
                    lang={lang}
                    onProceedToUpload={() => setStep(2)}
                    spokenAnswers={spokenAnswers}
                  />
                )}

                {step === 2 && (
                  <UploadStep
                    sessionId={sessionId}
                    requiredDocuments={
                      scheme?.required_documents || ["aadhaar", "income_certificate", "marksheet", "bank_passbook"]
                    }
                    lang={lang}
                    onProceedToReport={handleRunCheck}
                    uploadedDocs={uploadedDocs}
                    onDocUploaded={handleDocUploaded}
                  />
                )}

                {step === 3 && report && (
                  <ReportStep
                    report={report}
                    lang={lang}
                    onReset={() => initNewSession(true)}
                    onBackToUpload={() => setStep(2)}
                    onOpenPrivacy={() => setIsPrivacyOpen(true)}
                    sourceUrl={scheme?.source_url}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Privacy & Zero Retention Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        lang={lang}
        onPurge={handlePurgeData}
        isPurging={isPurging}
      />

      {/* Footer */}
      <footer className="w-full border-t border-[#EAE5D8] bg-[#FBF8F1] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            {t.appName} — Built for <strong>The Great Indian AI Internship Challenge by Gnani AI</strong>
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Powered by Gnani Prisma & Timbre
          </span>
        </div>
      </footer>
    </div>
  );
}
