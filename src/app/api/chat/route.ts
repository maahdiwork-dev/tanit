import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

import { ApiError, handleApiError, readJsonBody } from "@/lib/server-api";
import { streamTanitAgent } from "@/lib/mastra";

export const dynamic = "force-dynamic";

type ChatRequest = {
  messages?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function extractTextDelta(event: unknown) {
  const record = asRecord(event);
  const payload = asRecord(record?.payload);

  if (!record) {
    return null;
  }

  const type = String(record.type ?? "");
  if (!["text-delta", "text_delta", "text"].includes(type)) {
    return null;
  }

  return firstString(
    record.text,
    record.delta,
    record.textDelta,
    payload?.text,
    payload?.delta,
    payload?.textDelta,
    payload?.content,
  );
}

function extractErrorText(event: unknown) {
  const record = asRecord(event);
  const payload = asRecord(record?.payload);
  const payloadError = asRecord(payload?.error);

  if (record?.type !== "error") {
    return null;
  }

  return (
    firstString(
      record.errorText,
      record.message,
      payload?.message,
      payloadError?.message,
      payloadError?.responseBody,
    ) ?? "Erreur Mastra pendant la génération"
  );
}

function fallbackChatResponse(messages: UIMessage[]) {
  const stream = createUIMessageStream<UIMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID();
      const text =
        "Mode démo Tanit: le service agent n'est pas disponible dans cet environnement. Je peux tout de même guider la démonstration: ouvrez le tableau de bord, lancez un cycle de surveillance, consultez le journal d'audit, puis générez le rapport PDF du cycle.";

      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "Cache-Control": "no-cache",
      "X-Tanit-Mode": "demo-fallback",
    },
  });
}

async function* readMastraSse(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const data = part
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""))
        .join("\n")
        .trim();

      if (!data || data === "[DONE]") {
        continue;
      }

      try {
        yield JSON.parse(data) as unknown;
      } catch {
        continue;
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<ChatRequest>(request);

    if (!Array.isArray(body.messages)) {
      throw new ApiError("Champ requis invalide: messages", 400);
    }

    let mastraResponse: Response;
    try {
      mastraResponse = await streamTanitAgent(body.messages);
    } catch {
      return fallbackChatResponse(body.messages as UIMessage[]);
    }

    if (!mastraResponse.ok || !mastraResponse.body) {
      return fallbackChatResponse(body.messages as UIMessage[]);
    }

    const mastraBody = mastraResponse.body;
    const stream = createUIMessageStream<UIMessage>({
      originalMessages: body.messages as UIMessage[],
      execute: async ({ writer }) => {
        const textId = crypto.randomUUID();
        let finishReason: "stop" | "error" = "stop";

        writer.write({ type: "start" });
        writer.write({ type: "start-step" });
        writer.write({ type: "text-start", id: textId });

        for await (const event of readMastraSse(mastraBody)) {
          const errorText = extractErrorText(event);
          if (errorText) {
            finishReason = "error";
            writer.write({ type: "error", errorText });
            continue;
          }

          const delta = extractTextDelta(event);
          if (delta) {
            writer.write({ type: "text-delta", id: textId, delta });
          }
        }

        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish", finishReason });
      },
      onError: (error) =>
        error instanceof Error ? error.message : "Erreur Mastra chat",
    });

    return createUIMessageStreamResponse({
      stream,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
