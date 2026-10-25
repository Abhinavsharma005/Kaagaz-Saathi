"use client";

import React from "react";
import { Language, translations } from "../lib/translations";

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  onOpenPrivacy: () => void;
  schemeTitle?: string;
  sourceUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  onOpenPrivacy,
  schemeTitle,
  sourceUrl = "https://scholarshipportal.mp.nic.in/"
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Title */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-emerald-600 text-white font-bold shadow-md">
            कS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
                {t.appName}
              </h1>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                Gnani AI
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              {t.appTagline}
            </p>
          </div>
        </div>

        {/* Actions: Language Toggle & Privacy */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition"
          >
            🌐 {t.langToggle}
          </button>

          <button
            onClick={onOpenPrivacy}
            title={t.privacyModalTitle}
            className="rounded-xl border border-slate-300 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
          >
            🔒
          </button>
        </div>
      </div>

      {/* Scheme Banner */}
      <div className="bg-amber-50 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-t border-amber-200/60 dark:border-amber-900/40">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="font-semibold truncate">
            📌 {schemeTitle || t.activeScheme}
          </span>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 shrink-0 underline hover:text-amber-700 dark:hover:text-amber-300 font-bold"
          >
            {t.officialSource} ↗
          </a>
        </div>
      </div>
    </header>
  );
};
