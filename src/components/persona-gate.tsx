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
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-muted" title="Akun demo. Produksi memakai SSO SIPGN.">
      <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-aman" : "bg-line-2"}`} />
      <span className="font-semibold text-ink-2">{TITLE[role]}</span> · akun demo
    </span>
  );
}
