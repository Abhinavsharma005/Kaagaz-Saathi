"use client";

import React, { useState } from "react";
import { Language, translations } from "../lib/translations";
import { uploadDocument } from "../lib/api";

interface UploadStepProps {
  sessionId: string;
  requiredDocuments: string[];
  optionalDocuments?: string[];
  schemeId?: string;
  schemeTitle?: string;
  lang: Language;
  onProceedToReport: () => void;
  uploadedDocs: Record<string, any>;
  onDocUploaded: (docType: string, data: any) => void;
  isRunningCheck?: boolean;
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
    tag_hi: "पहचान एवं नाम सत्यापन",
    tag_en: "Identity & Name Verification",
    tag_type: "required",
    desc_hi: "नाम, 12-अंकों का आधार नंबर और जन्मतिथि केवल आवश्यकता होने पर जांची जाएगी।",
    desc_en: "Checks name, 12-digit UID pattern, and date of birth only where officially required."
  },
  income_certificate: {
    title_hi: "आय प्रमाण पत्र (Income Certificate)",
    title_en: "Income Certificate",
    icon: "📜",
    tag_hi: "मुख्य पात्रता दस्तावेज़",
    tag_en: "Key Eligibility Document",
    tag_type: "key",
    desc_hi: "आवेदक का नाम, वार्षिक आय, सक्षम अधिकारी (तहसीलदार/SDM) और 3-वर्षीय जारी दिनांक।",
    desc_en: "Applicant name, annual family income, issuing revenue authority, and 3-year validity."
  },
  marksheet: {
    title_hi: "अंकसूची (Academic Marksheet)",
    title_en: "Academic Marksheet",
    icon: "🎓",
    tag_hi: "शैक्षणिक पात्रता दस्तावेज़",
    tag_en: "Academic Eligibility Document",
    tag_type: "key",
    desc_hi: "न्यूनतम उत्तीर्ण प्राप्तांक (50%) एवं आधार से नाम का मिलान।",
    desc_en: "Minimum passing score (50%) and consistency with Aadhaar name."
  },
  bank_passbook: {
    title_hi: "बैंक पासबुक (Bank Passbook)",
    title_en: "Bank Passbook",
    icon: "🏦",
    tag_hi: "DBT बैंक खाता सत्यापन",
    tag_en: "DBT Account Seeding",
    tag_type: "optional",
    desc_hi: "खाताधारक का नाम एवं प्रत्यक्ष लाभ अंतरण (DBT) हेतु बैंक खाता विवरण।",
    desc_en: "Account-holder name and visible bank details for Direct Benefit Transfer."
  },
  caste_certificate: {
    title_hi: "जाति प्रमाण पत्र (Caste Certificate)",
    title_en: "Caste Certificate",
    icon: "🏛️",
    tag_hi: "आरक्षण एवं श्रेणी पात्रता",
    tag_en: "Category Eligibility",
    tag_type: "key",
    desc_hi: "स्थाई जाति प्रमाण पत्र, श्रेणी (SC/ST/OBC), सक्षम अधिकारी (SDM) एवं नाम का मिलान।",
    desc_en: "Permanent caste certificate, category (SC/ST/OBC), authorized officer seal, and name."
  },
  other_document: {
    title_hi: "मूल दस्तावेज़ (Primary Document)",
    title_en: "Primary Document",
    icon: "📄",
    tag_hi: "सामान्य दस्तावेज़ पूर्व-जाँच",
    tag_en: "General Pre-Check Document",
    tag_type: "key",
    desc_hi: "दस्तावेज़ की पठनीयता, धारक का नाम एवं पहचान क्रमांक की पूर्व-जाँच।",
    desc_en: "Pre-check of document legibility, beneficiary name, and identifier."
  }
};

export const UploadStep: React.FC<UploadStepProps> = ({
  sessionId,
  requiredDocuments,
  optionalDocuments = [],
  schemeId = "mp_post_matric_scholarship",
  schemeTitle,
  lang,
  onProceedToReport,
  uploadedDocs,
  onDocUploaded,
  isRunningCheck = false
}) => {
  const t = translations[lang];
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [multiUploading, setMultiUploading] = useState(false);
  const [docPreviews, setDocPreviews] = useState<Record<string, string>>({});
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [multiUploadStatus, setMultiUploadStatus] = useState<string | null>(null);

  // Combine required + optional documents without duplicate keys
  const allDocKeys = Array.from(new Set([...requiredDocuments, ...optionalDocuments]));

  // Single file upload handler
  const handleFileUpload = async (docType: string, file: File) => {
    if (file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setDocPreviews((prev) => ({ ...prev, [docType]: previewUrl }));
    }

    setUploadingDocs((prev) => ({ ...prev, [docType]: true }));
    setErrorMsg(null);
    try {
      const res = await uploadDocument(sessionId, docType, file, file.name);
      onDocUploaded(docType, res);
    } catch (err: any) {
      console.error(`Upload error for ${docType}:`, err);
      setErrorMsg(`Failed to process ${docType}: ${err.message}`);
    } finally {
      setUploadingDocs((prev) => ({ ...prev, [docType]: false }));
    }
  };

  // Multi-file upload in a single turn
  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setMultiUploading(true);
    setErrorMsg(null);
    setMultiUploadStatus(
      lang === "hi"
        ? `${files.length} दस्तावेज़ अपलोड किए जा रहे हैं...`
        : `Uploading ${files.length} documents...`
    );

    const availableSlots = [...allDocKeys];
    const assignments: { slot: string; file: File }[] = [];
    const usedSlots = new Set<string>();

    for (const file of files) {
      const name = file.name.toLowerCase();
      let matchedSlot: string | null = null;

      if (name.includes("caste") || name.includes("jati") || name.includes("praman_patra")) {
        matchedSlot = "caste_certificate";
      } else if (name.includes("aadhaar") || name.includes("adhar") || name.includes("uid") || name.includes("aadh")) {
        matchedSlot = "aadhaar";
      } else if (name.includes("income") || name.includes("aay") || name.includes("aaye") || name.includes("praman")) {
        matchedSlot = "income_certificate";
      } else if (name.includes("marksheet") || name.includes("mark") || name.includes("10th") || name.includes("12th") || name.includes("result") || name.includes("board")) {
        matchedSlot = "marksheet";
      } else if (name.includes("bank") || name.includes("passbook") || name.includes("account") || name.includes("sbi") || name.includes("pnb")) {
        matchedSlot = "bank_passbook";
      } else if (name.includes("other") || name.includes("doc")) {
        matchedSlot = "other_document";
      }

      if (matchedSlot && availableSlots.includes(matchedSlot) && !usedSlots.has(matchedSlot)) {
        assignments.push({ slot: matchedSlot, file });
        usedSlots.add(matchedSlot);
      } else {
        const nextSlot = availableSlots.find((s) => !usedSlots.has(s) && !uploadedDocs[s]);
        if (nextSlot) {
          assignments.push({ slot: nextSlot, file });
          usedSlots.add(nextSlot);
        } else {
          const anySlot = availableSlots.find((s) => !usedSlots.has(s)) || availableSlots[0];
          assignments.push({ slot: anySlot, file });
          usedSlots.add(anySlot);
        }
      }
    }

    try {
      const uploadPromises = assignments.map(async ({ slot, file }) => {
        if (file.type.startsWith("image/")) {
          const previewUrl = URL.createObjectURL(file);
          setDocPreviews((prev) => ({ ...prev, [slot]: previewUrl }));
        }
        setUploadingDocs((prev) => ({ ...prev, [slot]: true }));

        try {
          const res = await uploadDocument(sessionId, slot, file, file.name);
          onDocUploaded(slot, res);
        } finally {
          setUploadingDocs((prev) => ({ ...prev, [slot]: false }));
        }
      });

      await Promise.all(uploadPromises);
      setMultiUploadStatus(
        lang === "hi"
          ? `✓ ${assignments.length} दस्तावेज़ सफलतापूर्वक अपलोड किए गए!`
          : `✓ Successfully uploaded ${assignments.length} documents!`
      );
    } catch (err: any) {
      console.error("Multi upload error:", err);
      setErrorMsg("Multi-upload failed: " + err.message);
    } finally {
      setMultiUploading(false);
      e.target.value = "";
    }
  };

  // 1-Click Mock Samples tailored dynamically to active scheme
  const loadMockScenario = async (scenario: "clean" | "defect") => {
    setErrorMsg(null);
    setBatchLoading(true);

    let targetSet: Record<string, string> = {};

    if (schemeId === "aadhaar_check") {
      targetSet = scenario === "clean"
        ? {
            aadhaar: "GOVERNMENT OF INDIA\nRajesh Kumar Sharma\nDOB: 12/05/2002\n1234 5678 9012\nGram Rampur, Bhopal, MP"
          }
        : {
            aadhaar: "GOVERNMENT OF INDIA\nRajesh Sarma\nDOB: 12/05/2002\n9876 5432 1098\nGram Rampur, Bhopal, MP"
          };
    } else if (schemeId === "income_cert_check") {
      targetSet = scenario === "clean"
        ? {
            income_certificate: "REVENUE DEPARTMENT, MP\nआय प्रमाण पत्र\nApplicant Name: Rajesh Kumar Sharma\nAnnual Income: ₹ 1,80,000/-\nDate of Issue: 15/09/2026\nCertificate No: MP-REV-INC-2026-89412"
          }
        : {
            income_certificate: "REVENUE DEPARTMENT, MP\nआय प्रमाण पत्र\nApplicant Name: Rajesh Kumar Sharma\nAnnual Income: ₹ 3,20,000/-\nDate of Issue: 10/02/2022\nCertificate No: MP-REV-INC-2022-11029"
          };
    } else if (schemeId === "caste_cert_check") {
      targetSet = scenario === "clean"
        ? {
            caste_certificate: "OFFICE OF THE S.D.M. / REVENUE, MP\nस्थाई जाति प्रमाण पत्र\nApplicant Name: Rajesh Kumar Sharma\nCategory: OBC\nCertificate No: MP-CASTE-OBC-2024-5412\nDate of Issue: 14/06/2024"
          }
        : {
            caste_certificate: "OFFICE OF THE S.D.M. / REVENUE, MP\nस्थाई जाति प्रमाण पत्र\nApplicant Name: Vikram Patel\nCategory: OBC\nCertificate No: MP-CASTE-OBC-2024-5412\nDate of Issue: 14/06/2024"
          };
    } else if (schemeId === "other_doc_check") {
      targetSet = scenario === "clean"
        ? {
            other_document: "GOVERNMENT OF MADHYA PRADESH\nDOCUMENT VERIFICATION CERTIFICATE\nApplicant Name: Rajesh Kumar Sharma\nDocument No: MP-DOC-2025-9982\nDate: 12/08/2025"
          }
        : {
            other_document: "GOVERNMENT OF MADHYA PRADESH\nDOCUMENT VERIFICATION CERTIFICATE\nApplicant Name: Vikram Verma\nDocument No: MP-DOC-2025-9982\nDate: 12/08/2025"
          };
    } else {
      // Default: MP Post-Matric Scholarship
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

      targetSet = scenario === "clean" ? mockDataClean : mockDataDefect;
    }

    try {
      for (const [dType, rawText] of Object.entries(targetSet)) {
        const blob = new Blob([rawText], { type: "text/plain" });
        const res = await uploadDocument(sessionId, dType, blob, `${dType}_${scenario}.txt`);
        onDocUploaded(dType, res);
      }
    } catch (err: any) {
      console.error("Batch load error:", err);
      setErrorMsg("Failed to load sample set: " + err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const uploadedCount = Object.keys(uploadedDocs).length;
  const totalRequired = requiredDocuments.length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Title & Description: Full width stack */}
      <div className="mb-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-[#EAE5D8] px-3 py-0.5 text-[11px] font-bold text-[#5C4D3C]">
              {schemeTitle || "कागज़ साथी पूर्व-जाँच"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl leading-snug">
            {lang === "hi" ? "कागज़ की फोटो लें" : "Take photos of your documents"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {lang === "hi"
              ? "केवल इस जाँच के लिए आवश्यक दस्तावेज़ों की फोटो लें — फ्लैट सतह पर, अच्छी रोशनी में।"
              : "Upload only the documents needed for this check — on a flat surface, with good lighting."}
          </p>
        </div>

        {/* Action Toolbar: Multi-upload button + 1-Click Demo Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-[#EAE5D8] pb-4">
          <label className="flex items-center gap-2 rounded-xl bg-[#1F514C] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#18413D] active:scale-95 transition cursor-pointer">
            <span>📁</span>
            <span>
              {lang === "hi" ? "एक साथ कई दस्तावेज़ अपलोड करें" : "Upload Multiple Documents at Once"}
            </span>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              disabled={multiUploading || batchLoading}
              onChange={handleMultiUpload}
            />
          </label>

          {/* 1-Click Mock Testers */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadMockScenario("clean")}
              disabled={batchLoading || multiUploading}
              className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 active:scale-95 transition cursor-pointer"
              title="Load matching clean demo documents"
            >
              ✓ {t.loadCleanSample}
            </button>
            <button
              onClick={() => loadMockScenario("defect")}
              disabled={batchLoading || multiUploading}
              className="rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-800 shadow-2xs hover:bg-red-50 active:scale-95 transition cursor-pointer"
              title="Load defective demo documents to test mismatch detection"
            >
              ⚠️ {t.loadDefectSample}
            </button>
          </div>
        </div>

        {/* Multi-upload status banner */}
        {multiUploadStatus && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              {multiUploading ? (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
              ) : (
                <span>✓</span>
              )}
              <span>{multiUploadStatus}</span>
            </div>
            {!multiUploading && (
              <button
                onClick={() => setMultiUploadStatus(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold px-1.5"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-800 border border-red-200">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Dynamic Document Stack (Displays only documents relevant to selected goal!) */}
      <div className="space-y-5">
        {allDocKeys.map((docType) => {
          const isRequired = requiredDocuments.includes(docType);
          const meta = DOC_METADATA[docType] || {
            title_hi: docType,
            title_en: docType,
            icon: "📄",
            tag_hi: isRequired ? "आवश्यक दस्तावेज़" : "वैकल्पिक दस्तावेज़",
            tag_en: isRequired ? "Required Document" : "Optional Supporting",
            tag_type: isRequired ? "required" : "optional",
            desc_hi: "दस्तावेज़",
            desc_en: "Document"
          };
          const uploaded = uploadedDocs[docType];
          const isSlotUploading = Boolean(uploadingDocs[docType] || batchLoading || multiUploading);
          const hasPreviewImage = Boolean(docPreviews[docType]);

          const isMock =
            uploaded?.filename?.includes("clean.txt") ||
            uploaded?.filename?.includes("defect.txt") ||
            uploaded?.filename?.endsWith(".txt");

          const extracted = uploaded?.fields_extracted;

          return (
            <div
              key={docType}
              className={`rounded-3xl border bg-white p-5 sm:p-6 shadow-xs transition ${
                isRequired ? "border-[#EAE5D8]" : "border-dashed border-[#DDD7C9] bg-white/80"
              }`}
            >
              {/* Header row: Title + Status Pill */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight sm:text-lg">
                      {lang === "hi" ? meta.title_hi : meta.title_en}
                    </h3>
                    {!isRequired && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {lang === "hi" ? "वैकल्पिक (Optional)" : "Optional"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#737373] mt-0.5 font-medium">
                    {lang === "hi" ? meta.desc_hi : meta.desc_en}
                  </p>
                </div>

                {uploaded ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#15803D]">
                    ✓ हो गया
                  </span>
                ) : isRequired ? (
                  <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-[11px] font-semibold text-[#92400E]">
                    {lang === "hi" ? "आवश्यक • बाकी" : "Required • Pending"}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F4EFE6] px-3 py-1 text-[11px] font-semibold text-[#8C8275]">
                    {lang === "hi" ? "वैकल्पिक" : "Optional"}
                  </span>
                )}
              </div>

              {/* Document Container */}
              <div className="mt-4 rounded-2xl border-2 border-dashed border-[#DDD7C9] bg-[#F7F3EB]/70 p-3.5 sm:p-4">
                {/* Banner: Real Upload vs Demo Mock vs Pending Sample */}
                {uploaded && !isMock ? (
                  <div className="rounded-t-xl bg-[#DCFCE7] px-4 py-2 text-xs font-bold text-[#15803D] flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <span>✓</span>
                      <span className="truncate">अपलोड किया गया: {uploaded.filename || meta.title_hi}</span>
                    </span>
                    <span className="text-[10px] font-semibold bg-white/80 px-2 py-0.5 rounded-full text-emerald-800 shrink-0">
                      असली दस्तावेज़ (Real Upload)
                    </span>
                  </div>
                ) : uploaded && isMock ? (
                  <div className="rounded-t-xl bg-[#E8DCC8] px-4 py-2 text-xs font-bold text-[#5C4D3C] tracking-wide flex items-center justify-between">
                    <span>DEMO MOCK • असली DOCUMENT नहीं</span>
                    <span className="text-[10px] bg-[#DDD0BD] px-2 py-0.5 rounded-full text-[#4A3E31]">नमूना डेटा</span>
                  </div>
                ) : (
                  <div className="rounded-t-xl bg-[#F0EBE0] px-4 py-2 text-xs font-medium text-[#7D7365] tracking-wide flex items-center justify-between">
                    <span>{isRequired ? "आवश्यक दस्तावेज़ पूर्वावलोकन" : "वैकल्पिक दस्तावेज़ प्रारूप"}</span>
                    <span className="text-[10px] bg-[#E5DFD2] px-2 py-0.5 rounded-full text-[#635A4E]">
                      {isRequired ? "प्रतीक्षारत" : "सहायक"}
                    </span>
                  </div>
                )}

                {/* White content box with Preview Thumbnail + Extracted Data */}
                <div className="rounded-b-xl bg-white px-4 py-3.5 border-x border-b border-[#E8DCC8]/60 space-y-3 text-xs">
                  {hasPreviewImage && (
                    <div className="flex items-center gap-3 p-2 bg-[#F9F7F2] rounded-xl border border-[#E8E2D5]">
                      <img
                        src={docPreviews[docType]}
                        alt={meta.title_en}
                        className="h-16 w-16 object-cover rounded-lg border border-[#DDD7C9] cursor-pointer hover:opacity-90 shadow-2xs transition"
                        onClick={() => setPreviewModalUrl(docPreviews[docType])}
                        title="Click to view full image"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {uploaded?.filename || "दस्तावेज़ छवि"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {lang === "hi" ? "चित्र देखने के लिए क्लिक करें" : "Click image to enlarge"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewModalUrl(docPreviews[docType])}
                        className="text-xs font-bold text-[#1F514C] hover:underline px-2.5 py-1 rounded-lg bg-white border border-[#DDD7C9] cursor-pointer"
                      >
                        🔍 देखें
                      </button>
                    </div>
                  )}

                  {/* Extracted Fields or Mock Fields */}
                  <div className="space-y-2">
                    {uploaded && extracted && Object.keys(extracted).length > 0 ? (
                      Object.entries(extracted).map(([field, details]: [string, any]) => (
                        <div key={field} className="flex justify-between items-center text-slate-800 py-0.5">
                          <span className="text-slate-500 font-medium">
                            {field === "name"
                              ? "नाम / Name"
                              : field === "dob"
                              ? "जन्मतिथि / DOB"
                              : field === "uid"
                              ? "आधार संख्या / UID"
                              : field === "issue_date"
                              ? "जारी तिथि / Issued"
                              : field === "validity"
                              ? "वैधता / Validity"
                              : field === "annual_income"
                              ? "वार्षिक आय / Income"
                              : field === "category"
                              ? "जाति श्रेणी / Category"
                              : field === "percentage"
                              ? "प्राप्तांक / Score"
                              : field === "account_holder"
                              ? "खाताधारक / Name"
                              : field === "document_no"
                              ? "दस्तावेज़ क्रमांक / ID"
                              : field}
                          </span>
                          <span className="font-mono font-semibold text-slate-900 truncate max-w-[220px]">
                            {details.quoted_text || String(details.value)}
                          </span>
                        </div>
                      ))
                    ) : uploaded && !extracted ? (
                      <p className="text-slate-600 italic py-1">
                        {lang === "hi"
                          ? "✓ दस्तावेज़ प्राप्त हुआ — पूर्व-जाँच में इसका संपूर्ण विश्लेषण होगा।"
                          : "✓ Document received — will be analyzed in pre-check."}
                      </p>
                    ) : docType === "aadhaar" ? (
                      <>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">नाम / Name</span>
                          <span className="font-mono font-semibold text-slate-900">Rajesh Kumar Sharma</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">आधार संख्या / UID</span>
                          <span className="font-mono font-semibold text-slate-900">1234 5678 9012</span>
                        </div>
                      </>
                    ) : docType === "income_certificate" ? (
                      <>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">वार्षिक आय / Income</span>
                          <span className="font-mono font-semibold text-slate-900">₹ 1,80,000/-</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">जारी तिथि / Issued</span>
                          <span className="font-mono font-semibold text-slate-900">15-09-2026</span>
                        </div>
                      </>
                    ) : docType === "caste_certificate" ? (
                      <>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">आवेदक नाम / Name</span>
                          <span className="font-mono font-semibold text-slate-900">Rajesh Kumar Sharma</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">जाति श्रेणी / Category</span>
                          <span className="font-mono font-semibold text-slate-900">OBC (अन्य पिछड़ा वर्ग)</span>
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
                    ) : docType === "bank_passbook" ? (
                      <>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">खाताधारक / Name</span>
                          <span className="font-mono font-semibold text-slate-900">Rajesh Kumar Sharma</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">बैंक शाखा / Branch</span>
                          <span className="font-mono font-semibold text-slate-900">Bhopal, MP</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">आवेदक / Name</span>
                          <span className="font-mono font-semibold text-slate-900">Rajesh Kumar Sharma</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="text-slate-500 font-medium">क्रमांक / ID</span>
                          <span className="font-mono font-semibold text-slate-900">MP-DOC-2025-9982</span>
                        </div>
                      </>
                    )}
                  </div>
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
                      disabled={isSlotUploading}
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
                      disabled={isSlotUploading}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(docType, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>

                {isSlotUploading && (
                  <span className="text-xs font-semibold text-amber-700 animate-pulse flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
                    <span>{t.processingDoc}</span>
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
          disabled={uploadedCount === 0 || isRunningCheck}
          className={`w-full rounded-2xl py-4 text-base font-bold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 ${
            uploadedCount > 0 && !isRunningCheck
              ? "bg-[#1F514C] text-white hover:bg-[#18413D] cursor-pointer"
              : "bg-[#D8D2C4] text-[#8C8476] cursor-not-allowed"
          }`}
        >
          {isRunningCheck ? (
            <>
              <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>
                {lang === "hi"
                  ? "जाँच जारी है... कृपया प्रतीक्षा करें (Analyzing Documents...)"
                  : "Running Pre-Check... Please wait"}
              </span>
            </>
          ) : (
            <>
              <span>पूर्व-जाँच चलाएँ (Run Pre-Check)</span>
              <span>➔</span>
            </>
          )}
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
                ? `⚡ प्रारंभिक पूर्व-जाँच (${uploadedCount}/${totalRequired} आवश्यक दस्तावेज़): जो दस्तावेज़ उपलब्ध हैं, उनकी जांच होगी।`
                : `⚡ Preliminary Pre-Check (${uploadedCount}/${totalRequired} required docs): Analyzes uploaded documents now.`}
            </p>
          ) : (
            <p className="text-xs font-medium text-[#15803D]">
              {lang === "hi"
                ? "✓ सभी आवश्यक दस्तावेज़ उपलब्ध हैं — पूरी रिपोर्ट तैयार की जाएगी।"
                : "✓ All required documents ready — full pre-check report will be generated."}
            </p>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800">
                {lang === "hi" ? "दस्तावेज़ पूर्वावलोकन (Document Preview)" : "Document Preview"}
              </span>
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="rounded-full h-7 w-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-900/5 rounded-xl">
              <img
                src={previewModalUrl}
                alt="Enlarged Document Preview"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
