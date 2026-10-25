"use client";

import React from "react";
import { Language, translations } from "../lib/translations";

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  onOpenPrivacy: () => void;
  currentStep: 0 | 1 | 2 | 3;
  onSelectStep: (step: 0 | 1 | 2 | 3) => void;
  schemeTitle?: string;
  sourceUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  onOpenPrivacy,
  currentStep,
  onSelectStep,
  schemeTitle,
  sourceUrl = "https://scholarshipportal.mp.nic.in/"
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EAE5D8] bg-[#FBF8F1]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <div
          onClick={() => onSelectStep(0)}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1C4D43] text-white font-bold text-lg shadow-2xs group-hover:bg-[#153B33] transition">
            क
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              कागज़ साथी
            </span>
            <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase leading-none mt-0.5">
              KAAGAZ SAATHI
            </span>
          </div>
        </div>

        {/* Right Section: Inline Stepper Pills (Flow) OR Start Check Button (Landing) */}
        <div className="flex items-center gap-3">
          {currentStep === 0 ? (
            <button
              onClick={() => onSelectStep(1)}
              className="rounded-full border border-[#D5CEBF] bg-white px-5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-[#F4EFE6] active:scale-95 transition cursor-pointer"
            >
              जाँच शुरू करें
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Step 1: बोलें */}
              <button
                onClick={() => onSelectStep(1)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  currentStep === 1
                    ? "bg-[#1C4D43] text-white shadow-2xs"
                    : currentStep > 1
                    ? "bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]"
                    : "bg-[#EAE5D8] text-[#7A7468]"
                }`}
              >
                {currentStep > 1 && <span>✓</span>}
                <span>बोलें</span>
              </button>

              <span className="text-[#C8C2B4] font-mono text-xs">—</span>

              {/* Step 2: फोटो */}
              <button
                onClick={() => onSelectStep(2)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  currentStep === 2
                    ? "bg-[#1C4D43] text-white shadow-2xs"
                    : currentStep > 2
                    ? "bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]"
                    : "bg-[#EAE5D8] text-[#7A7468]"
                }`}
              >
                {currentStep > 2 && <span>✓</span>}
                <span>फोटो</span>
              </button>

              <span className="text-[#C8C2B4] font-mono text-xs">—</span>

              {/* Step 3: रिपोर्ट */}
              <button
                onClick={() => onSelectStep(3)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  currentStep === 3
                    ? "bg-[#1C4D43] text-white shadow-2xs"
                    : "bg-[#EAE5D8] text-[#7A7468]"
                }`}
              >
                <span>रिपोर्ट</span>
              </button>
            </div>
          )}

          {/* Privacy info icon */}
          <button
            onClick={onOpenPrivacy}
            title={t.privacyModalTitle}
            className="rounded-full p-1.5 text-slate-500 hover:text-slate-800 hover:bg-[#EAE5D8]/50 transition cursor-pointer"
          >
            🔒
          </button>
        </div>
      </div>
    </header>
  );
};
