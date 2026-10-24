"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface TourStep {
  /** Matches an element with data-tour="<target>". */
  target: string;
  title: string;
  body: React.ReactNode;
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 10;

/**
 * Spotlight walkthrough: everything except the current element is dimmed, a card explains
 * what the element shows and how to read it. Opens once per page (remembered in localStorage)
 * and can be replayed from the "Panduan" button.
 */
export function Tour({ id, steps, autoStart = true }: { id: string; steps: TourStep[]; autoStart?: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const key = `detak-tour-${id}-v1`;

  useEffect(() => {
    if (!autoStart) return;
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "done";
    } catch {}
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 700);
      return () => clearTimeout(t);
    }
  }, [autoStart, key]);

  const close = useCallback(() => {
    setOpen(false);
    setI(0);
    try {
      localStorage.setItem(key, "done");
    } catch {}
  }, [key]);

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${steps[i]?.target}"]`);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [i, steps]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${steps[i]?.target}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (el) {
      const r = el.getBoundingClientRect();
      const fits = r.height < window.innerHeight - 260;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: fits ? "center" : "start" });
    }
    measure();
    const t = setTimeout(measure, 450);
    let raf = 0;
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    nextBtn.current?.focus({ preventScroll: true });
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, i, measure, steps]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, steps.length]);

  const step = steps[i];
  const cardW = 360;
  let cardStyle: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (rect && typeof window !== "undefined") {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = vh - (rect.top + rect.height);
    const above = rect.top;
    const right = vw - (rect.left + rect.width);
    const left = Math.min(Math.max(12, rect.left), vw - cardW - 12);
    if (below > 230) cardStyle = { left, top: rect.top + rect.height + 12 };
    else if (above > 230) cardStyle = { left, top: Math.max(12, rect.top - 12), transform: "translateY(-100%)" };
    else if (right > cardW + 24) cardStyle = { left: rect.left + rect.width + 12, top: Math.max(12, Math.min(rect.top, vh - 280)) };
    else cardStyle = { left: Math.max(12, (vw - cardW) / 2), bottom: 16 };
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setI(0);
          setOpen(true);
        }}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition hover:bg-daun"
      >
        <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-detak text-[11px] font-bold">?</span>
        Panduan layar ini
      </button>
      {open && step ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="tour-title">
          {rect ? (
            <div
              aria-hidden
              className="pointer-events-none fixed rounded-2xl ring-4 ring-detak transition-all duration-300"
              style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgba(10,14,11,0.74)" }}
            />
          ) : (
            <div aria-hidden className="fixed inset-0 bg-[rgba(10,14,11,0.74)]" />
          )}
          <div className="fixed inset-0" onClick={close} aria-hidden />
          <div className="fixed w-[min(360px,calc(100vw-24px))] rounded-2xl bg-white p-5 shadow-2xl" style={cardStyle}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-detak">
                Langkah {i + 1} dari {steps.length}
              </p>
              <button type="button" onClick={close} className="text-xs font-semibold text-muted hover:text-ink">
                Lewati
              </button>
            </div>
            <h2 id="tour-title" className="mt-2 font-display text-xl font-bold leading-tight">
              {step.title}
            </h2>
            <div className="mt-2 text-sm leading-relaxed text-ink-2">{step.body}</div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1" aria-hidden>
                {steps.map((_, k) => (
                  <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-detak" : "w-1.5 bg-line"}`} />
                ))}
              </div>
              <div className="flex gap-2">
                {i > 0 ? (
                  <button type="button" onClick={() => setI(i - 1)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-2 hover:bg-steel">
                    Kembali
                  </button>
                ) : null}
                <button ref={nextBtn} type="button" onClick={() => (i === steps.length - 1 ? close() : setI(i + 1))} className="rounded-lg bg-daun px-4 py-1.5 text-sm font-semibold text-white hover:bg-daun-2">
                  {i === steps.length - 1 ? "Selesai" : "Lanjut"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
