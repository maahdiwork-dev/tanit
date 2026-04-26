"use client";

import { Radar, X } from "lucide-react";
import { useEffect } from "react";

export type TanitToastValue = {
  title: string;
  body: string;
} | null;

export function TanitToast({
  toast,
  onDismiss,
}: {
  toast: TanitToastValue;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timeout);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] toast-in">
      <div className="flex items-start gap-3 bg-[#f4f4f5] border border-zinc-300 rounded-lg p-4 pr-5 shadow-2xl max-w-[420px]">
        <div className="w-7 h-7 rounded-md bg-blue-500/15 border border-blue-500/40 grid place-items-center text-blue-600 shrink-0">
          <Radar size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-medium text-zinc-900 mb-0.5">
            Tanit · {toast.title}
          </div>
          <div className="text-[12px] text-zinc-600 leading-relaxed">
            {toast.body}
          </div>
        </div>
        <button onClick={onDismiss} className="text-zinc-500 hover:text-zinc-800">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
