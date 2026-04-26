import ReactMarkdown from "react-markdown";

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={index} className="font-semibold text-zinc-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (/^`[^`]+`$/.test(part)) {
      return (
        <code
          key={index}
          className="font-mono text-[12.5px] text-blue-700 bg-blue-500/10 px-1 py-0.5 rounded"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function MarkdownTable({ rows }: { rows: string[] }) {
  const cells = rows.map((row) =>
    row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim()),
  );
  const header = cells[0] ?? [];
  const body = cells.slice(2);

  return (
    <div className="mb-3 last:mb-0 border border-zinc-200 rounded-md overflow-hidden">
      <div
        className="grid bg-zinc-100/80"
        style={{ gridTemplateColumns: `repeat(${header.length}, 1fr)` }}
      >
        {header.map((heading, i) => (
          <div
            key={`${heading}-${i}`}
            className="px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-600 font-medium border-r border-zinc-200 last:border-r-0"
          >
            <InlineMarkdown text={heading} />
          </div>
        ))}
      </div>
      {body.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid border-t border-zinc-200"
          style={{ gridTemplateColumns: `repeat(${header.length}, 1fr)` }}
        >
          {row.map((cell, cellIndex) => (
            <div
              key={`${cell}-${cellIndex}`}
              className="px-3 py-2 text-[12.5px] text-zinc-700 border-r border-zinc-200 last:border-r-0"
            >
              <InlineMarkdown text={cell} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MarkdownBlock({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold text-zinc-950">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="font-mono text-[12.5px] text-blue-700 bg-blue-500/10 px-1 py-0.5 rounded">
            {children}
          </code>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 last:mb-0 space-y-1.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 last:mb-0 space-y-1.5">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex gap-2">
            <span className="text-blue-500 mt-[3px]">•</span>
            <span>{children}</span>
          </li>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function Markdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const blocks: Array<{ type: "markdown"; text: string } | { type: "table"; rows: string[] }> =
    [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    const block: string[] = [];
    while (i < lines.length && !lines[i].trim().startsWith("|")) {
      block.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "markdown", text: block.join("\n") });
  }

  return blocks.map((block, index) =>
    block.type === "table" ? (
      <MarkdownTable key={index} rows={block.rows} />
    ) : (
      <MarkdownBlock key={index} text={block.text} />
    ),
  );
}
