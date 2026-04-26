import type { ReactNode } from "react";

export function TanitCard({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-zinc-200/80 rounded-lg ${
        padded ? "p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
