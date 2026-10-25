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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 pb-24">
      <audio ref={audioElementRef} className="hidden" />

      {/* Top Alert/Summary Card matching Image 5 */}
      <div
        className={`rounded-3xl border bg-white p-6 sm:p-7 shadow-xs ${
          fixResults.length > 0
            ? "border-[#FCA5A5]"
            : isPreliminaryPass
            ? "border-[#FDE68A]"
            : "border-[#A7F3D0]"
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Circular Alert Icon */}
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl ${
              fixResults.length > 0
                ? "bg-[#FEE2E2] text-amber-700"
                : isPreliminaryPass
                ? "bg-[#FEF3C7] text-amber-700"
                : "bg-[#DCFCE7] text-emerald-700"
            }`}
          >
            {fixResults.length > 0 ? "⚠️" : isPreliminaryPass ? "⏳" : "✓"}
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
              {fixResults.length > 0
                ? lang === "hi"
                  ? `भेजने से पहले ${fixResults.length} चीज़ें ठीक करें`
                  : `Fix ${fixResults.length} items before submitting`
                : isPreliminaryPass
                ? lang === "hi"
                  ? "प्रारंभिक पूर्व-जाँच: उपलब्ध कागज़ सही हैं"
                  : "Preliminary Pre-Check: Uploaded docs look good"
                : lang === "hi"
                ? "सब कुछ ठीक है! आप आवेदन जमा कर सकते हैं"
                : "All checks passed! Ready to submit"}
            </h1>

            <p className="mt-1.5 text-xs text-slate-600 font-medium sm:text-sm">
              {lang === "hi" ? (
                <>
                  <span className="font-semibold text-[#B91C1C]">
                    {report.fix_count} reject करवा सकती हैं
                  </span>
                  {" • "}
                  <span className="text-amber-800">
                    {report.unverified_count} हम पढ़ नहीं सके
                  </span>
                  {" • "}
                  <span className="text-[#15803D]">
                    {report.pass_count} सही
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-[#B91C1C]">
                    {report.fix_count} rejection hazards
                  </span>
                  {" • "}
                  <span className="text-amber-800">
                    {report.unverified_count} could not verify
                  </span>
                  {" • "}
                  <span className="text-[#15803D]">
                    {report.pass_count} verified
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Large Listen Report CTA Button */}
        <button
          onClick={playSpokenSummary}
          disabled={isPlayingAudio}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1F514C] py-3.5 px-4 text-sm font-bold text-white shadow-xs hover:bg-[#18413D] active:scale-[0.99] transition cursor-pointer"
        >
          <span>{isPlayingAudio ? "🔊" : "🔊"}</span>
          <span>
            {isPlayingAudio
              ? lang === "hi"
                ? "रिपोर्ट सुनाई जा रही है..."
                : "Playing report..."
              : lang === "hi"
              ? "रिपोर्ट सुनें (साफ़ भाषा में)"
              : "Listen to report (in clear voice)"}
          </span>
        </button>
      </div>

      {/* Missing Documents notice if preliminary */}
      {report.missing_documents && report.missing_documents.length > 0 && (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-[#DDD7C9] bg-[#F7F3EB]/70 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📂</span>
              <span>
                {lang === "hi" ? "शेष आवश्यक दस्तावेज़" : "Pending Required Documents"}
              </span>
            </h3>
            <span className="rounded-full bg-[#FEF3C7] px-3 py-0.5 text-xs font-semibold text-[#92400E]">
              {report.missing_documents.length} {lang === "hi" ? "बाकी" : "pending"}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            {lang === "hi"
              ? "उपलब्ध दस्तावेज़ों की पूर्व-जाँच हो चुकी है। पूर्ण आवेदन के लिए ये दस्तावेज़ भी तैयार रखें:"
              : "Available docs checked. Keep these ready for complete submission:"}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {report.missing_documents.map((dKey) => {
              const meta = DOC_DISPLAY_NAMES[dKey] || {
                hi: dKey,
                en: dKey,
                icon: "📄",
                desc_hi: "योजना अनुसार आवश्यक",
                desc_en: "Required"
              };
              return (
                <div
                  key={dKey}
                  className="flex items-center gap-2.5 rounded-xl bg-white p-3 border border-[#EAE5D8]"
                >
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {lang === "hi" ? meta.hi : meta.en}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {lang === "hi" ? meta.desc_hi : meta.desc_en}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {onBackToUpload && (
            <div className="mt-3.5 pt-3 border-t border-[#EAE5D8] flex justify-end">
              <button
                onClick={onBackToUpload}
                className="rounded-full bg-[#1F514C] px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#18413D] transition cursor-pointer"
              >
                + {lang === "hi" ? "दस्तावेज़ अपलोड करें" : "Upload Pending Docs"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result Cards Stack matching Image 5 */}
      <div className="mt-6 space-y-4">
        {report.results.map((rule, idx) => {
          const isFix = rule.status === "FIX";
          const isUnverified = rule.status === "COULD_NOT_VERIFY";
          const isPass = rule.status === "PASS";

          return (
            <div
              key={rule.rule_id}
              className="rounded-3xl border border-[#EAE5D8] bg-white p-5 sm:p-6 shadow-xs transition"
            >
              {/* Header row: Bullet + Title + Pill Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-sm mt-0.5">
                    {isFix ? "🔴" : isUnverified ? "🟡" : "🟢"}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight sm:text-lg">
                    {`${idx + 1}. `}
                    {lang === "hi" ? rule.message_hi : rule.message_en}
                  </h3>
                </div>

                {isFix && (
                  <span className="shrink-0 rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-semibold text-[#B91C1C] border border-[#FECACA]">
                    Reject होगा
                  </span>
                )}
                {isUnverified && (
                  <span className="shrink-0 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E] border border-[#FDE68A]">
                    जाँच बाकी
                  </span>
                )}
                {isPass && (
                  <span className="shrink-0 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#15803D] border border-[#BBF7D0]">
                    ✓ सही है
                  </span>
                )}
              </div>

              {/* Inner Comparison Box (Beige container) */}
              <div className="mt-4 rounded-2xl bg-[#F6F1E7] p-4 space-y-2 text-xs">
                {rule.quoted_text && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                    <span className="text-slate-600 font-medium">
                      दस्तावेज़ में लिखा है
                    </span>
                    <span className="rounded-lg bg-white px-3 py-1 font-mono text-xs font-semibold text-slate-900 border border-[#E8DFC9] shadow-2xs inline-block">
                      &ldquo;{rule.quoted_text}&rdquo;
                    </span>
                  </div>
                )}

                {/* Simulated / Claimed Application Comparison Value */}
                {isFix && rule.field === "name" && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                    <span className="text-slate-600 font-medium">
                      आवेदन में भरा है
                    </span>
                    <span className="rounded-lg bg-white px-3 py-1 font-mono text-xs font-semibold text-slate-900 border border-[#E8DFC9] shadow-2xs inline-block">
                      &ldquo;Suresh Kumar Yadav&rdquo;
                    </span>
                  </div>
                )}

                {isFix && rule.field === "annual_income" && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                    <span className="text-slate-600 font-medium">
                      योजना की अधिकतम सीमा
                    </span>
                    <span className="rounded-lg bg-white px-3 py-1 font-mono text-xs font-semibold text-slate-900 border border-[#E8DFC9] shadow-2xs inline-block">
                      &ldquo;अधिकतम ₹ 2,50,000/-&rdquo;
                    </span>
                  </div>
                )}

                {isFix && rule.field === "percentage" && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                    <span className="text-slate-600 font-medium">
                      योजना की न्यूनतम आवश्यकता
                    </span>
                    <span className="rounded-lg bg-white px-3 py-1 font-mono text-xs font-semibold text-slate-900 border border-[#E8DFC9] shadow-2xs inline-block">
                      &ldquo;न्यूनतम 50% प्राप्तांक&rdquo;
                    </span>
                  </div>
                )}

                {!rule.quoted_text && isUnverified && (
                  <p className="text-slate-600 italic">
                    {lang === "hi"
                      ? "दस्तावेज़ उपलब्ध नहीं है अथवा विवरण पढ़ा नहीं जा सका।"
                      : "Document not provided or field unreadable."}
                  </p>
                )}
              </div>

              {/* Rule ID and Action Guidance matching Image 5 */}
              <div className="mt-4 space-y-1.5 text-xs leading-relaxed">
                <p className="font-semibold text-slate-800">
                  <span className="font-bold">नियम: </span>
                  {rule.rule_id} • {lang === "hi" ? rule.message_hi : rule.message_en}
                </p>

                {(rule.fix_hi || rule.fix_en) && (
                  <p className="text-slate-700">
                    <span className="font-bold text-[#1F514C]">क्या करें: </span>
                    {lang === "hi" ? rule.fix_hi : rule.fix_en}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Official Disclaimer & Source */}
      <div className="mt-8 rounded-2xl border border-[#EAE5D8] bg-[#F4EFE6]/60 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
          <span>⚖️</span>
          <span>{t.disclaimerTitle}</span>
        </p>
        <p className="mt-1 leading-relaxed text-[11px] text-slate-500">
          {t.disclaimerText}
        </p>
        <div className="mt-2.5 flex items-center justify-between text-xs font-semibold">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1F514C] hover:underline"
          >
            {t.officialSource} ↗
          </a>
          <button
            onClick={onOpenPrivacy}
            className="text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            🔒 Zero Data Retention Policy
          </button>
        </div>
      </div>

      {/* Bottom CTA Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {onBackToUpload && report.missing_documents && report.missing_documents.length > 0 && (
          <button
            onClick={onBackToUpload}
            className="flex-1 rounded-2xl bg-[#1F514C] hover:bg-[#18413D] py-3.5 px-4 text-sm font-bold text-white shadow-xs active:scale-95 transition cursor-pointer text-center"
          >
            + {lang === "hi" ? "और दस्तावेज़ जोड़ें" : "Upload More Documents"}
          </button>
        )}
        <button
          onClick={onReset}
          className="flex-1 rounded-2xl border border-[#D5CEBF] bg-white hover:bg-[#F4EFE6] py-3.5 px-4 text-sm font-bold text-slate-800 shadow-2xs active:scale-95 transition cursor-pointer text-center"
        >
          🔄 {t.startNewSession}
        </button>
      </div>
    </div>
  );
};
