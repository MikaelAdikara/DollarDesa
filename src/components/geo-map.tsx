import geo from "@/lib/geo/indonesia.json";

type Feature = { c: "T" | "S" | "R"; p: string | null; r: number[][][] };
const FEATURES = (geo as { features: Feature[] }).features;

export const CLUSTER_FILL = { T: "var(--color-buang)", S: "var(--color-waspada)", R: "var(--color-aman)" } as const;

export interface MapPoint {
  id: string;
  lon: number;
  lat: number;
  color: string;
  r?: number;
  label?: string;
  href?: string;
  ring?: boolean;
}

/**
 * Equirectangular SVG map built from the province polygons of the DETAK poster.
 * `focus` limits the view to a bounding box; `mode` decides how land is painted.
 */
export function GeoMap({
  bbox = [94.5, -11.2, 141.2, 6.2],
  mode = "cluster",
  highlight,
  points = [],
  height = 360,
  label,
}: {
  bbox?: [number, number, number, number];
  mode?: "cluster" | "plain";
  highlight?: string;
  points?: MapPoint[];
  height?: number;
  label: string;
}) {
  const [x0, y0, x1, y1] = bbox;
  const W = 1000;
  const H = Math.round((W * (y1 - y0)) / (x1 - x0));
  const sx = (lon: number) => ((lon - x0) / (x1 - x0)) * W;
  const sy = (lat: number) => ((y1 - lat) / (y1 - y0)) * H;
  const inView = (f: Feature) => f.r.some((ring) => ring.some(([lo, la]) => lo >= x0 - 1 && lo <= x1 + 1 && la >= y0 - 1 && la <= y1 + 1));
  const d = (f: Feature) => f.r.map((ring) => "M" + ring.map(([lo, la]) => `${sx(lo).toFixed(1)},${sy(la).toFixed(1)}`).join("L") + "Z").join("");
  const pr = (W / (x1 - x0)) * 0.06;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: height }} className="h-auto w-full" role="img" aria-label={label}>
      <rect width={W} height={H} fill="var(--color-paper-2)" rx={10} />
      {FEATURES.filter(inView).map((f, i) => {
        const isHi = highlight ? f.p === highlight : false;
        const fill = mode === "cluster" ? CLUSTER_FILL[f.c] : isHi ? "var(--color-card)" : "var(--color-paper-2)";
        return <path key={i} d={d(f)} fill={fill} stroke={mode === "cluster" ? "var(--color-card)" : "var(--color-line-2)"} strokeWidth={mode === "cluster" ? 0.6 : 0.8} opacity={mode === "plain" && highlight && !isHi ? 0.7 : 1} />;
      })}
      {points.map((p) => {
        const cx = sx(p.lon);
        const cy = sy(p.lat);
        const r = (p.r ?? 1) * Math.max(3, Math.min(9, pr));
        const dot = (
          <g key={p.id}>
            {p.ring ? <circle cx={cx} cy={cy} r={r * 2.1} fill="none" stroke={p.color} strokeWidth={2} opacity={0.55} /> : null}
            <circle cx={cx} cy={cy} r={r} fill={p.color} stroke="#fff" strokeWidth={1.2}>
              {p.label ? <title>{p.label}</title> : null}
            </circle>
          </g>
        );
        return p.href ? (
          <a key={p.id} href={p.href} aria-label={p.label}>
            {dot}
          </a>
        ) : (
          dot
        );
      })}
    </svg>
  );
}

export const PROVINCE_BBOX: Record<string, [number, number, number, number]> = {
  DIY: [110.0, -8.25, 110.85, -7.52],
  SUMBAR: [98.9, -3.45, 101.95, 0.95],
  PAPUA: [134.9, -3.4, 141.05, -0.45],
};
