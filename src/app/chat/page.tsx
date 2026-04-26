"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowRight, MessageSquare, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { ChatMessage } from "@/components/chat-message";
import { CHAT_SUGGESTIONS } from "@/components/tanit-constants";
import { TanitMark } from "@/components/tanit-mark";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
    clearError,
  } = useChat({ transport });
  const streaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (!prefill) return;

    const timeout = window.setTimeout(() => {
      setInput(prefill);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("prefill");
      const query = params.toString();
      router.replace(query ? `/chat?${query}` : "/chat", { scroll: false });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [router, searchParams]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;

    const prompt = text.trim();
    setInput("");
    await sendMessage({ text: prompt });
  }

  return (
    <div className="flex h-full">
      <div className="w-[260px] shrink-0 border-r border-zinc-100 px-3 pt-5 pb-4 hidden md:flex flex-col">
        <button
          onClick={() => {
            setMessages([]);
            clearError();
          }}
          className="h-9 rounded-md border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/80 text-[12.5px] text-zinc-700 inline-flex items-center justify-center gap-2"
        >
          <MessageSquare size={13} /> Nouvelle conversation
        </button>
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400 font-medium mt-6 mb-3 px-2">
          Récentes
        </div>
        <div className="px-2 text-[12px] text-zinc-500 leading-relaxed">
          Vos conversations avec Tanit apparaîtront ici.
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-10 pt-7 pb-5 border-b border-zinc-100 flex items-end justify-between">
          <div>
            <div className="text-[12px] text-zinc-500 mb-1">
              Université de Carthage · Assistant intelligent
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-zinc-950">
              Tanit
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            En ligne · Claude Sonnet 4.6
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-8">
          {messages.length === 0 ? (
            <div className="max-w-[640px] mx-auto pt-10">
              <div className="flex justify-center mb-6">
                <TanitMark size={56} />
              </div>
              <div className="text-center">
                <div className="text-[26px] font-semibold tracking-tight text-zinc-950">
                  Bonjour. Je suis Tanit.
                </div>
                <div className="text-[14px] text-zinc-600 mt-2 leading-relaxed">
                  Posez-moi une question sur les indicateurs de performance des
                  33 établissements UCAR.
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-10">
                {CHAT_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.title}
                    onClick={() => send(suggestion.q)}
                    className="text-left p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/80 transition group"
                  >
                    <div className="text-[12px] font-medium text-blue-600 mb-1.5">
                      {suggestion.title}
                    </div>
                    <div className="text-[12.5px] text-zinc-700 leading-relaxed">
                      {suggestion.body}
                    </div>
                    <div className="mt-3 text-[11px] text-zinc-400 group-hover:text-zinc-600 inline-flex items-center gap-1">
                      Demander <ArrowRight size={11} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-[760px] mx-auto space-y-6">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  msg={{
                    role: message.role,
                    parts: message.parts.flatMap((part) =>
                      part.type === "text"
                        ? [{ type: "text", text: part.text }]
                        : [],
                    ),
                  }}
                  streaming={
                    streaming &&
                    index === messages.length - 1 &&
                    message.role === "assistant"
                  }
                />
              ))}
              {error ? (
                <div className="text-[12px] text-red-600">
                  Erreur de chargement · Réessayer
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-100 px-10 pt-4 pb-6">
          <div className="max-w-[760px] mx-auto">
            {messages.length === 0 ? null : (
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  "Quels établissements n'ont pas soumis ?",
                  "Quel est le taux de réussite moyen ?",
                  "Génère un rapport pour INSAT",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setInput(chip)}
                    className="text-[11.5px] px-2.5 h-7 rounded-full border border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-800"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 bg-white border border-zinc-200 rounded-lg p-2 focus-within:border-zinc-300">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Demandez à Tanit…"
                rows={1}
                className="flex-1 bg-transparent resize-none px-3 py-2 text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none max-h-[200px]"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                className="h-9 w-9 rounded-md inline-grid place-items-center text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    input.trim() && !streaming
                      ? "linear-gradient(180deg,#3b82f6, #1B487E)"
                      : "#27272a",
                }}
              >
                <Send size={15} />
              </button>
            </div>
            <div className="text-[10.5px] text-zinc-400 mt-2 text-center">
              Tanit a accès aux données de 33 établissements UCAR · les réponses
              sont auditées et tracées.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
