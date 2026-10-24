"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Small "i" button that explains a number: what it is, how it is computed, where it comes from. */
export function InfoTip({ title, children, align = "left" }: { title: string; children: React.ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Penjelasan: ${title}`}
        onClick={() => setOpen((o) => !o)}
        className={`ml-1 grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold leading-none transition ${open ? "bg-detak text-card" : "bg-paper-2 text-ink-2 hover:bg-ink hover:text-card"}`}
      >
        i
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={`absolute top-6 z-30 w-72 rounded-xl border border-line bg-card p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}
        >
          <span className="mb-1 block text-sm font-bold text-ink">{title}</span>
          {children}
        </span>
      ) : null}
    </span>
  );
}
