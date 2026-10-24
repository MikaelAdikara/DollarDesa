import QRCode from "qrcode";
import { fmtClock } from "@/lib/pilot/clock";
import type { BatchState } from "@/lib/pilot/engine";

/** QR generator needs a literal hex; it mirrors --color-ink. */
const QR_INK = "#1a221b";

/** The thermal label the SPPG prints and tapes on each delivery box. Parents and teachers scan it. */
export async function BatchLabel({ s, origin }: { s: BatchState; origin: string }) {
  const url = `${origin}/cek/${s.id}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: QR_INK, light: "#00000000" } });
  const b = s.batch;
  return (
    <div className="label-thermal mx-auto w-full max-w-[300px] px-5 py-6 text-[12px] leading-snug text-ink shadow-[0_10px_30px_-18px_oklch(21%_0.02_145/0.5)]">
      <div className="flex items-baseline justify-between">
        <span className="font-bold tracking-widest">DETAK · MBG</span>
        <span>{b.serviceDate}</span>
      </div>
      <div className="my-2 border-t border-dashed border-ink/50" />
      <p className="font-bold">{b.school.name}</p>
      <p>{b.kitchen.name}</p>
      <p>
        {b.school.portions} porsi · {b.menu.split(",")[1]?.trim()}
      </p>
      <div className="my-3 flex items-center gap-3">
        <div className="h-24 w-24 shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="text-[11px]">
          <p>Matang {fmtClock(b.cookedAt, b.tzOffset)}</p>
          <p>Batas 4 jam {fmtClock(s.rule4hAt, b.tzOffset)}</p>
          <p>Makan {fmtClock(b.mealAt, b.tzOffset)}</p>
          <p className="mt-1 font-bold">Pindai sebelum dibagikan</p>
        </div>
      </div>
      <div className="border-t border-dashed border-ink/50 pt-2 text-[10px]">ID {s.id}</div>
    </div>
  );
}
