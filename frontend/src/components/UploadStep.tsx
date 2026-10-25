"use client";

import React, { useState } from "react";
import { Language, translations } from "../lib/translations";
import { uploadDocument } from "../lib/api";

interface UploadStepProps {
  sessionId: string;
  requiredDocuments: string[];
  lang: Language;
  onProceedToReport: () => void;
  uploadedDocs: Record<string, any>;
  onDocUploaded: (docType: string, data: any) => void;
}

const DOC_METADATA: Record<string, {
  title_hi: string;
  title_en: string;
  icon: string;
  tag_hi: string;
  tag_en: string;
  tag_type: "required" | "key" | "optional";
  desc_hi: string;
  desc_en: string;
}> = {
  aadhaar: {
    title_hi: "आधार कार्ड (Aadhaar Card)",
    title_en: "Aadhaar Card",
    icon: "🪪",
    tag_hi: "पूर्ण जांच हेतु आवश्यक",
    tag_en: "Required for full check, if scheme requires it",
    tag_type: "required",
    desc_hi: "नाम और जन्म तिथि केवल आवश्यकता होने पर जांची जाएगी। अन्य दस्तावेज़ों की समीक्षा के लिए इसे अनिवार्य नहीं किया गया है।",
    desc_en: "Check name and date of birth only if needed. Don't require it just to explain the scheme or review other documents."
  },
  income_certificate: {
    title_hi: "आय प्रमाण पत्र (Income Certificate)",
    title_en: "Income Certificate",
    icon: "📜",
    tag_hi: "मुख्य पात्रता दस्तावेज़",
    tag_en: "Key Eligibility Document",
    tag_type: "key",
    desc_hi: "आवेदक का नाम, वार्षिक आय, सक्षम अधिकारी और जारी दिनांक पढ़ें (जहां सुपाठ्य हो)।",
    desc_en: "Read the applicant's name, income amount, issuing authority and date, where legible."
  },
  marksheet: {
    title_hi: "अंकसूची (Academic Marksheet)",
    title_en: "Academic Marksheet",
    icon: "🎓",
    tag_hi: "प्रारंभिक जांच हेतु वैकल्पिक",
    tag_en: "Optional for initial check",
    tag_type: "optional",
    desc_hi: "शैक्षणिक योग्यता विवरण जांचें और उपलब्ध होने पर अन्य दस्तावेज़ों से नाम का मिलान करें।",
    desc_en: "Check qualification details and compare the name with other documents if available."
  },
  bank_passbook: {
    title_hi: "बैंक पासबुक (Bank Passbook)",
    title_en: "Bank Passbook",
    icon: "🏦",
    tag_hi: "प्रारंभिक जांच हेतु वैकल्पिक",
    tag_en: "Optional for initial check",
    tag_type: "optional",
    desc_hi: "खाताधारक का नाम और दृश्य बैंक विवरण जांचें। अनावश्यक रूप से पूरे खाता नंबर एकत्र या प्रदर्शित करने से बचें।",
    desc_en: "Check account-holder name and visible bank details when relevant. Avoid collecting or displaying full account numbers unnecessarily."
  }
};

export const UploadStep: React.FC<UploadStepProps> = ({
  sessionId,
  requiredDocuments,
  lang,
  onProceedToReport,
  uploadedDocs,
  onDocUploaded
}) => {
  const t = translations[lang];
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = async (docType: string, file: File) => {
    setUploadingDoc(docType);
    setErrorMsg(null);
    try {
      const res = await uploadDocument(sessionId, docType, file, file.name);
      onDocUploaded(docType, res);
    } catch (err: any) {
      console.error(`Upload error for ${docType}:`, err);
      setErrorMsg(`Failed to process ${docType}: ${err.message}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  // Helper to load synthetic mock sample documents for 1-click evaluator testing
  const loadMockScenario = async (scenario: "clean" | "defect") => {
    setErrorMsg(null);
    setUploadingDoc("batch");

    // Synthetic text payloads representing clean vs defective documents
    const mockDataClean: Record<string, string> = {
      aadhaar: "GOVERNMENT OF INDIA\nRajesh Kumar Sharma\nDOB: 12/05/2002\n1234 5678 9012\nGram Rampur, Bhopal",
      income_certificate: "REVENUE DEPARTMENT, MP\nआय प्रमाण पत्र\nApplicant Name: Rajesh Kumar Sharma\nAnnual Income: ₹ 1,80,000/-\nDate of Issue: 15/09/2026\nCertificate No: MP-REV-INC-2026-89412",
      marksheet: "BOARD OF SECONDARY EDUCATION, MP\nCandidate Name: Rajesh Kumar Sharma\nRoll No: 458921\nPassing Year: 2024\nPercentage: 74.5%",
      bank_passbook: "STATE BANK OF INDIA\nAccount Holder Name: Rajesh Kumar Sharma\nA/c No: 98765432101\nIFSC Code: SBIN0001234\nBranch: TT Nagar, Bhopal"
    };

    const mockDataDefect: Record<string, string> = {
      aadhaar: "GOVERNMENT OF INDIA\nRajesh Sarma\nDOB: 12/05/2002\n9876 5432 1098\nGram Rampur, Bhopal",
      income_certificate: "REVENUE DEPARTMENT, MP\nआय प्रमाण पत्र\nApplicant Name: Rajesh Kumar Sharma\nAnnual Income: ₹ 3,20,000/-\nDate of Issue: 10/02/2022\nCertificate No: MP-REV-INC-2022-11029",
      marksheet: "BOARD OF SECONDARY EDUCATION, MP\nCandidate Name: Rajesh Kumar Sharma\nRoll No: 458921\nPassing Year: 2024\nPercentage: 42.0%",
      bank_passbook: "STATE BANK OF INDIA\nAccount Holder Name: Vikas Patel\nA/c No: 98765432101\nIFSC Code: SBIN0001234\nBranch: TT Nagar, Bhopal"
    };

    const targetSet = scenario === "clean" ? mockDataClean : mockDataDefect;

    try {
      for (const [dType, rawText] of Object.entries(targetSet)) {
        // Create a small 1x1 dummy blob for the image payload
        const blob = new Blob([rawText], { type: "text/plain" });
        const res = await uploadDocument(sessionId, dType, blob, `${dType}_${scenario}.txt`);
        onDocUploaded(dType, res);
      }
    } catch (err: any) {
      console.error("Batch load error:", err);
      setErrorMsg("Failed to load sample set: " + err.message);
    } finally {
      setUploadingDoc(null);
    }
  };

  const uploadedCount = Object.keys(uploadedDocs).length;
  const totalRequired = requiredDocuments.length;
  const allUploaded = requiredDocuments.every((d) => Boolean(uploadedDocs[d]));

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            {t.uploadStepTitle}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.uploadStepDesc}
          </p>
        </div>

        {/* Quick Mock Testers for Evaluators */}
        <div className="flex gap-2">
          <button
            onClick={() => loadMockScenario("clean")}
            disabled={Boolean(uploadingDoc)}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200 transition"
          >
            ✓ {t.loadCleanSample}
          </button>
          <button
            onClick={() => loadMockScenario("defect")}
            disabled={Boolean(uploadingDoc)}
            className="rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800 shadow-sm hover:bg-red-100 dark:bg-red-950/60 dark:border-red-800 dark:text-red-200 transition"
          >
            ⚠️ {t.loadDefectSample}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-2xl bg-red-50 p-3.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Document Upload Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {requiredDocuments.map((docType) => {
          const meta = DOC_METADATA[docType] || {
            title_hi: docType,
            title_en: docType,
            icon: "📄",
            desc_hi: "दस्तावेज़",
            desc_en: "Document"
          };
          const uploaded = uploadedDocs[docType];
          const isCurrentUploading = uploadingDoc === docType || uploadingDoc === "batch";

          return (
            <div
              key={docType}
              className={`relative flex flex-col justify-between rounded-3xl p-5 border-2 transition-all ${
                uploaded
                  ? "border-emerald-400/80 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800"
                  : "border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl">{meta.icon}</span>
                  {uploaded ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 shadow-2xs">
                      ✓ {t.uploaded}
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-tight text-right ${
                        meta.tag_type === "required"
                          ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60"
                          : meta.tag_type === "key"
                          ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
                          : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {lang === "hi" ? meta.tag_hi : meta.tag_en}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                  {lang === "hi" ? meta.title_hi : meta.title_en}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {lang === "hi" ? meta.desc_hi : meta.desc_en}
                </p>

                {/* Extracted fields snippet preview */}
                {uploaded && uploaded.fields_extracted && (
                  <div className="mt-3 rounded-xl bg-white/90 p-2.5 dark:bg-slate-800/80 border border-emerald-200/60 dark:border-emerald-900/60 text-xs">
                    <p className="font-bold text-emerald-800 dark:text-emerald-300 text-[10px] uppercase">
                      पढ़े गए विवरण (OCR Read):
                    </p>
                    <div className="mt-1 space-y-1">
                      {Object.entries(uploaded.fields_extracted).map(([field, details]: [string, any]) => (
                        <div key={field} className="flex justify-between font-mono text-[11px]">
                          <span className="text-slate-500">{field}:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                            {details.quoted_text || String(details.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload & Camera Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 px-2 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-95 transition text-center">
                    <span>📸 {t.takePhoto}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={isCurrentUploading}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(docType, e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200/80 py-2.5 px-2 text-xs font-bold dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 cursor-pointer active:scale-95 transition text-center">
                    <span>📄 PDF / {t.uploadFile}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      className="hidden"
                      disabled={isCurrentUploading}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(docType, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
                {isCurrentUploading && (
                  <p className="mt-1.5 text-center text-[10px] text-orange-600 font-semibold animate-pulse">
                    {t.processingDoc}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Proceed to Pre-Check CTA */}
      <div className="mt-8">
        <button
          onClick={onProceedToReport}
          disabled={uploadedCount === 0}
          className={`w-full rounded-2xl py-4 text-base font-bold text-white shadow-xl transition-all active:scale-95 ${
            uploadedCount > 0
              ? "bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:shadow-orange-500/25 cursor-pointer"
              : "bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
          }`}
        >
          {t.runPreCheck} ➔
        </button>

        <div className="mt-2.5 text-center">
          {uploadedCount === 0 ? (
            <p className="text-xs text-slate-400">
              {lang === "hi"
                ? "💡 कम से कम 1 दस्तावेज़ (जैसे आय प्रमाण पत्र) अपलोड करें या ऊपर 'सही दस्तावेज़' दबाएं"
                : "💡 Upload at least 1 document (e.g. Income Certificate) or load sample documents above"}
            </p>
          ) : uploadedCount < totalRequired ? (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {lang === "hi"
                ? `⚡ प्रारंभिक पूर्व-जाँच (${uploadedCount}/${totalRequired} दस्तावेज़): जो दस्तावेज़ उपलब्ध हैं, उनकी जांच तुरंत होगी। शेष बाद में जोड़ सकते हैं।`
                : `⚡ Preliminary Pre-Check (${uploadedCount}/${totalRequired} docs): Analyzes available documents now. Missing ones can be added later.`}
            </p>
          ) : (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {lang === "hi"
                ? "✓ पूर्ण पूर्व-जाँच: सभी आवश्यक दस्तावेज़ उपलब्ध हैं।"
                : "✓ Full Pre-Check: All required documents uploaded."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
