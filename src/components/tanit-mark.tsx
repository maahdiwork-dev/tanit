export function TanitMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="relative inline-flex items-center justify-center brand-glow rounded-md"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-md"
        style={{
          background: "linear-gradient(135deg, #297CE9 0%, #1B487E 100%)",
        }}
      />
      <svg
        viewBox="0 0 24 24"
        width={size * 0.62}
        height={size * 0.62}
        className="relative"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3 L4 9 L4 21 L20 21 L20 9 Z" />
        <circle cx="12" cy="13" r="3" />
        <path d="M12 10 L12 8 M12 16 L12 18" />
      </svg>
    </div>
  );
}
