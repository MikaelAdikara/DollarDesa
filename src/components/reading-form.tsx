"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Cp = 1 | 2 | 3 | 4;
const CP_LABEL: Record<Cp, string> = { 1: "Matang (dapur)", 2: "Berangkat", 3: "Tiba di sekolah", 4: "Pra-konsumsi" };

export function ReadingForm({ batchId, checkpoints, suggestedCp, ambientC, t }: { batchId: string; checkpoints: Cp[]; suggestedCp: Cp; ambientC: number; t?: string }) {
  const router = useRouter();
  const [cp, setCp] = useState<Cp>(suggestedCp);
  const [food, setFood] = useState("");
  const [amb, setAmb] = useState(ambientC.toFixed(1));
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const foodC = Number(food.replace(",", "."));
    const ambientC = Number(amb.replace(",", "."));
    if (!Number.isFinite(foodC)) return setMsg({ tone: "err", text: "Isi suhu makanan dari termometer tusuk, contoh 58,4." });
    const res = await fetch(`/api/batches/${batchId}/readings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checkpoint: cp, foodC, ambientC, t }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = json?.error?.details?.[0]?.message;
      return setMsg({ tone: "err", text: `${json?.error?.message ?? "Gagal menyimpan"}${detail ? `: ${detail}` : ""}` });
    }
    const ip = json.data.ip.atMeal as number;
    const st = json.data.status.atMeal as string;
    setMsg({ tone: "ok", text: `Tercatat ${food}°C pada titik ${CP_LABEL[cp]}. IP saat makan ${ip.toFixed(2).replace(".", ",")} (${st}).` });
    setFood("");
    start(() => router.refresh());
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <fieldset className="flex flex-wrap gap-1.5">
        <legend className="sr-only">Titik cek</legend>
        {checkpoints.map((c) => (
          <button type="button" key={c} onClick={() => setCp(c)} aria-pressed={cp === c} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${cp === c ? "bg-ink text-white" : "bg-steel-2 text-ink-2"}`}>
            {c}. {CP_LABEL[c]}
          </button>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-xs font-semibold text-ink-2">
          Suhu makanan (°C)
          <input inputMode="decimal" required value={food} onChange={(e) => setFood(e.target.value)} placeholder="58,4" className="rounded-xl border border-line bg-white px-3 py-3 font-mono text-2xl tnum" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-ink-2">
          Suhu ruang (sensor)
          <input inputMode="decimal" required value={amb} onChange={(e) => setAmb(e.target.value)} className="rounded-xl border border-line bg-steel px-3 py-3 font-mono text-2xl tnum" />
        </label>
      </div>
      <p className="text-xs text-muted">Jam dicatat otomatis oleh server (di lapangan: jam CCTV/sensor), bukan diketik petugas.</p>
      <button disabled={pending} className="rounded-xl bg-daun py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Menghitung ulang…" : "Simpan suhu"}
      </button>
      {msg ? (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.tone === "ok" ? "bg-aman-tint text-aman" : "bg-buang-tint text-buang"}`}>
          {msg.text}
        </p>
      ) : null}
    </form>
  );
}
