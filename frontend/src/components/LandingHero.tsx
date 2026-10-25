"use client";

import React from "react";
import { Language, translations } from "../lib/translations";

interface LandingHeroProps {
  onStart: () => void;
  lang: Language;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onStart, lang }) => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-7">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCD3BE] bg-[#F2EBDA] px-3.5 py-1 text-xs font-semibold text-[#665B43] shadow-2xs">
              <span>🎙️</span>
              <span>आवाज़ से चलने वाला pre-check</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.15]">
              बार-बार <span className="font-serif italic font-normal text-[#B91C1C]">reject</span> होने से
              <br />
              पहले,
              <br />
              30 सेकंड में जाँच लें
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-sm text-slate-700 leading-relaxed sm:text-base max-w-xl">
              छात्रवृत्ति, pension, certificate — छोटी-सी गलती (नाम में एक अक्षर, पुराना certificate) और महीनों बर्बाद। हम आपके आवेदन को जमा करने से <strong className="font-bold text-slate-950">पहले</strong> जाँचते हैं — आप बस बोलिए और कागज़ की फोटो दिखाइए।
            </p>

            {/* Hero CTA */}
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                onClick={onStart}
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#1C4D43] px-7 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#153B33] active:scale-95 transition cursor-pointer"
              >
                <span>🎙️</span>
                <span>माइक दबाएँ — शुरू करें</span>
              </button>
              <span className="text-xs text-slate-600 font-medium">
                बिना लॉगिन • बिना डेटा save • मुफ़्त
              </span>
            </div>
          </div>

          {/* Right Column: Hero Illustration (Matching Image 1) */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border border-[#DFD7C5] bg-[#E89E5F] bg-gradient-to-br from-[#D98236] via-[#C96F24] to-[#7D3F14] p-6 shadow-xl text-slate-900">
              {/* Desk wood grain atmosphere */}
              <div className="relative rounded-2xl bg-[#F4EFE6]/95 p-5 shadow-md border border-[#E1D8C6] space-y-4">
                {/* Paper document mock */}
                <div className="relative rounded-xl border border-slate-300 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-emerald-700 text-[10px] font-bold text-white flex items-center justify-center">
                        क
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        मध्य प्रदेश शासन
                      </span>
                    </div>
                    <span className="h-5 w-5 rounded-full border-2 border-red-500/80 flex items-center justify-center text-[8px] font-serif font-bold text-red-600">
                      सील
                    </span>
                  </div>

                  <div className="mt-3 flex gap-3">
                    <div className="h-12 w-10 bg-slate-200 rounded border border-slate-300 flex items-center justify-center text-[8px] text-slate-400">
                      फोटो
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-2 w-3/4 bg-slate-800 rounded-sm" />
                      <div className="h-2 w-1/2 bg-slate-400 rounded-sm" />
                      <div className="h-2 w-2/3 bg-slate-300 rounded-sm" />
                    </div>
                  </div>
                </div>

                {/* Smartphone scanning the document */}
                <div className="mx-auto w-48 rounded-2xl bg-slate-950 p-2 shadow-2xl ring-2 ring-slate-800">
                  <div className="relative rounded-xl bg-slate-900 p-3 text-white overflow-hidden">
                    <div className="border border-dashed border-emerald-400/80 rounded-lg p-2 text-center bg-emerald-950/30">
                      <div className="h-1.5 w-16 bg-emerald-400 rounded-full mx-auto animate-pulse" />
                      <p className="mt-2 text-[9px] font-mono text-emerald-300 font-bold">
                        नाम: Rajesh Kumar
                      </p>
                      <p className="text-[8px] font-mono text-emerald-400">
                        आय: ₹ 1,80,000
                      </p>
                    </div>
                    <div className="mt-2 flex justify-center">
                      <div className="h-5 w-5 rounded-full border border-white/60 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Badge on Illustration */}
              <div className="absolute bottom-3 left-3 z-10">
                <span className="inline-block rounded-full bg-white px-3.5 py-1 text-xs font-bold text-[#B91C1C] shadow-md border border-[#F3C4C4]">
                  डेमो • mock documents
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Quote Banner */}
        <div className="mt-16 text-center border-t border-[#EAE3D2] pt-8">
          <p className="font-serif text-lg sm:text-xl text-slate-800 italic">
            &ldquo;एक अक्षर के नाम-mismatch से दो बार reject → <span className="font-sans font-bold not-italic text-[#1C4D43] underline decoration-[#1C4D43]/40">जमा करने से 30 सेकंड पहले पकड़ में आया</span>&rdquo;
          </p>
          <span className="mt-2 block text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            THE IMPACT WE DEMO FOR
          </span>
        </div>
      </section>

      {/* Section 1: कैसे चलता है? (Image 2) */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 border-t border-[#EAE3D2]">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          कैसे चलता है?
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {/* Step 1 Card */}
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C4D43] text-sm font-black text-white">
              1
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              बोलकर बताएँ
            </h3>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mt-0.5">
              SPEAK YOUR ANSWERS
            </span>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              नाम, जन्मतिथि और योजना — टाइप करने की ज़रूरत नहीं। हिंदी, हिंग्लिश या English में।
            </p>
          </div>

          {/* Step 2 Card */}
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C4D43] text-sm font-black text-white">
              2
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              कागज़ की फोटो लें
            </h3>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mt-0.5">
              PHOTOGRAPH YOUR DOCUMENTS
            </span>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              जो दस्तावेज़ आप जमा करने जा रहे हैं, बस उन्हीं की फोटो — कैमरा दिखाएगा कहाँ रखना है।
            </p>
          </div>

          {/* Step 3 Card */}
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C4D43] text-sm font-black text-white">
              3
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              सुनकर ठीक करें
            </h3>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mt-0.5">
              LISTEN & FIX BEFORE SUBMITTING
            </span>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              साफ़ भाषा में सुनें: क्या reject करवा देगा, क्यों, और कैसे ठीक करें — भेजने से पहले।
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: भरोसा कैसे? (Image 2) */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 border-t border-[#EAE3D2] pb-24">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            भरोसा कैसे?
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            हमारे 4 सिद्धांत — ये UI में भी दिखते हैं, हर result के साथ।
          </p>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {/* Principle 1 */}
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
            <div className="text-2xl">⚖️</div>
            <h3 className="mt-3 text-base font-bold text-slate-900">
              फ़ैसला rules करते हैं, AI नहीं
            </h3>
            <span className="text-[10px] font-bold tracking-wider text-[#1C4D43] uppercase block mt-0.5">
              DETERMINISTIC RULES DECIDE — NOT AI
            </span>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
              AI सिर्फ़ कागज़ पढ़ता है। Pass/fail का हर फ़ैसला लिखे हुए, जाँचे हुए नियमों से होता है — अंदाज़े से कभी नहीं।
            </p>
          </div>

          {/* Principle 2 */}
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
            <div className="text-2xl">🔍</div>
            <h3 className="mt-3 text-base font-bold text-slate-900">
              बिना quote, बिना pass
            </h3>
            <span className="text-[10px] font-bold tracking-wider text-[#1C4D43] uppercase block mt-0.5">
              NO QUOTE, NO PASS
            </span>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
              हर flag के साथ वही टेक्स्ट दिखता है जो दस्तावेज़ में पढ़ा गया, और वह नियम जो वह तोड़ता है।
            </p>
          </div>

          {/* Principle 3 */}
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
            <div className="text-2xl">🤷</div>
            <h3 className="mt-3 text-base font-bold text-slate-900">
              नहीं पढ़ सके तो अनुमान नहीं
            </h3>
            <span className="text-[10px] font-bold tracking-wider text-[#1C4D43] uppercase block mt-0.5">
              COULD NOT VERIFY ≠ A GUESS
            </span>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
              अगर कोई value पढ़ी नहीं जा सकी, तो result होगा: &ldquo;could not verify — please check manually&rdquo;।
            </p>
          </div>

          {/* Principle 4 */}
          <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
            <div className="text-2xl">📁</div>
            <h3 className="mt-3 text-base font-bold text-slate-900">
              आपका डेटा कहीं save नहीं होता
            </h3>
            <span className="text-[10px] font-bold tracking-wider text-[#1C4D43] uppercase block mt-0.5">
              NOTHING PERSONAL IS STORED
            </span>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
              सब कुछ memory/temp में process होता है और session खत्म होते ही delete। Demo में mock documents हैं।
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
