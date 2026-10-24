"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const DONE = { hold: "Ditahan", release: "Dilepas", inspect: "Kunjungan dicatat" } as const;

export function ActionButton({ batchId, kind, reason, label, t, tone = "dark", size = "md" }: { batchId: string; kind: "hold" | "release" | "inspect"; reason: string; label: string; t?: string; tone?: "dark" | "light" | "danger"; size?: "sm" | "md" }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [err, setErr] = useState("");
  const [, start] = useTransition();
  const cls = tone === "danger" ? "bg-buang text-white hover:bg-[#a92a12]" : tone === "dark" ? "bg-ink text-white hover:bg-ink-2" : "border border-line bg-white text-ink hover:border-ink/40";
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
        className={`rounded-lg font-semibold transition disabled:opacity-70 ${cls} ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"}`}
      >
        {state === "busy" ? "Menyimpan…" : state === "done" ? DONE[kind] : label}
      </button>
      {state === "err" ? <span className="mt-1 text-[11px] text-buang">{err}</span> : null}
    </span>
  );
}
