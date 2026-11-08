"use client";

import { useEffect, useRef } from "react";
import { finePointer, gsap, reducedMotion } from "./motion";

/**
 * Desktop-only cursor: a dot plus a ring that swells over interactive
 * elements and shows a label for elements with `data-cursor="…"`.
 * Also powers magnetic pull for `[data-magnetic]` elements.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!finePointer() || reducedMotion()) return;
    const d = dot.current!;
    const r = ring.current!;
    document.documentElement.classList.add("has-cursor");
    gsap.set([d, r], { xPercent: -50, yPercent: -50, opacity: 0 });

    const dx = gsap.quickTo(d, "x", { duration: 0.12, ease: "power3" });
    const dy = gsap.quickTo(d, "y", { duration: 0.12, ease: "power3" });
    const rx = gsap.quickTo(r, "x", { duration: 0.45, ease: "power3" });
    const ry = gsap.quickTo(r, "y", { duration: 0.45, ease: "power3" });

    let magnet: HTMLElement | null = null;
    let current: string | null = null;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      gsap.to([d, r], { opacity: 1, duration: 0.3, overwrite: "auto" });
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);

      const target = e.target as HTMLElement | null;
      const labelled = target?.closest<HTMLElement>("[data-cursor]");
      const interactive = target?.closest("a, button, [role=button], input, textarea, select, label");
      const text = labelled?.dataset.cursor ?? null;
      if (text !== current) {
        current = text;
        if (label.current) label.current.textContent = text ?? "";
        gsap.to(r, {
          width: text ? 92 : interactive ? 54 : 34,
          height: text ? 92 : interactive ? 54 : 34,
          backgroundColor: text ? "rgba(255,240,160,0.95)" : "rgba(255,240,160,0)",
          duration: 0.4,
          ease: "expo.out",
        });
        gsap.to(d, { scale: text ? 0 : 1, duration: 0.3 });
      } else if (!text) {
        gsap.to(r, { width: interactive ? 54 : 34, height: interactive ? 54 : 34, duration: 0.4, overwrite: "auto" });
      }

      // Magnetic pull
      const m = target?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (magnet && magnet !== m) {
        gsap.to(magnet, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
      }
      magnet = m;
      if (m) {
        const b = m.getBoundingClientRect();
        const strength = Number(m.dataset.magnetic) || 0.3;
        gsap.to(m, {
          x: (e.clientX - (b.left + b.width / 2)) * strength,
          y: (e.clientY - (b.top + b.height / 2)) * strength,
          duration: 0.5,
          ease: "power3.out",
        });
      }
    };
    const leave = () => gsap.to([d, r], { opacity: 0, duration: 0.3 });
    const down = () => gsap.to(r, { scale: 0.85, duration: 0.2 });
    const up = () => gsap.to(r, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.5)" });

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <>
      <div
        ref={ring}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[90] hidden h-[34px] w-[34px] items-center justify-center rounded-full border border-sun/70 md:flex"
        style={{ opacity: 0 }}
      >
        <span ref={label} className="tracked text-[9px] font-bold text-ink" style={{ letterSpacing: "0.2em" }} />
      </div>
      <div
        ref={dot}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[91] hidden h-1.5 w-1.5 rounded-full bg-sun md:block"
        style={{ opacity: 0 }}
      />
    </>
  );
}
