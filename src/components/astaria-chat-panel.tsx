"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AstariaMark } from "@/components/astaria-mark";
import { TanitCard } from "@/components/tanit-card";

const SUGGESTIONS = [
  {
    title: "État de la mission",
    prompt: "Quel est l'état actuel de la mission GreenMetric?",
  },
  {
    title: "Propositions en attente",
    prompt: "Quelles sont les propositions en attente de ma décision?",
  },
  {
    title: "Catégorie Eau",
    prompt:
      "Que recommandez-vous pour améliorer notre score sur la catégorie Eau (WR)?",
  },
];

const WELCOME_MESSAGE =
  "Madame la Présidente, j'ai trois propositions en attente et un blocage à signaler. Voulez-vous commencer par les propositions, ou avez-vous une question?";

type Role = "user" | "assistant";

type DisplayMessage = {
  id: string;
  role: Role;
  content: string;
};

export function AstariaChatPanel() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/astaria/chat" }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const streaming = status === "streaming" || status === "submitted";

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for prefill events from the category sheet
  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") setInput(detail);
    }
    window.addEventListener("astaria_prefill", onPrefill);
    return () => window.removeEventListener("astaria_prefill", onPrefill);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const prompt = text.trim();
    setInput("");
    await sendMessage({ text: prompt });
  }

  const display: DisplayMessage[] = useMemo(() => {
    const list: DisplayMessage[] = [];
    if (messages.length === 0) {
      list.push({
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
      });
    }
    for (const message of messages) {
      const text = message.parts
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join("");
      list.push({
        id: message.id,
        role: message.role === "user" ? "user" : "assistant",
        content: text,
      });
    }
    return list;
  }, [messages]);

  return (
    <section id="astaria-chat" className="scroll-mt-24">
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#2D4A35]">
          Compagne stratégique
        </div>
        <div className="font-display italic text-[18px] text-zinc-700 mt-1">
          posez une question sur la mission verte
        </div>
      </div>

      <TanitCard padded={false} className="overflow-hidden bg-astaria-soft">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-7 py-5 border-b border-[#4A7C59]/20 bg-white/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <AstariaMark size={36} withGlow />
            <div>
              <div className="text-[16px] font-semibold tracking-tight text-[#2D4A35]">
                Astaria
              </div>
              <div className="text-[12px] text-zinc-700">
                Compagnon stratégique · Mission verte UCAR
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono px-2.5 py-1.5 rounded-full bg-[#A8C4AE]/30 border border-[#4A7C59]/30 text-[#2D4A35]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] pulse-dot" />
            En ligne · Mission #688 → top 500
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="px-7 py-6 max-h-[480px] min-h-[280px] overflow-y-auto space-y-4"
        >
          {display.map((msg, index) => {
            const isAstaria = msg.role === "assistant";
            const isStreamingThis =
              streaming &&
              isAstaria &&
              index === display.length - 1 &&
              msg.id !== "welcome";
            return (
              <div
                key={msg.id}
                className={`flex ${
                  isAstaria ? "justify-start" : "justify-end"
                }`}
              >
                {isAstaria ? (
                  <div className="max-w-[80%]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AstariaMark size={20} />
                      <span className="text-[11px] font-medium text-[#2D4A35]">
                        Astaria
                      </span>
                    </div>
                    <div className="rounded-lg rounded-tl-sm bg-white border border-[#4A7C59]/20 px-4 py-3 text-[13.5px] leading-relaxed text-zinc-800 olive-glow">
                      {msg.content || (isStreamingThis ? "" : msg.content)}
                      {isStreamingThis ? (
                        <span className="inline-flex gap-1 ml-1.5 align-middle">
                          <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                          <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                          <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[80%]">
                    <div className="rounded-lg rounded-tr-sm bg-zinc-100 border border-zinc-200 px-4 py-3 text-[13.5px] leading-relaxed text-zinc-900">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {streaming &&
          display.length > 0 &&
          display[display.length - 1].role === "user" ? (
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div className="flex items-center gap-2 mb-1.5">
                  <AstariaMark size={20} />
                  <span className="text-[11px] font-medium text-[#2D4A35]">
                    Astaria
                  </span>
                </div>
                <div className="rounded-lg rounded-tl-sm bg-white border border-[#4A7C59]/20 px-4 py-3 text-[13.5px] text-zinc-500 olive-glow">
                  <span className="italic">Astaria consulte les données…</span>
                  <span className="inline-flex gap-1 ml-1.5 align-middle">
                    <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                    <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                    <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="text-[12.5px] text-red-700 italic">
              Je rencontre une difficulté à accéder aux données. Je réessaie.
            </div>
          ) : null}
        </div>

        {/* Suggestion chips on empty state */}
        {messages.length === 0 ? (
          <div className="px-7 pb-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.title}
                onClick={() => send(s.prompt)}
                className="text-[11.5px] px-3 h-8 rounded-full border border-[#4A7C59]/30 bg-white hover:bg-[#A8C4AE]/20 text-[#2D4A35] font-medium transition"
              >
                {s.title}
              </button>
            ))}
          </div>
        ) : null}

        {/* Input */}
        <div className="px-7 py-4 border-t border-[#4A7C59]/20 bg-white/60 backdrop-blur">
          <div className="flex items-end gap-2 bg-white border border-[#4A7C59]/30 rounded-lg p-2 focus-within:border-[#4A7C59]">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Demander à Astaria…"
              rows={1}
              className="flex-1 bg-transparent resize-none px-3 py-2 text-[13.5px] text-zinc-900 placeholder-zinc-400 focus:outline-none max-h-[160px]"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || streaming}
              className="h-9 w-9 rounded-md inline-grid place-items-center text-white disabled:opacity-40 disabled:cursor-not-allowed olive-glow"
              style={{
                background:
                  input.trim() && !streaming
                    ? "linear-gradient(180deg,#4A7C59, #2D4A35)"
                    : "#71717a",
              }}
            >
              <Send size={15} />
            </button>
          </div>
          <div className="text-[10.5px] text-zinc-500 mt-2 text-center">
            Astaria suit la mission #688 → top 500 · ses propositions sont
            tracées dans le journal d&apos;audit.
          </div>
        </div>
      </TanitCard>
    </section>
  );
}
