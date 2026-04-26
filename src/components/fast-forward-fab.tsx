"use client";

import { FastForward, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  fastForwardDemo,
  getDemoState,
  resetDemoStore,
  subscribeToStore,
  type DemoState,
} from "@/lib/demo-mocks";
import { useRoleContext } from "@/lib/role-context";
import {
  TanitToast,
  type TanitToastValue,
} from "@/components/tanit-toast";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function FastForwardFab() {
  const ctx = useRoleContext();
  const [hovered, setHovered] = useState(false);
  const [state, setState] = useState<DemoState | null>(null);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<TanitToastValue>(null);

  const refresh = useCallback(async () => {
    setState(await getDemoState());
  }, []);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refresh();
    }, 0);
    const unsubscribe = subscribeToStore(() => {
      void refresh();
    });
    return () => {
      window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [refresh]);

  if (ctx.role !== "president") return null;

  async function advance() {
    if (running) return;
    setRunning(true);
    try {
      const result = await fastForwardDemo();
      const action = result.actions_fired[0];
      const dateLabel = dateFormatter.format(
        new Date(result.current_simulated_date),
      );
      setToast({
        title: `Simulation · ${dateLabel}`,
        body: action ? action.description : "Cycle avancé de 24h.",
      });
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    resetDemoStore();
    setToast({
      title: "Démo réinitialisée",
      body: "État seed restauré. ENIB attend à nouveau ESG 2024.",
    });
  }

  const dateLabel = state
    ? dateFormatter.format(new Date(state.current_simulated_date))
    : "—";

  return (
    <>
      <div
        className="fixed bottom-6 left-6 z-50 flex items-end gap-3"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered ? (
          <div className="fade-in mb-1 w-[280px] rounded-lg border border-zinc-200 bg-white shadow-2xl p-4">
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-zinc-500 mb-1.5">
              Pilote de démonstration
            </div>
            <div className="font-mono text-[20px] font-semibold text-zinc-950 leading-tight">
              {dateLabel}
            </div>
            <div className="text-[11.5px] text-zinc-500 font-mono mt-0.5">
              Beat #{state?.beat ?? 0}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={advance}
                disabled={running}
                className="h-9 rounded-md text-white font-medium text-[12px] inline-flex items-center justify-center gap-1.5 brand-glow disabled:opacity-70"
                style={{
                  background: "linear-gradient(180deg,#3b82f6, #1B487E)",
                }}
              >
                <FastForward size={12} />
                {running ? "…" : "Avancer"}
              </button>
              <button
                onClick={reset}
                className="h-9 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[12px] text-zinc-700 inline-flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={12} /> Reset
              </button>
            </div>
          </div>
        ) : null}

        <button
          onClick={advance}
          aria-label="Avancer la simulation"
          className="relative inline-grid place-items-center bg-white rounded-full border border-zinc-200 transition-transform hover:scale-105 brand-glow"
          style={{ width: 56, height: 56 }}
        >
          <FastForward size={20} className="text-blue-700" />
        </button>
      </div>

      <TanitToast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
