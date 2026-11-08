"use client";

import { useEffect, useRef, useState } from "react";
import { enableSfx, hit, whoosh } from "./fx/sfx";
import { markEntered, primeMedia } from "./audio";
import { gsap, markReady, PAUSE_EVENT, reducedMotion, RESUME_EVENT } from "./motion";
import { useSmoothScroll } from "./SmoothScroll";
import { Monogram, PlayIcon, SoundOnIcon } from "./icons";

/**
 * Cinematic "TAP TO ENTER" card shown on every visit. Browsers only allow
 * sound after a user gesture — this one tap is that gesture, so the whole
 * site (intro, reels, cut section) plays WITH sound from then on.
 */
export function EnterGate() {
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const [gone, setGone] = useState(false);
  const { lock } = useSmoothScroll();
  const done = useRef(false);

  useEffect(() => {
    lock(true);
    window.dispatchEvent(new Event(PAUSE_EVENT));
    btn.current?.focus({ preventScroll: true });
    const el = root.current!;
    if (!reducedMotion()) {
      const q = gsap.utils.selector(el);
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.fromTo(q("[data-g-mono]"), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2 })
        .fromTo(q("[data-g-fade]"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 1 }, 0.2)
        .fromTo(q("[data-g-btn]"), { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: "elastic.out(1,0.55)" }, 0.35);
      return () => {
        tl.kill();
      };
    }
  }, [lock]);

  const enter = () => {
    if (done.current) return;
    done.current = true;
    // Still inside the tap → audio + every reel element get permission to play with sound.
    enableSfx();
    primeMedia();
    hit(0.8);
    whoosh(0.9, false);

    const el = root.current!;
    const finish = () => {
      lock(false);
      window.dispatchEvent(new Event(RESUME_EVENT));
      markReady();
      markEntered();
      setGone(true);
    };
    if (reducedMotion()) {
      gsap.to(el, { opacity: 0, duration: 0.3, onComplete: finish });
      return;
    }
    const q = gsap.utils.selector(el);
    gsap
      .timeline({ onComplete: finish })
      .to(q("[data-g-content]"), { scale: 1.08, opacity: 0, duration: 0.35, ease: "power2.in" })
      .fromTo(q("[data-g-flash]"), { opacity: 0.45 }, { opacity: 0, duration: 0.4 }, 0.25)
      .set(q("[data-g-bg]"), { opacity: 0 }, 0.3)
      .to(q("[data-g-half='top']"), { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, 0.3)
      .to(q("[data-g-half='bottom']"), { yPercent: 100, duration: 0.9, ease: "expo.inOut" }, 0.3)
      // hero reveal can begin while the shutters are still opening
      .add(() => markReady(), 0.55);
  };

  if (gone) return null;

  return (
    <div ref={root} className="enter-gate fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-label="Enter the site">
      {/* shutter halves (they split open on enter) */}
      <div data-g-half="top" className="absolute inset-x-0 top-0 h-1/2 bg-ink" />
      <div data-g-half="bottom" className="absolute inset-x-0 bottom-0 h-1/2 bg-ink" />
      <div data-g-bg className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -bottom-[35%] left-1/2 h-[80vh] w-[140vw] -translate-x-1/2 rounded-[50%] opacity-70 blur-[110px]" style={{ background: "radial-gradient(closest-side,#e0559a,#7e3fae 50%,transparent 80%)" }} />
        <div className="scanlines absolute inset-0" />
        {["left-4 top-4 border-l-2 border-t-2", "right-4 top-4 border-r-2 border-t-2", "bottom-4 left-4 border-b-2 border-l-2", "bottom-4 right-4 border-b-2 border-r-2"].map((c) => (
          <span key={c} className={`absolute h-7 w-7 border-cream/50 sm:h-10 sm:w-10 ${c}`} />
        ))}
        <span className="absolute left-6 top-6 flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-cream/70 sm:left-10 sm:top-8 sm:text-[11px]">
          <span className="h-2 w-2 rounded-full bg-[#ff4d6d]" style={{ animation: "blink 1s steps(1) infinite" }} />
          STANDBY
        </span>
        <span className="absolute right-6 top-6 font-mono text-[10px] tracking-[0.25em] text-cream/70 sm:right-10 sm:top-8 sm:text-[11px]">4K · 24FPS</span>
      </div>

      <div data-g-content className="relative flex h-full flex-col items-center justify-center gap-7 px-6 text-center">
        <div data-g-mono>
          <Monogram className="h-20 w-auto drop-shadow-[0_10px_40px_rgba(224,85,154,0.55)] sm:h-28" gradientId="kp-gate" />
        </div>
        <p data-g-fade className="text-[11px] font-bold uppercase tracking-[0.55em] text-cream/80 sm:text-xs">
          Krishna Patil · Showreel
        </p>
        <button
          ref={btn}
          data-g-btn
          type="button"
          onClick={enter}
          className="group relative grid h-[118px] w-[118px] place-items-center rounded-full bg-sun text-ink shadow-[0_20px_70px_-10px_rgba(255,214,107,0.75)] transition-transform duration-500 hover:scale-105 sm:h-[136px] sm:w-[136px]"
          aria-label="Tap to enter with sound"
        >
          <span className="absolute inset-0 rounded-full border-2 border-sun/70" style={{ animation: "pulse-ring 2s ease-out infinite" }} />
          <span className="absolute inset-0 rounded-full border-2 border-sun/50" style={{ animation: "pulse-ring 2s 1s ease-out infinite" }} />
          <PlayIcon className="ml-1.5 h-11 w-11 sm:h-12 sm:w-12" />
        </button>
        <p data-g-fade className="font-display text-[clamp(2rem,7vw,3.4rem)] leading-none text-cream">
          Tap to enter
        </p>
        <p data-g-fade className="flex items-center gap-2 rounded-full border border-cream/20 bg-ink/50 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-cream/80">
          <SoundOnIcon className="h-4 w-4 text-sun" /> Sound on — turn it up
        </p>
      </div>
      <div data-g-flash className="pointer-events-none absolute inset-0 bg-cream opacity-0" />
    </div>
  );
}
