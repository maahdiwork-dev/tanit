export function AstariaMark({
  size = 24,
  withGlow = false,
}: {
  size?: number;
  withGlow?: boolean;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-md ${
        withGlow ? "olive-glow" : ""
      }`}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-md"
        style={{
          background: "linear-gradient(135deg, #4A7C59 0%, #2D4A35 100%)",
        }}
      />
      <svg
        viewBox="0 0 24 24"
        width={size * 0.66}
        height={size * 0.66}
        className="relative"
        fill="none"
        stroke="#A8C4AE"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ transform: "rotate(-25deg)" }}
      >
        <path d="M5 18 C 9 14, 13 10, 19 6" />
        <ellipse
          cx="8.5"
          cy="15.5"
          rx="2.2"
          ry="0.9"
          transform="rotate(45 8.5 15.5)"
          fill="#A8C4AE"
          stroke="none"
        />
        <ellipse
          cx="12"
          cy="12"
          rx="2.2"
          ry="0.9"
          transform="rotate(45 12 12)"
          fill="#A8C4AE"
          stroke="none"
        />
        <ellipse
          cx="15.5"
          cy="8.5"
          rx="2.2"
          ry="0.9"
          transform="rotate(45 15.5 8.5)"
          fill="#A8C4AE"
          stroke="none"
        />
      </svg>
    </div>
  );
}
