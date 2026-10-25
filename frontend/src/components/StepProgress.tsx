"use client";

import React from "react";
import { Language, translations } from "../lib/translations";

interface StepProgressProps {
  currentStep: 1 | 2 | 3;
  onSelectStep: (step: 1 | 2 | 3) => void;
  lang: Language;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  onSelectStep,
  lang
}) => {
  const t = translations[lang];

  const steps = [
    { num: 1, label: t.step1, icon: "🎙️" },
    { num: 2, label: t.step2, icon: "📄" },
    { num: 3, label: t.step3, icon: "📋" }
  ];

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 py-3 px-4">
      <div className="mx-auto flex max-w-xl justify-between items-center relative">
        {/* Background track line */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700 z-0" />
        
        {steps.map((s) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;

          return (
            <button
              key={s.num}
              onClick={() => onSelectStep(s.num as 1 | 2 | 3)}
              className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-bold shadow transition-all ${
                  isActive
                    ? "bg-gradient-to-tr from-orange-600 to-amber-500 text-white scale-110 ring-4 ring-orange-200 dark:ring-orange-900"
                    : isDone
                    ? "bg-emerald-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-500 border-2 border-slate-300 dark:border-slate-600"
                }`}
              >
                {isDone ? "✓" : s.icon}
              </div>
              <span
                className={`mt-1.5 text-xs font-semibold ${
                  isActive
                    ? "text-orange-700 dark:text-orange-400 font-bold"
                    : isDone
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
