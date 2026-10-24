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
                  state === "rec" ? "bg-daun text-white" : state === "miss" ? "border-2 border-buang text-buang" : "border-2 border-line text-muted"
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
