"use client";

import React from "react";
import { Language, translations } from "../lib/translations";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onPurge: () => void;
  isPurging: boolean;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  lang,
  onPurge,
  isPurging
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔒</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.privacyModalTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="my-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>{t.privacyModalText}</p>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs font-medium">
            ✓ शून्य डेटा संग्रहण (Zero Data Storage) <br />
            ✓ केवल वोलेटाइल रैम (Volatile RAM) में प्रोसेसिंग <br />
            ✓ सरकारी योजनाओं का पारदर्शी 'नो कोट, नो पास' नियम
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onPurge}
            disabled={isPurging}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50 transition"
          >
            {isPurging ? "Purging..." : t.deleteMyData}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
