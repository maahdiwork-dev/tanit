import type { ReactNode } from "react";

export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[12px] font-medium text-zinc-800 mb-1.5">
        {label}
      </div>
      {children}
      {help ? (
        <div className="text-[11px] text-zinc-400 mt-1.5">{help}</div>
      ) : null}
    </label>
  );
}
