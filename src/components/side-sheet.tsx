"use client";

import { useEffect, type ReactNode } from "react";

export function SideSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 fade-in"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 bottom-0 w-[480px] bg-white border-l border-zinc-200 z-50 slide-in-right overflow-y-auto">
        {children}
      </aside>
    </>
  );
}
