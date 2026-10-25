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

const DOC_METADATA: Record<string, { title_hi: string; title_en: string; icon: string; desc_hi: string; desc_en: string }> = {
  aadhaar: {
    title_hi: "आधार कार्ड",
    title_en: "Aadhaar Card",
    icon: "🪪",
    desc_hi: "नाम और जन्म तिथि स्पष्ट दिखे",
    desc_en: "Clear view of Name and DOB"
  },
  income_certificate: {
    title_hi: "आय प्रमाण पत्र",
    title_en: "Income Certificate",
    icon: "📜",
    desc_hi: "सक्षम अधिकारी द्वारा जारी, वार्षिक आय व जारी दिनांक सहित",
    desc_en: "Issued by competent authority, showing income and issue date"
  },
  marksheet: {
    title_hi: "अंकसूची (Marksheet)",
    title_en: "Academic Marksheet",
    icon: "🎓",
    desc_hi: "10वीं/12वीं या अंतिम परीक्षा की अंकसूची",
    desc_en: "10th/12th or qualifying exam marksheet"
  },
  bank_passbook: {
    title_hi: "बैंक पासबुक",
    title_en: "Bank Passbook",
    icon: "🏦",
    desc_hi: "खाताधारक का नाम, A/C No व IFSC कोड वाला पहला पृष्ठ",
    desc_en: "First page showing Account Holder Name, A/C No & IFSC"
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
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{meta.icon}</span>
                  {uploaded && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                      ✓ {t.uploaded}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                  {lang === "hi" ? meta.title_hi : meta.title_en}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                <label className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 px-3 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-95 transition">
                  <span>📸 {t.takePhoto} / 📁 {t.uploadFile}</span>
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
          disabled={!allUploaded}
          className={`w-full rounded-2xl py-4 text-base font-bold text-white shadow-xl transition-all active:scale-95 ${
            allUploaded
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:shadow-emerald-500/25"
              : "bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
          }`}
        >
          {t.runCheck} ➔
        </button>
        {!allUploaded && (
          <p className="mt-2 text-center text-xs text-slate-400">
            {lang === "hi"
              ? "* जांच शुरू करने के लिए सभी आवश्यक दस्तावेज़ अपलोड करें (या ऊपर 'नमूना दस्तावेज़' दबाएं)"
              : "* Upload all required documents to run pre-check (or tap 'Load Demo Samples' above)"}
          </p>
        )}
      </div>
    </div>
  );
};
