import { Markdown } from "@/components/markdown";
import { TanitMark } from "@/components/tanit-mark";

export type ChatMessageValue = {
  role: string;
  content?: string;
  streaming?: boolean;
  parts?: Array<{
    type: string;
    text?: string;
  }>;
};

function messageText(message: ChatMessageValue) {
  if (message.content != null) return message.content;

  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("") ?? ""
  );
}

export function ChatMessage({
  msg,
  streaming,
}: {
  msg: ChatMessageValue;
  streaming?: boolean;
}) {
  const content = messageText(msg);

  if (msg.role === "user") {
    return (
      <div className="flex justify-end fade-in">
        <div className="max-w-[72%] bg-zinc-50 border border-zinc-200 rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] text-zinc-900 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 fade-in">
      <div className="shrink-0">
        <TanitMark size={28} />
      </div>
      <div className="max-w-[80%] pt-0.5">
        <div className="text-[11px] text-zinc-500 mb-1.5 font-mono">Tanit</div>
        <div className="text-[14px] text-zinc-800 leading-[1.7]">
          <Markdown text={content} />
          {(msg.streaming || streaming) && (
            <span className="inline-block w-[8px] h-[14px] bg-blue-500 align-middle ml-0.5 caret" />
          )}
        </div>
      </div>
    </div>
  );
}
