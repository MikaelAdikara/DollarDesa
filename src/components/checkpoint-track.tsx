import { fmtClock } from "@/lib/pilot/clock";
import type { BatchState } from "@/lib/pilot/engine";
import { CHECKPOINTS, type Checkpoint } from "@/lib/pilot/sim";

/** Four checkpoint dots with times: filled = recorded, red ring = due but missing, hollow = not yet due. */
export function CheckpointTrack({ s, compact = false }: { s: BatchState; compact?: boolean }) {
  const b = s.batch;
  const planned: Record<Checkpoint, number> = { 1: b.cookedAt, 2: b.departAt, 3: b.arriveAt, 4: b.mealAt - 5 * 60_000 };
  const rec = new Map(s.readings.filter((r) => !r.assumed).map((r) => [r.checkpoint, r]));
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Empat titik cek">
      {([1, 2, 3, 4] as Checkpoint[]).map((cp) => {
        const r = rec.get(cp);
        const missing = s.missing.includes(cp);
        const state = r ? "rec" : missing ? "miss" : "future";
        return (
          <li key={cp} className="relative">
            <div className="flex items-center">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                  state === "rec" ? "bg-daun text-card" : state === "miss" ? "border-2 border-buang text-buang" : "border-2 border-line text-muted"
                }`}
                title={CHECKPOINTS[cp].label}
              >
                {cp}
              </span>
              {cp < 4 ? <span className={`ml-1 h-0.5 flex-1 ${state === "rec" ? "bg-daun" : "bg-line"}`} /> : null}
            </div>
            {!compact ? (
              <p className="mt-1 text-[11px] leading-tight text-muted">
                {CHECKPOINTS[cp].short}
                <br />
                <span className="font-mono tnum text-ink-2">{r ? `${r.foodC.toFixed(1).replace(".", ",")}°` : fmtClock(planned[cp], b.tzOffset)}</span>
                {missing ? <span className="block font-semibold text-buang">tidak tercatat</span> : null}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Vertical timeline: the four checkpoints plus the meal, read top to bottom like a flight itinerary. */
export function CheckpointTimeline({ s, now }: { s: BatchState; now: number }) {
  const b = s.batch;
  const planned: Record<Checkpoint, number> = { 1: b.cookedAt, 2: b.departAt, 3: b.arriveAt, 4: b.mealAt - 5 * 60_000 };
  const rec = new Map(s.readings.filter((r) => !r.assumed).map((r) => [r.checkpoint, r]));
  const rows = ([1, 2, 3, 4] as Checkpoint[]).map((cp) => {
    const r = rec.get(cp);
    const missing = s.missing.includes(cp);
    return { key: String(cp), at: r ? r.at : planned[cp], title: CHECKPOINTS[cp].short, who: CHECKPOINTS[cp].who, temp: r ? `${r.foodC.toFixed(1).replace(".", ",")}°C` : null, state: r ? "rec" : missing ? "miss" : ("future" as "rec" | "miss" | "future") };
  });
  const meal = { key: "meal", at: b.mealAt, title: "Jam makan", who: `${b.school.portions} porsi`, temp: null, state: now >= b.mealAt ? ("rec" as const) : ("future" as const) };
  const all = [...rows, meal];
  return (
    <ol aria-label="Titik cek batch" className="relative">
      {all.map((x, i) => {
        const last = i === all.length - 1;
        const dot = x.state === "rec" ? "bg-daun border-daun" : x.state === "miss" ? "bg-card border-buang" : "bg-card border-line-2";
        return (
          <li key={x.key} className="relative grid grid-cols-[52px_20px_minmax(0,1fr)_auto] items-start gap-x-3 pb-5 last:pb-0">
            <span className={`pt-px font-mono text-sm tnum ${x.state === "future" ? "text-muted" : "text-ink"}`}>{fmtClock(x.at, b.tzOffset)}</span>
            <span className="relative flex justify-center self-stretch">
              {!last ? <span aria-hidden className={`absolute top-4 -bottom-5 w-0.5 ${x.state === "rec" ? "bg-daun" : "bg-line"}`} /> : null}
              <span className={`relative mt-1 h-3 w-3 rounded-full border-2 ${dot} ${x.key === "meal" ? "h-3.5 w-3.5 rounded-[4px]" : ""}`} />
            </span>
            <span className="min-w-0">
              <span className={`block text-[15px] font-semibold ${x.state === "future" ? "text-ink-2" : ""}`}>{x.title}</span>
              <span className="block truncate text-xs text-muted">{x.state === "miss" ? <b className="font-semibold text-buang">tidak tercatat · diganti asumsi</b> : x.who}</span>
            </span>
            <span className="font-mono text-[15px] tnum">{x.temp ?? (x.state === "future" ? <span className="text-xs text-muted">terjadwal</span> : null)}</span>
          </li>
        );
      })}
    </ol>
  );
}
