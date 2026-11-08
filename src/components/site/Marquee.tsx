"use client";

import { useEffect, useRef } from "react";
import { gsap, reducedMotion, ScrollTrigger, setupGsap } from "./motion";

const WORDS = ["Reels", "Cinematic Edits", "Motion Graphics", "Sound Design", "Colour Grading", "Storytelling"];

function Row({ dark = false, reverse = false }: { dark?: boolean; reverse?: boolean }) {
  const items = [...WORDS, ...WORDS];
  return (
    <div
      data-band
      className={`flex w-[110vw] -translate-x-[5vw] overflow-hidden py-3 sm:py-4 ${dark ? "bg-ink-3 text-cream/80" : "bg-sun text-ink"}`}
    >
      <div
        className="flex shrink-0 items-center whitespace-nowrap"
        style={{ animation: `marquee ${dark ? 46 : 38}s linear infinite`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center" aria-hidden={k === 1}>
            {items.map((w, i) => (
              <span key={i} className="font-display flex items-center text-[clamp(1.6rem,4.2vw,3.4rem)]">
                <span className="px-5 sm:px-8">{w}</span>
                <svg viewBox="0 0 24 24" className={`h-5 w-5 sm:h-7 sm:w-7 ${dark ? "text-pink" : "text-magenta"}`} aria-hidden="true">
                  <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12Z" fill="currentColor" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Marquee() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setupGsap();
    if (reducedMotion()) return;
    const bands = root.current!.querySelectorAll<HTMLElement>("[data-band]");
    const skew = gsap.quickTo(bands, "skewX", { duration: 0.5, ease: "power3" });
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => skew(gsap.utils.clamp(-12, 12, self.getVelocity() / -300)),
    });
    return () => st.kill();
  }, []);

  return (
    <div ref={root} aria-hidden="true" className="relative z-[3] -mt-[6svh] flex flex-col gap-6 overflow-hidden py-10 sm:gap-8 sm:py-14">
      {/* Two clearly separated bands moving in opposite directions (no overlap on phones). */}
      <div className="rotate-[1.6deg]">
        <Row dark reverse />
      </div>
      <div className="rotate-[-1.6deg]">
        <Row />
      </div>
    </div>
  );
}
