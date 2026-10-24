"use client";

import { useEffect, useState } from "react";

const TITLE = { sppg: "Petugas SPPG", sekolah: "Guru piket", dinas: "Satgas MBG Dinkes", bgn: "Tim Kendali BGN" } as const;

/** Demo sign-in: entering a portal assumes that portal's role. Production uses SIPGN SSO. */
export function PersonaGate({ role }: { role: keyof typeof TITLE }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fetch("/api/persona", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) })
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, [role]);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-2">
      <span className={`h-2 w-2 rounded-full ${ready ? "bg-aman" : "bg-line"}`} />
      Masuk sebagai <b>{TITLE[role]}</b> <span className="text-muted">(akun demo)</span>
    </span>
  );
}
