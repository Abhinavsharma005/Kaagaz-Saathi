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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Title & Description matching Image 4 */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl">
            {lang === "hi" ? "कागज़ की फोटो लें" : "Take photos of your documents"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xl">
            {lang === "hi"
              ? "जो document जमा करने जा रहे हैं, बस उन्हीं की फोटो — फ्लैट सतह पर, रोशनी में।"
              : "Take photos of only the documents you are submitting — on a flat surface, with good lighting."}
          </p>
        </div>

        {/* 1-Click Mock Testers */}
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => loadMockScenario("clean")}
            disabled={Boolean(uploadingDoc)}
            className="rounded-full border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 active:scale-95 transition cursor-pointer"
            title="Load matching clean demo documents"
          >
            ✓ {t.loadCleanSample}
          </button>
          <button
            onClick={() => loadMockScenario("defect")}
            disabled={Boolean(uploadingDoc)}
            className="rounded-full border border-red-300 bg-white px-3.5 py-1.5 text-xs font-bold text-red-800 shadow-2xs hover:bg-red-50 active:scale-95 transition cursor-pointer"
            title="Load defective demo documents to test mismatch detection"
          >
            ⚠️ {t.loadDefectSample}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-800 border border-red-200">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Document Stack (Single Column as in Lovable Image 4) */}
      <div className="space-y-5">
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

          // Helper to extract display fields
          const extracted = uploaded?.fields_extracted;

          return (
            <div
              key={docType}
              className="rounded-3xl border border-[#EAE5D8] bg-white p-5 sm:p-6 shadow-xs transition"
            >
              {/* Header row: Title + Status Pill */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight sm:text-lg">
                    {lang === "hi" ? meta.title_hi : meta.title_en}
                  </h3>
                  <p className="text-xs text-[#737373] mt-0.5 font-medium">
                    {lang === "hi" ? meta.title_en : meta.desc_en}
                  </p>
                </div>

                {uploaded ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#15803D]">
                    ✓ हो गया
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F4EFE6] px-3 py-1 text-[11px] font-semibold text-[#8C8275]">
                    {lang === "hi" ? "अपलोड बाकी" : "Pending"}
                  </span>
                )}
              </div>

              {/* Dashed Mock Container */}
              <div className="mt-4 rounded-2xl border-2 border-dashed border-[#DDD7C9] bg-[#F7F3EB]/70 p-3.5 sm:p-4">
                {/* Tan Header Banner */}
                <div className="rounded-t-xl bg-[#E8DCC8] px-4 py-2 text-xs font-bold text-[#5C4D3C] tracking-wide">
                  DEMO MOCK • असली DOCUMENT नहीं
                </div>

                {/* White content box */}
                <div className="rounded-b-xl bg-white px-4 py-3.5 border-x border-b border-[#E8DCC8]/60 space-y-2 text-xs">
                  {uploaded && extracted && Object.keys(extracted).length > 0 ? (
                    Object.entries(extracted).map(([field, details]: [string, any]) => (
                      <div key={field} className="flex justify-between items-center text-slate-800">
                        <span className="text-slate-500 font-medium">
                          {field === "name"
                            ? "नाम / Name"
                            : field === "dob"
                            ? "जन्मतिथि / DOB"
                            : field === "issue_date"
                            ? "जारी तिथि / Issued"
                            : field === "validity"
                            ? "वैधता / Validity"
                            : field === "annual_income"
                            ? "वार्षिक आय / Income"
                            : field === "percentage"
                            ? "प्राप्तांक / Score"
                            : field === "account_holder"
                            ? "खाताधारक / Name"
                            : field}
                        </span>
                        <span className="font-mono font-semibold text-slate-900 truncate max-w-[200px]">
                          {details.quoted_text || String(details.value)}
                        </span>
                      </div>
                    ))
                  ) : docType === "aadhaar" ? (
                    <>
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="text-slate-500 font-medium">नाम / Name</span>
                        <span className="font-mono font-semibold text-slate-900">Suresh Kummar Yadav</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="text-slate-500 font-medium">जन्मतिथि / DOB</span>
                        <span className="font-mono font-semibold text-slate-900">14-08-2006</span>
                      </div>
                    </>
                  ) : docType === "income_certificate" ? (
                    <>
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="text-slate-500 font-medium">जारी तिथि / Issued</span>
                        <span className="font-mono font-semibold text-slate-900">12-03-2023</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="text-slate-500 font-medium">वैधता / Validity</span>
                        <span className="font-mono font-semibold text-slate-900">1 वर्ष</span>
                      </div>
                    </>
                  ) : docType === "marksheet" ? (
                    <>
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="text-slate-500 font-medium">प्राप्तांक / Score</span>
                        <span className="font-mono font-semibold text-slate-900">74.5%</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="text-slate-500 font-medium">उत्तीर्ण वर्ष / Year</span>
                        <span className="font-mono font-semibold text-slate-900">2024</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="text-slate-500 font-medium">खाताधारक / Name</span>
                        <span className="font-mono font-semibold text-slate-900">Suresh Kummar Yadav</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="text-slate-500 font-medium">बैंक शाखा / Branch</span>
                        <span className="font-mono font-semibold text-slate-900">Bhopal, MP</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Upload Controls Row */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#F0EBE1]">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 rounded-xl border border-[#DDD7C9] bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-[#F9F6F0] active:scale-95 transition cursor-pointer shadow-2xs">
                    <span>📸</span>
                    <span>{t.takePhoto}</span>
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

                  <label className="flex items-center gap-1.5 rounded-xl border border-[#DDD7C9] bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-[#F9F6F0] active:scale-95 transition cursor-pointer shadow-2xs">
                    <span>📄</span>
                    <span>{t.uploadFile} / PDF</span>
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
                  <span className="text-xs font-semibold text-amber-700 animate-pulse">
                    {t.processingDoc}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pre-Check CTA Bottom Bar */}
      <div className="mt-8 space-y-3">
        <button
          onClick={onProceedToReport}
          disabled={uploadedCount === 0}
          className={`w-full rounded-2xl py-4 text-base font-bold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 ${
            uploadedCount > 0
              ? "bg-[#1F514C] text-white hover:bg-[#18413D] cursor-pointer"
              : "bg-[#D8D2C4] text-[#8C8476] cursor-not-allowed"
          }`}
        >
          <span>पूर्व-जाँच चलाएँ (Run Pre-Check)</span>
          <span>➔</span>
        </button>

        <div className="text-center">
          {uploadedCount === 0 ? (
            <p className="text-xs text-slate-500">
              {lang === "hi"
                ? "💡 कम से कम 1 दस्तावेज़ अपलोड करें या ऊपर 'डेमो कागज़' का चयन करें।"
                : "💡 Upload at least 1 document or click a demo sample above."}
            </p>
          ) : uploadedCount < totalRequired ? (
            <p className="text-xs font-medium text-amber-800">
              {lang === "hi"
                ? `⚡ प्रारंभिक पूर्व-जाँच (${uploadedCount}/${totalRequired} दस्तावेज़): जो दस्तावेज़ उपलब्ध हैं, उनकी जांच होगी।`
                : `⚡ Preliminary Pre-Check (${uploadedCount}/${totalRequired} docs): Analyzes uploaded documents now.`}
            </p>
          ) : (
            <p className="text-xs font-medium text-[#15803D]">
              {lang === "hi"
                ? "✓ सभी आवश्यक दस्तावेज़ उपलब्ध हैं — पूरी रिपोर्ट तैयार की जाएगी।"
                : "✓ All documents ready — full pre-check report will be generated."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
