export function Topbar({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow: string;
}) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <div className="text-[12px] text-zinc-500 mb-1.5">{eyebrow}</div>
        <h1 className="text-[28px] leading-[1.15] font-semibold tracking-tight text-zinc-950">
          {title}
        </h1>
        {subtitle ? (
          <div className="text-[13px] text-zinc-500 mt-1.5">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
