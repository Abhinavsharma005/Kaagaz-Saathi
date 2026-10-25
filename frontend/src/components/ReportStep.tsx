"use client";

import React, { useState, useRef } from "react";
import { Language, translations } from "../lib/translations";
import { PreCheckReportResponse, RuleResultItem, fetchSpokenAudio } from "../lib/api";

interface ReportStepProps {
  report: PreCheckReportResponse;
  lang: Language;
  onReset: () => void;
  onBackToUpload?: () => void;
  onOpenPrivacy: () => void;
  sourceUrl?: string;
}

const DOC_DISPLAY_NAMES: Record<string, { hi: string; en: string; icon: string; desc_hi: string; desc_en: string }> = {
  aadhaar: {
    hi: "आधार कार्ड",
    en: "Aadhaar Card",
    icon: "🪪",
    desc_hi: "पूर्ण सत्यापन हेतु (नाम व जन्मतिथि मिलान)",
    desc_en: "Required for full verification (Name and DOB match)"
  },
  income_certificate: {
    hi: "आय प्रमाण पत्र",
    en: "Income Certificate",
    icon: "📜",
    desc_hi: "वार्षिक आय सीमा व प्रमाण पत्र वैधता जांच हेतु",
    desc_en: "Required for family income ceiling and certificate validity"
  },
  marksheet: {
    hi: "अंकसूची (Marksheet)",
    en: "Academic Marksheet",
    icon: "🎓",
    desc_hi: "पिछली परीक्षा में न्यूनतम 50% प्राप्तांक सत्यापन हेतु",
    desc_en: "Required to verify minimum 50% qualifying score"
  },
  bank_passbook: {
    hi: "बैंक पासबुक",
    en: "Bank Passbook",
    icon: "🏦",
    desc_hi: "छात्रवृत्ति राशि अंतरण हेतु DBT बैंक खाता विवरण",
    desc_en: "Required for direct scholarship credit / DBT account verification"
  }
};

export const ReportStep: React.FC<ReportStepProps> = ({
  report,
  lang,
  onReset,
  onBackToUpload,
  onOpenPrivacy,
  sourceUrl = "https://scholarshipportal.mp.nic.in/"
}) => {
  const t = translations[lang];
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const playSpokenSummary = async () => {
    try {
      setIsPlayingAudio(true);
      const summaryText = lang === "hi" ? report.summary_hi : report.summary_en;
      const audioBlob = await fetchSpokenAudio(summaryText, lang === "hi" ? "hi-IN" : "en-IN");
      const url = URL.createObjectURL(audioBlob);

      if (audioElementRef.current) {
        audioElementRef.current.src = url;
        audioElementRef.current.play();
        audioElementRef.current.onended = () => setIsPlayingAudio(false);
      }
    } catch (err: any) {
      console.error("Audio summary playback error:", err);
      setIsPlayingAudio(false);
    }
  };

  const fixResults = report.results.filter((r) => r.status === "FIX");
  const unverifiedResults = report.results.filter((r) => r.status === "COULD_NOT_VERIFY");
  const passResults = report.results.filter((r) => r.status === "PASS");

  const isFullPass = report.can_submit;
  const isPreliminaryPass = report.is_preliminary && report.fix_count === 0;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 pb-20">
      <audio ref={audioElementRef} className="hidden" />

      {/* Prominent Official Disclaimer Banner */}
      <div className="mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-200">
        <p className="font-bold flex items-center gap-1.5">
          <span>ℹ️</span>
          <span>{lang === "hi" ? "अनाधिकारिक पूर्व-जाँच सूचना (Pre-Check Notice)" : "Pre-Check Notice & Disclaimer"}</span>
        </p>
        <p className="mt-1 leading-relaxed opacity-90">
          {t.officialDisclaimer}
        </p>
      </div>

      {/* Decision Status Banner */}
      <div
        className={`rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden ${
          isFullPass
            ? "bg-gradient-to-br from-emerald-600 via-teal-700 to-green-800"
            : isPreliminaryPass
            ? "bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-800"
            : "bg-gradient-to-br from-red-600 via-rose-700 to-amber-800"
        }`}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-md">
              {isFullPass
                ? "✓ FULL PRE-CHECK READY"
                : isPreliminaryPass
                ? "⚡ PRELIMINARY PRE-CHECK"
                : "⚠️ CORRECTIONS NEEDED"}
            </span>
            <span className="text-xs font-semibold opacity-80">
              Gnani Rules Engine
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-black sm:text-3xl tracking-tight">
            {isFullPass
              ? t.readyToApply
              : isPreliminaryPass
              ? (lang === "hi" ? "प्रारंभिक पूर्व-जाँच: उपलब्ध दस्तावेज़ सही हैं" : "Preliminary Pre-Check Passed")
              : t.fixesRequired}
          </h2>

          <p className="mt-2 text-sm text-white/90 font-medium leading-relaxed">
            {lang === "hi" ? report.summary_hi : report.summary_en}
          </p>

          {/* Audio Spoken Summary Trigger */}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={playSpokenSummary}
              disabled={isPlayingAudio}
              className="inline-flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-4 py-2.5 text-xs font-black shadow-lg hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            >
              {isPlayingAudio ? "🔊 " + t.playingAudio : "🔈 " + t.listenSummary}
            </button>

            {onBackToUpload && report.missing_documents && report.missing_documents.length > 0 && (
              <button
                onClick={onBackToUpload}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/20 text-white border border-white/30 px-4 py-2.5 text-xs font-black hover:bg-white/30 active:scale-95 transition cursor-pointer"
              >
                {t.addMoreDocs}
              </button>
            )}
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Metrics Counter Bar */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-red-50 p-3.5 text-center dark:bg-red-950/30 border border-red-200 dark:border-red-900">
          <span className="text-2xl font-black text-red-600">{report.fix_count}</span>
          <p className="mt-0.5 text-[11px] font-bold text-red-800 dark:text-red-300">
            {t.fixesCount}
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 p-3.5 text-center dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
          <span className="text-2xl font-black text-amber-600">{report.unverified_count}</span>
          <p className="mt-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
            {t.unverifiedCount}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-3.5 text-center dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
          <span className="text-2xl font-black text-emerald-600">{report.pass_count}</span>
          <p className="mt-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            {t.passCount}
          </p>
        </div>
      </div>

      {/* Missing Documents Section (Crucial for Partial Uploads) */}
      {report.missing_documents && report.missing_documents.length > 0 && (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-black text-amber-800 dark:text-amber-300">
              <span>📂</span>
              <span>{t.missingDocsTitle}</span>
            </h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full dark:bg-amber-900/50 dark:text-amber-300">
              {report.missing_documents.length} {lang === "hi" ? "बाकी" : "pending"}
            </span>
          </div>

          <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
            {lang === "hi"
              ? "आपके पास उपलब्ध दस्तावेज़ों की प्रारंभिक जांच हो चुकी है। योजना के आधिकारिक पोर्टल पर आवेदन जमा करने से पहले ये दस्तावेज़ भी तैयार रखें:"
              : "We checked what you currently have. To complete your full official submission, prepare these documents according to the scheme rules:"}
          </p>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {report.missing_documents.map((docKey) => {
              const meta = DOC_DISPLAY_NAMES[docKey] || {
                hi: docKey,
                en: docKey,
                icon: "📄",
                desc_hi: "योजना दिशानिर्देश अनुसार आवश्यक",
                desc_en: "Required as per scheme guidelines"
              };
              return (
                <div
                  key={docKey}
                  className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-xs dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40"
                >
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === "hi" ? meta.hi : meta.en}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang === "hi" ? meta.desc_hi : meta.desc_en}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {onBackToUpload && (
            <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex justify-end">
              <button
                onClick={onBackToUpload}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
              >
                <span>➕ {lang === "hi" ? "दस्तावेज़ अपलोड पर वापस जाएं" : "Go to Upload More Docs"}</span>
                <span>➔</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Section 1: Fixes Required */}
      {fixResults.length > 0 && (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-base font-black text-red-600 dark:text-red-400">
            <span>🚨</span>
            <span>{lang === "hi" ? "अस्वीकृति का कारण बनने वाले बिंदु (Critical Fixes)" : "Rejection Hazards (Fixes Required)"}</span>
          </h3>

          <div className="mt-3 space-y-3">
            {fixResults.map((rule) => (
              <RuleResultCard key={rule.rule_id} rule={rule} lang={lang} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Passed Checks (Verified Rules) */}
      {passResults.length > 0 && (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-base font-black text-emerald-700 dark:text-emerald-400">
            <span>✓</span>
            <span>{t.availableDocsTitle}</span>
          </h3>

          <div className="mt-3 space-y-3">
            {passResults.map((rule) => (
              <RuleResultCard key={rule.rule_id} rule={rule} lang={lang} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Pending Checks (Awaiting Other Documents) */}
      {unverifiedResults.length > 0 && (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-base font-black text-amber-600 dark:text-amber-400">
            <span>⏳</span>
            <span>{t.pendingChecksTitle}</span>
          </h3>

          <div className="mt-3 space-y-3">
            {unverifiedResults.map((rule) => (
              <RuleResultCard key={rule.rule_id} rule={rule} lang={lang} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Official Link & Disclaimer */}
      <div className="mt-8 rounded-3xl bg-slate-100 p-5 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          ⚖️ {t.disclaimerTitle}
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.disclaimerText}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-orange-600 dark:text-orange-400 hover:underline"
          >
            {t.officialSource} ↗
          </a>
          <button
            onClick={onOpenPrivacy}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            🔒 Zero Data Retention Policy
          </button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {onBackToUpload && report.missing_documents && report.missing_documents.length > 0 && (
          <button
            onClick={onBackToUpload}
            className="flex-1 rounded-2xl bg-amber-600 hover:bg-amber-700 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 transition text-center cursor-pointer"
          >
            {t.addMoreDocs}
          </button>
        )}
        <button
          onClick={onReset}
          className="flex-1 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 py-3.5 text-sm font-bold shadow-xs active:scale-95 transition text-center cursor-pointer"
        >
          🔄 {t.startNewSession}
        </button>
      </div>
    </div>
  );
};

const RuleResultCard: React.FC<{
  rule: RuleResultItem;
  lang: Language;
  t: any;
}> = ({ rule, lang, t }) => {
  const isFix = rule.status === "FIX";
  const isUnverified = rule.status === "COULD_NOT_VERIFY";

  return (
    <div
      className={`rounded-2xl p-4 border transition-all ${
        isFix
          ? "border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20"
          : isUnverified
          ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20"
          : "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t.ruleIdLabel} {rule.rule_id}
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {lang === "hi" ? rule.message_hi : rule.message_en}
          </h4>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            isFix
              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              : isUnverified
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {rule.status}
        </span>
      </div>

      {/* Quoted Text Box ("no quote, no pass") */}
      {rule.quoted_text && (
        <div className="mt-2.5 rounded-xl bg-white p-2.5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t.quotedTextLabel}
          </p>
          <p className="mt-1 font-bold text-slate-900 dark:text-slate-100 break-words">
            &ldquo;{rule.quoted_text}&rdquo;
          </p>
        </div>
      )}

      {/* Actionable fix guidance */}
      {(rule.fix_hi || rule.fix_en) && (
        <div className="mt-2.5 flex items-start gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span className="text-orange-600">➔</span>
          <p>
            <span className="font-bold">{t.fixActionLabel} </span>
            {lang === "hi" ? rule.fix_hi : rule.fix_en}
          </p>
        </div>
      )}
    </div>
  );
};
