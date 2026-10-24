import type { Status } from "@/lib/model/ip";
import { STATUS_META, fmtIp } from "./ui";

/**
 * "Jam bakteri": one dial, two hands, both on the 4-hour scale of the BGN rule.
 *  - Jarum jam dinding: hours since the food was cooked.
 *  - Jarum bakteri: Indeks Paparan × 4 jam (IP 1,0 = the full 4-hour margin used up).
 * When the bacteria hand runs ahead of the wall hand, the 4-hour rule is too generous for this batch.
 */
export function BacteriaDial({ wallHours, ip, status, size = 300, caption = true }: { wallHours: number; ip: number; status: Status; size?: number; caption?: boolean }) {
  const c = 150;
  const R = 118;
  const meta = STATUS_META[status];
  const angle = (frac: number) => frac * 360 - 90;
  const pt = (frac: number, r: number) => {
    const a = (angle(frac) * Math.PI) / 180;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  };
  const arc = (from: number, to: number, r: number) => {
    const span = Math.min(0.9999, Math.max(0, to - from));
    const [x0, y0] = pt(from, r);
    const [x1, y1] = pt(from + span, r);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${span > 0.5 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const wallFrac = Math.max(0, wallHours) / 4;
  const ipFrac = Math.max(0, ip);
  const ticks = Array.from({ length: 48 }, (_, i) => i);
  const deg = (frac: number) => (Math.min(frac, 1.999) % 1) * 360;
  const sweep = { transformOrigin: `${c}px ${c}px`, animation: "dial-sweep 1.4s var(--ease-out) both" } as const;

  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 300 300" width={size} height={size} role="img" aria-label={`Jam bakteri: ${wallHours.toFixed(1)} jam sejak matang, Indeks Paparan ${fmtIp(ip)}, status ${meta.label}`} className="max-w-full">
        <defs>
          <radialGradient id="dial-steel" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="var(--color-card)" />
            <stop offset="70%" stopColor="var(--color-paper-2)" />
            <stop offset="100%" stopColor="var(--color-line)" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={146} fill="var(--color-ink)" />
        <circle cx={c} cy={c} r={138} fill="url(#dial-steel)" />
        {/* zones on the bacteria ring: aman < 0.8, waspada 0.8–1.0 */}
        <path d={arc(0, 0.8, R)} stroke="var(--color-aman-tint)" strokeWidth={16} fill="none" />
        <path d={arc(0.8, 1, R)} stroke="var(--color-waspada-tint)" strokeWidth={16} fill="none" />
        {/* bacteria progress (first lap, then overflow lap in red) */}
        {ipFrac > 0 ? <path d={arc(0, Math.min(ipFrac, 1), R)} pathLength={1} strokeDasharray="1 1" stroke={meta.hex} strokeWidth={16} fill="none" strokeLinecap="butt" style={{ animation: "arc-draw 1.4s var(--ease-out) both" }} /> : null}
        {ipFrac > 1 ? <path d={arc(0, Math.min(ipFrac - 1, 1), R - 18)} stroke="var(--color-buang)" strokeWidth={8} fill="none" strokeDasharray="4 3" /> : null}
        {ticks.map((i) => {
          const major = i % 12 === 0;
          const [x0, y0] = pt(i / 48, major ? 96 : 101);
          const [x1, y1] = pt(i / 48, 106);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--color-ink)" strokeOpacity={major ? 0.8 : 0.3} strokeWidth={major ? 2 : 1} />;
        })}
        {[0, 1, 2, 3].map((h) => {
          const [x, y] = pt(h / 4, 80);
          return (
            <text key={h} x={x} y={y + 4} textAnchor="middle" fontSize="13" fontFamily="var(--font-geist-mono)" fill="var(--color-ink-2)">
              {h === 0 ? "4|0" : `${h}j`}
            </text>
          );
        })}
        {/* wall hand */}
        <g style={{ ...sweep, transform: `rotate(${deg(wallFrac)}deg)` }}>
          <line x1={c} y1={c} x2={c} y2={c - 92} stroke="var(--color-ink)" strokeWidth={5} strokeLinecap="round" />
        </g>
        {/* bacteria hand */}
        <g style={{ ...sweep, transform: `rotate(${deg(ipFrac)}deg)` }}>
          <line x1={c} y1={c} x2={c} y2={c - 108} stroke={meta.hex} strokeWidth={4} strokeLinecap="round" />
          <circle cx={c} cy={c - 108} r={6} fill={meta.hex} stroke="var(--color-card)" strokeWidth={2} />
        </g>
        <circle cx={c} cy={c} r={30} fill="var(--color-ink)" />
        <text x={c} y={c + 2} textAnchor="middle" fontSize="19" fontWeight={700} fill="var(--color-card)" fontFamily="var(--font-funnel-display)">
          {fmtIp(ip)}
        </text>
        <text x={c} y={c + 16} textAnchor="middle" fontSize="8" letterSpacing="1.5" fill="var(--color-line)" fontFamily="var(--font-geist-mono)">
          IP
        </text>
      </svg>
      {caption ? (
        <figcaption className="mt-4 grid w-full max-w-[280px] grid-cols-2 divide-x divide-line border-t border-line pt-3 text-center">
          <span>
            <span className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
              <span className="h-[3px] w-4 rounded bg-ink" /> jam dinding
            </span>
            <span className="mt-0.5 block font-mono text-base tnum">{fmtH(wallHours)}</span>
          </span>
          <span>
            <span className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
              <span className="h-[3px] w-4 rounded" style={{ background: meta.hex }} /> jam bakteri
            </span>
            <span className="mt-0.5 block font-mono text-base tnum">{fmtH(ip * 4)}</span>
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}

function fmtH(h: number) {
  const hh = Math.floor(Math.max(0, h));
  const mm = Math.round((Math.max(0, h) - hh) * 60);
  return `${hh}j ${String(mm).padStart(2, "0")}m`;
}
