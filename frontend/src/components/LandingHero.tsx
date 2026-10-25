"use client";

import React from "react";
import { Language, translations } from "../lib/translations";

interface LandingHeroProps {
  onStart: () => void;
  lang: Language;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onStart, lang }) => {
  return (
    <div className="w-full bg-[#F7F2E8]">
      {/* 1. Hero Section with Notebook Lines ONLY */}
      <section className="w-full notebook-lines border-b border-[#E8E1D3]">
        <div className="mx-auto max-w-6xl px-6 pt-8 pb-8 sm:px-8 lg:px-10">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            {/* Left Column: Copy & CTAs */}
            <div className="lg:col-span-7 space-y-4">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DCD3BE] bg-[#EFE8DA] px-3.5 py-1 text-xs font-medium text-[#645645] shadow-2xs">
                <span>🎙️</span>
                <span>आवाज़ से चलने वाला pre-check</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 leading-[1.2]">
                बार-बार <span className="font-serif italic font-normal text-[#A82020]">reject</span> होने से
                <br />
                पहले,
                <br />
                30 सेकंड में जाँच लें
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-[13px] text-[#5F584C] leading-relaxed max-w-[450px]">
                छात्रवृत्ति, pension, certificate — छोटी-सी गलती (नाम में एक अक्षर, पुराना certificate) और महीनों बर्बाद। हम आपके आवेदन को जमा करने से <strong className="font-bold text-slate-800">पहले</strong> जाँचते हैं — आप बस बोलिए और कागज़ की फोटो दिखाइए।
              </p>

              {/* Hero CTA */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  onClick={onStart}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1F514C] hover:bg-[#18413D] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <span>🎙️</span>
                  <span>माइक दबाएँ — शुरू करें</span>
                </button>
                <span className="text-xs text-[#7B7365] font-normal">
                  बिना लॉगिन • बिना डेटा save • मुफ़्त
                </span>
              </div>
            </div>

            {/* Right Column: Hero Image with tilted demo tag */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[460px]">
                <img
                  src="/hero-paper.png"
                  alt="Documents on desk with mobile scanner"
                  className="w-full h-auto rounded-[24px] shadow-md object-cover"
                />
                {/* Overlapping Demo Tag */}
                <div className="absolute -bottom-3 left-4 sm:left-6 z-10 -rotate-2">
                  <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1 text-xs font-medium text-[#A82020] border border-[#F0B8B8] shadow-xs">
                    <span className="font-bold">डेमो</span>
                    <span className="text-[#C2410C]/80">&nbsp;· mock documents</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Impact Quote Section - Clean Solid #F7F2E8 with NO notebook lines */}
      <section className="w-full bg-[#F7F2E8] border-b border-[#E8E1D3]">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center sm:px-8 lg:px-10">
          <p className="font-serif text-base sm:text-lg text-slate-800">
            &ldquo;एक अक्षर के नाम-mismatch से दो बार{" "}
            <span className="font-serif italic text-slate-800">reject</span> →{" "}
            <span className="font-semibold text-[#1F514C] underline decoration-[#1F514C]/35 underline-offset-4">
              जमा करने से 30 सेकंड पहले पकड़ में आया
            </span>
            &rdquo;
          </p>
          <span className="mt-2 block font-sans text-[10px] font-bold tracking-[0.2em] text-[#877E70] uppercase">
            THE IMPACT WE DEMO FOR
          </span>
        </div>
      </section>

      {/* 3. Section: कैसे चलता है? - Clean Solid #F7F2E8 with NO notebook lines */}
      <section className="w-full bg-[#F7F2E8]">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            कैसे चलता है?
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {/* Step 1 Card: bg-white */}
            <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F514C] text-sm font-black text-white">
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

            {/* Step 2 Card: bg-white */}
            <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F514C] text-sm font-black text-white">
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

            {/* Step 3 Card: bg-white */}
            <div className="rounded-3xl border border-[#EAE5D8] bg-white p-6 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F514C] text-sm font-black text-white">
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
            <span className="text-[10px] font-bold tracking-wider text-[#1F514C] uppercase block mt-0.5">
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
            <span className="text-[10px] font-bold tracking-wider text-[#1F514C] uppercase block mt-0.5">
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
            <span className="text-[10px] font-bold tracking-wider text-[#1F514C] uppercase block mt-0.5">
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
            <span className="text-[10px] font-bold tracking-wider text-[#1F514C] uppercase block mt-0.5">
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
