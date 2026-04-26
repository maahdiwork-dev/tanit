export function Sparkline({
  data,
  predicted,
  width = 220,
  height = 56,
  color = "#297CE9",
}: {
  data: number[];
  predicted?: number;
  width?: number;
  height?: number;
  color?: string;
}) {
  const all = predicted != null ? [...data, predicted] : data;
  const min = Math.min(...all) * 0.92;
  const max = Math.max(...all) * 1.05;
  const step = width / Math.max(all.length - 1, 1);
  const y = (value: number) =>
    height - ((value - min) / Math.max(max - min, 1)) * height;
  const ptsActual = data.map((value, i) => `${i * step},${y(value)}`).join(" ");
  const lastIdx = data.length - 1;
  const predX = (lastIdx + 1) * step;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${ptsActual} ${lastIdx * step},${height}`}
        fill="url(#sparkGrad)"
      />
      <polyline points={ptsActual} fill="none" stroke={color} strokeWidth="1.5" />
      {predicted != null && data.length > 0 ? (
        <>
          <line
            x1={lastIdx * step}
            y1={y(data[lastIdx])}
            x2={predX}
            y2={y(predicted)}
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.7"
          />
          <circle cx={predX} cy={y(predicted)} r="3" fill={color} />
          <circle cx={predX} cy={y(predicted)} r="6" fill={color} opacity="0.2" />
        </>
      ) : null}
      {data.map((value, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={y(value)}
          r={i === lastIdx ? 2.5 : 1.8}
          fill={color}
        />
      ))}
    </svg>
  );
}
