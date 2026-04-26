"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TanitMark } from "@/components/tanit-mark";

export function TanitDock({
  question,
  hint = "Tanit · Assistant",
}: {
  question: string;
  hint?: string;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  function ask() {
    router.push(`/chat?prefill=${encodeURIComponent(question)}`);
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-end gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered ? (
        <div className="fade-in mb-1 w-[300px] rounded-lg border border-zinc-200 bg-white shadow-2xl p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-zinc-500 mb-1.5">
            {hint}
          </div>
          <div className="text-[13px] text-zinc-800 leading-relaxed mb-3">
            {question}
          </div>
          <button
            onClick={ask}
            className="w-full h-9 rounded-md text-white font-medium text-[12.5px] inline-flex items-center justify-center gap-1.5 brand-glow"
            style={{ background: "linear-gradient(180deg,#3b82f6, #1B487E)" }}
          >
            Demander à Tanit
            <ArrowRight size={12} />
          </button>
        </div>
      ) : null}

      <button
        onClick={ask}
        aria-label="Ouvrir Tanit"
        className="relative inline-grid place-items-center bg-white rounded-full border border-zinc-200 transition-transform hover:scale-105 brand-glow"
        style={{ width: 56, height: 56 }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full ring-expand"
          style={{ background: "rgba(41,124,233,0.18)" }}
        />
        <span className="relative">
          <TanitMark size={32} />
        </span>
      </button>
    </div>
  );
}
