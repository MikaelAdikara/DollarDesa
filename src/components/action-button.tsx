"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const DONE = { hold: "Ditahan", release: "Dilepas", inspect: "Kunjungan dicatat" } as const;

export function ActionButton({ batchId, kind, reason, label, t, tone = "dark", size = "md" }: { batchId: string; kind: "hold" | "release" | "inspect"; reason: string; label: string; t?: string; tone?: "dark" | "light" | "danger" | "night"; size?: "sm" | "md" }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [err, setErr] = useState("");
  const [, start] = useTransition();
  const cls =
    tone === "danger" ? "bg-buang text-card hover:opacity-90" : tone === "dark" ? "bg-ink text-card hover:bg-ink-2" : tone === "night" ? "border border-night-line text-night-ink hover:bg-night-2" : "border border-line bg-card text-ink hover:border-ink/40";
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={state === "busy" || state === "done"}
        onClick={async () => {
          setState("busy");
          const res = await fetch(`/api/batches/${batchId}/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, reason, t }) });
          if (!res.ok) {
            const j = await res.json().catch(() => null);
            setErr(j?.error?.message ?? "Gagal");
            setState("err");
            return;
          }
          setState("done");
          start(() => router.refresh());
        }}
        className={`whitespace-nowrap rounded-full font-semibold transition-colors duration-150 disabled:opacity-70 ${cls} ${size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm"}`}
      >
        {state === "busy" ? "Menyimpan…" : state === "done" ? DONE[kind] : label}
      </button>
      {state === "err" ? <span className="mt-1 text-[11px] text-buang">{err}</span> : null}
    </span>
  );
}
