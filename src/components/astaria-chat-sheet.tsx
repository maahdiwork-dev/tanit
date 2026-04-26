"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import { AstariaChatPanel } from "@/components/astaria-chat-panel";
import { AstariaMark } from "@/components/astaria-mark";

export function AstariaChatSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 fade-in"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-[560px] bg-white border-l border-zinc-200 z-50 slide-in-right overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Astaria · Compagnon stratégique"
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-zinc-200 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <AstariaMark size={24} />
            <div className="min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.16em] font-semibold text-[#2D4A35]">
                Compagne stratégique
              </div>
              <div className="text-[14px] font-semibold text-zinc-950 truncate">
                Astaria · Mission verte
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-zinc-500 hover:text-zinc-900 p-1 -m-1 rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <AstariaChatPanel />
        </div>
      </aside>
    </>
  );
}
