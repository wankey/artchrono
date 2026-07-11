// 艺时纪 Logo — 时间刻度 × 画笔
// 圆形钟面 + 一条刻度延伸为画笔笔锋
// 品牌色系：时青 #5BB5A2 / 时青墨 #1A3C38

type LogoSize = "sm" | "md" | "lg";

const SIZES: Record<LogoSize, { icon: number; fontSize: number; subSize: number; gap: number }> = {
  sm: { icon: 28, fontSize: 15, subSize: 9, gap: 8 },
  md: { icon: 40, fontSize: 20, subSize: 11, gap: 10 },
  lg: { icon: 56, fontSize: 28, subSize: 14, gap: 14 },
};

export function LogoIcon({ size = "sm", className = "" }: { size?: LogoSize; className?: string }) {
  const s = SIZES[size];
  const r = s.icon / 2;
  const cx = r;
  const cy = r;
  const strokeW = Math.max(1, Math.round(r / 14));

  // 12 条刻度线（每条旋转 30°）
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180); // start at 12 o'clock
    const inner = r * 0.78;
    const outer = r * 0.92;
    const x1 = cx + inner * Math.cos(angle);
    const y1 = cy + inner * Math.sin(angle);
    const x2 = cx + outer * Math.cos(angle);
    const y2 = cy + outer * Math.sin(angle);

    // 2 o'clock (index 4) → extend as brush stroke
    if (i === 2) {
      const tipR = r * 1.5;
      const tipX = cx + tipR * Math.cos(angle);
      const tipY = cy + tipR * Math.sin(angle);
      const cpX = cx + r * 1.25 * Math.cos(angle - 0.25);
      const cpY = cy + r * 1.25 * Math.sin(angle - 0.25);
      return (
        <g key={i}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={strokeW} strokeLinecap="round" />
          <path
            d={`M${x2},${y2} Q${cpX},${cpY} ${tipX},${tipY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeW * 0.7}
            strokeLinecap="round"
          />
        </g>
      );
    }

    return (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={strokeW} strokeLinecap="round" />
    );
  });

  return (
    <svg
      viewBox={`0 0 ${s.icon} ${s.icon}`}
      width={s.icon}
      height={s.icon}
      className={className}
      fill="none"
    >
      <circle cx={cx} cy={cy} r={r * 0.85} stroke="currentColor" strokeWidth={strokeW * 0.5} fill="none" opacity={0.3} />
      {ticks}
      <circle cx={cx} cy={cy} r={r * 0.06} fill="currentColor" />
    </svg>
  );
}

export function LogoFull({ size = "md", className = "" }: { size?: LogoSize; className?: string }) {
  const s = SIZES[size];
  return (
    <div className={`flex items-center ${className}`}>
      <LogoIcon size={size} />
      <div className="ml-[var(--gap)]" style={{ "--gap": `${s.gap}px` } as React.CSSProperties}>
        <div className="font-bold tracking-wide leading-none" style={{ fontSize: s.fontSize, color: "#1A3C38" }}>
          艺时纪
        </div>
        <div className="tracking-wider" style={{ fontSize: s.subSize, color: "#5BB5A2", marginTop: "2px" }}>
          ArtChrono
        </div>
      </div>
    </div>
  );
}
