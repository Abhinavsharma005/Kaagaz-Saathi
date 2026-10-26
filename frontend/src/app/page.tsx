"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { LandingHero } from "../components/LandingHero";
import { GoalSelectionStep } from "../components/GoalSelectionStep";
import { VoiceStep } from "../components/VoiceStep";
import { UploadStep } from "../components/UploadStep";
import { ReportStep } from "../components/ReportStep";
import { PrivacyModal } from "../components/PrivacyModal";
import { Language, translations } from "../lib/translations";
import {
  createSession,
  getSchemes,
  selectScheme,
  runPrecheck,
  purgeSession,
  VoiceQuestion,
  SchemeInfo,
  PreCheckReportResponse
} from "../lib/api";

export default function Home() {
  const [lang, setLang] = useState<Language>("hi");
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [sessionId, setSessionId] = useState<string>("");
  const [scheme, setScheme] = useState<SchemeInfo | null>(null);
  const [schemesList, setSchemesList] = useState<SchemeInfo[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("mp_post_matric_scholarship");
  const [currentQuestion, setCurrentQuestion] = useState<VoiceQuestion | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number>(2);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [spokenAnswers, setSpokenAnswers] = useState<Record<string, any>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, any>>({});
  const [report, setReport] = useState<PreCheckReportResponse | null>(null);

  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const t = translations[lang];

  // Initialize Session on mount
  const initNewSession = async (resetToLanding = false) => {
    setIsLoadingSession(true);
    setGlobalError(null);
    try {
      const [sessData, allSchemes] = await Promise.all([
        createSession("mp_post_matric_scholarship"),
        getSchemes()
      ]);
      setSessionId(sessData.session_id);
      setScheme(sessData.scheme);
      setSelectedSchemeId(sessData.scheme.id);
      setCurrentQuestion(sessData.current_question);
      setTotalQuestions(sessData.total_questions);
      setQuestionIndex(0);
      setSchemesList(allSchemes);
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

  const handleSelectScheme = async (newSchemeId: string) => {
    setSelectedSchemeId(newSchemeId);
    if (!sessionId) return;
    try {
      const updated = await selectScheme(sessionId, newSchemeId);
      setScheme(updated.scheme);
      setCurrentQuestion(updated.current_question);
      setTotalQuestions(updated.total_questions);
      setQuestionIndex(0);
      setSpokenAnswers({});
      setUploadedDocs({});
      setReport(null);
    } catch (e: any) {
      console.error("Failed to select scheme:", e);
    }
  };

  const handleQuestionCompleted = (nextQ: VoiceQuestion | null, allDone: boolean) => {
    if (nextQ) {
      setCurrentQuestion(nextQ);
      setQuestionIndex((prev) => prev + 1);
    } else if (allDone) {
      setCurrentQuestion(null);
      setStep(3); // Auto-advance to Document Upload step
    }
  };

  const handleDocUploaded = (docType: string, data: any) => {
    setUploadedDocs((prev) => ({ ...prev, [docType]: data }));
  };

  const handleRunCheck = async () => {
    if (!sessionId) return;
    setIsRunningCheck(true);
    try {
      const rep = await runPrecheck(sessionId);
      setReport(rep);
      setStep(4);
    } catch (err: any) {
      console.error("Precheck error:", err);
      setGlobalError("Precheck failed: " + err.message);
    } finally {
      setIsRunningCheck(false);
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
    <div className="min-h-screen bg-[#F7F2E8] text-slate-900 flex flex-col font-sans">
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

        {/* Wizard Steps (1 = Goal, 2 = Voice, 3 = Photo, 4 = Report) */}
        {step > 0 && (
          <div className="w-full max-w-4xl mx-auto py-6 px-4">
            {isLoadingSession ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-10 w-10 rounded-full border-4 border-[#1F514C] border-t-transparent animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-600">
                  {lang === "hi" ? "सत्र प्रारंभ किया जा रहा है..." : "Initializing pre-check session..."}
                </p>
              </div>
            ) : (
              <>
                {/* Step 1: Goal Selection ("What do you want to check?") */}
                {step === 1 && (
                  <GoalSelectionStep
                    schemes={schemesList}
                    selectedSchemeId={selectedSchemeId}
                    onSelectScheme={handleSelectScheme}
                    onProceed={() => setStep(2)}
                    onSkipToUpload={() => setStep(3)}
                    lang={lang}
                  />
                )}

                {/* Step 2: Voice Question (Only relevant questions for chosen goal) */}
                {step === 2 && (
                  <VoiceStep
                    sessionId={sessionId}
                    currentQuestion={currentQuestion}
                    onQuestionCompleted={handleQuestionCompleted}
                    lang={lang}
                    onProceedToUpload={() => setStep(3)}
                    spokenAnswers={spokenAnswers}
                    totalQuestions={totalQuestions}
                    questionIndex={questionIndex}
                  />
                )}

                {/* Step 3: Document Upload (Only relevant documents for chosen goal) */}
                {step === 3 && (
                  <UploadStep
                    sessionId={sessionId}
                    requiredDocuments={scheme?.required_documents || ["aadhaar"]}
                    optionalDocuments={scheme?.optional_documents || []}
                    schemeId={scheme?.id}
                    schemeTitle={scheme ? (lang === "hi" ? scheme.title_hi : scheme.title_en) : undefined}
                    lang={lang}
                    onProceedToReport={handleRunCheck}
                    uploadedDocs={uploadedDocs}
                    onDocUploaded={handleDocUploaded}
                    isRunningCheck={isRunningCheck}
                  />
                )}

                {/* Step 4: Sourced Pre-Check Report */}
                {step === 4 && report && (
                  <ReportStep
                    report={report}
                    lang={lang}
                    onReset={() => initNewSession(true)}
                    onBackToUpload={() => setStep(3)}
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
<footer className="w-full border-t border-white/10 bg-[#1F514C] px-6 py-10 text-white">
  <div className="mx-auto max-w-6xl">

    {/* Main Footer Columns */}
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

      {/* Brand */}
      <div className="space-y-3">
        <div className="inline-flex flex-col items-start">
          <h3 className="text-2xl font-black tracking-tight leading-tight text-white">
            कागज़ साथी
          </h3>
          <span className="mt-0.5 text-[11px] font-bold tracking-[0.12em] leading-none text-white/65">
            KAAGAZ SAATHI
          </span>
        </div>

        <p className="max-w-[230px] text-sm leading-relaxed text-white/75">
          Voice-first document pre-check for government schemes.
        </p>

        <p className="pt-1 text-xs text-white/60">
          © 2026 Kaagaz Saathi
        </p>
      </div>

      

{/* Developer */}
<div className="space-y-3">
  <h4 className="text-sm font-bold uppercase tracking-wider text-white/90">
    Developer
  </h4>

  {/* Name + Social Icons */}
  <div className="flex flex-wrap items-center gap-3">
    <p className="text-sm font-semibold text-white">
      Abhinav Sharma
    </p>

    {/* LinkedIn */}
    <a
      href="https://www.linkedin.com/in/abhinav-sharma-314319327"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Connect with Abhinav Sharma on LinkedIn"
      title="LinkedIn"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.26 2.37 4.26 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.44c.98 0 1.79-.77 1.79-1.73V1.73C24 .77 23.19 0 22.22 0Z" />
      </svg>
    </a>

    {/* GitHub Profile */}
    <a
      href="https://github.com/Abhinavsharma005"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Visit Abhinav Sharma's GitHub profile"
      title="GitHub"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.5-1.3-1.28-1.65-1.28-1.65-1.03-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1.01 1.73 2.66 1.23 3.31.94.1-.73.4-1.23.72-1.52-2.51-.29-5.15-1.26-5.15-5.58 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.69.12 2.98.72.79 1.15 1.79 1.15 3.02 0 4.33-2.64 5.29-5.16 5.57.41.36.77 1.04.77 2.1v3.1c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z" />
      </svg>
    </a>
  </div>

  {/* Project Repository Heading */}
  <div className="space-y-2 pt-2">
    <h4 className="text-sm font-bold uppercase tracking-wider text-white/90">
      Project Repository
    </h4>

    <a
      href="https://github.com/Abhinavsharma005/Kaagaz-Saathi"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open Kaagaz Saathi project repository"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-white/75 transition hover:text-white hover:underline"
    >
      <span>Kaagaz Saathi</span>

      {/* External link icon — outlined, not an emoji */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
      </svg>
    </a>
  </div>
</div>



      {/* APIs Used */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-white/90">
          APIs Used
        </h4>

        <div className="space-y-4 text-sm">
          <div className="border-l-2 border-white/35 pl-3">
            <p className="font-semibold text-white">
              Speech-to-Text
            </p>
            <p className="mt-0.5 text-xs text-white/70">
              Gnani Prisma
            </p>
          </div>

          <div className="border-l-2 border-white/35 pl-3">
            <p className="font-semibold text-white">
              Text-to-Speech
            </p>
            <p className="mt-0.5 text-xs text-white/70">
              Gnani Timbre
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-wider text-white/90">
          ज़रूरी सूचना
        </h4>

        <p className="text-sm leading-relaxed text-white/85">
          यह एक pre-check है, सरकारी निर्णय नहीं। अंतिम नियम हमेशा आधिकारिक स्रोत से देखें।
        </p>

        <div className="space-y-1.5 text-xs leading-relaxed text-white/65">
          <p>Demo build</p>
          <p>कोई personal data store नहीं होता</p>
          <p>Documents mock हैं</p>
        </div>
      </div>

    </div>

    {/* Bottom Bar */}
    <div className="mt-9 border-t border-white/20 pt-5 text-center text-xs text-white/65">
      Kaagaz Saathi <span className="px-1.5 text-white/35">·</span> Built with Gnani AI
    </div>

  </div>
</footer>
    </div>
  );
}
