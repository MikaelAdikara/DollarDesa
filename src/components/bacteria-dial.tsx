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
  const hand = (frac: number, len: number) => pt(frac % 1, len);
  const [wx, wy] = hand(Math.min(wallFrac, 1.999), 92);
  const [bx, by] = hand(Math.min(ipFrac, 1.999), 108);

  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 300 300" width={size} height={size} role="img" aria-label={`Jam bakteri: ${wallHours.toFixed(1)} jam sejak matang, Indeks Paparan ${fmtIp(ip)}, status ${meta.label}`} className="max-w-full">
        <defs>
          <radialGradient id="dial-steel" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#eef1ed" />
            <stop offset="100%" stopColor="#d9ded7" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={146} fill="#17201a" />
        <circle cx={c} cy={c} r={138} fill="url(#dial-steel)" />
        {/* zones on the bacteria ring: aman < 0.8, waspada 0.8–1.0 */}
        <path d={arc(0, 0.8, R)} stroke="#def0e2" strokeWidth={16} fill="none" />
        <path d={arc(0.8, 1, R)} stroke="#fbf0cf" strokeWidth={16} fill="none" />
        {/* bacteria progress (first lap, then overflow lap in red) */}
        {ipFrac > 0 ? <path d={arc(0, Math.min(ipFrac, 1), R)} stroke={meta.hex} strokeWidth={16} fill="none" strokeLinecap="butt" /> : null}
        {ipFrac > 1 ? <path d={arc(0, Math.min(ipFrac - 1, 1), R - 18)} stroke="#cc3418" strokeWidth={8} fill="none" strokeDasharray="4 3" /> : null}
        {ticks.map((i) => {
          const major = i % 12 === 0;
          const [x0, y0] = pt(i / 48, major ? 96 : 101);
          const [x1, y1] = pt(i / 48, 106);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#17201a" strokeOpacity={major ? 0.8 : 0.3} strokeWidth={major ? 2 : 1} />;
        })}
        {[0, 1, 2, 3].map((h) => {
          const [x, y] = pt(h / 4, 80);
          return (
            <text key={h} x={x} y={y + 4} textAnchor="middle" fontSize="13" fontFamily="var(--font-jetbrains)" fill="#3c4a3e">
              {h === 0 ? "4|0" : `${h}j`}
            </text>
          );
        })}
        {/* wall hand */}
        <line x1={c} y1={c} x2={wx} y2={wy} stroke="#17201a" strokeWidth={5} strokeLinecap="round" />
        {/* bacteria hand */}
        <line x1={c} y1={c} x2={bx} y2={by} stroke={meta.hex} strokeWidth={4} strokeLinecap="round" />
        <circle cx={bx} cy={by} r={6} fill={meta.hex} stroke="#fff" strokeWidth={2} />
        <circle cx={c} cy={c} r={30} fill="#17201a" />
        <text x={c} y={c + 2} textAnchor="middle" fontSize="19" fontWeight={700} fill="#fff" fontFamily="var(--font-bricolage)">
          {fmtIp(ip)}
        </text>
        <text x={c} y={c + 16} textAnchor="middle" fontSize="8" letterSpacing="1.5" fill="#cfd5cc" fontFamily="var(--font-jetbrains)">
          IP
        </text>
      </svg>
      {caption ? (
        <figcaption className="mt-3 grid w-full max-w-xs grid-cols-2 gap-2 text-xs">
          <span className="flex items-center gap-2 text-ink-2">
            <span className="h-1 w-5 rounded bg-ink" /> Jam dinding: <b className="tnum">{fmtH(wallHours)}</b>
          </span>
          <span className="flex items-center gap-2 text-ink-2">
            <span className="h-1 w-5 rounded" style={{ background: meta.hex }} /> Jam bakteri: <b className="tnum">{fmtH(ip * 4)}</b>
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
