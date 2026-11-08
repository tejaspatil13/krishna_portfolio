"use client";

import { useEffect, useRef } from "react";
import type { SiteContent } from "@/lib/types";
import { finePointer, gsap, onReady, reducedMotion, ScrollTrigger, setupGsap } from "./motion";
import { useSmoothScroll } from "./SmoothScroll";
import { SplitText } from "./SplitText";
import { ArrowIcon } from "./icons";

// Deterministic "dust / stars" in the upper sky.
const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: (i * 73.13) % 100,
  y: (i * 37.7) % 42,
  r: ((i * 7) % 3) * 0.35 + 0.35,
  o: 0.25 + ((i * 13) % 10) / 20,
}));

export function Hero({ hero }: { hero: SiteContent["hero"] }) {
  const root = useRef<HTMLElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    setupGsap();
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const reduce = reducedMotion();

    const ctx = gsap.context(() => {
      if (reduce) return;
      // Pre-hide intro elements (prevents a flash before the preloader ends).
      gsap.set(q("[data-char]"), { y: 0, yPercent: 120, rotate: 6 });
      gsap.set(q("[data-hero-fade]"), { opacity: 0, y: 24 });
      gsap.set(q("[data-layer='sky']"), { scale: 1.35 });
      gsap.set(q("[data-layer='sun']"), { yPercent: 40 });
      gsap.set(q("[data-vf]"), { opacity: 0, scale: 1.08 });
    }, el);

    onReady(() => {
      if (reduce) return;
      ctx.add(() => {
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.to(q("[data-layer='sky']"), { scale: 1, duration: 2.6, ease: "power3.out" }, 0)
          .to(q("[data-layer='sun']"), { yPercent: 0, duration: 2.4, ease: "power3.out" }, 0)
          .to(q("[data-vf]"), { opacity: 1, scale: 1, duration: 1.6 }, 0.5)
          .to(q("[data-hero-fade]"), { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, 0.35)
          .to(q("[data-char]"), { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.022 }, 0.45);
      });
    });

    // Scroll: camera push-in, then the frame closes into a rounded card.
    ctx.add(() => {
      if (reduce) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 },
        defaults: { ease: "none" },
      });
      tl.to(q("[data-layer='sky']"), { scale: 1.18 }, 0)
        .to(q("[data-layer='sun']"), { yPercent: 28 }, 0)
        .to(q("[data-layer='far']"), { yPercent: -6, scale: 1.08 }, 0)
        .to(q("[data-layer='near']"), { yPercent: -12, scale: 1.14 }, 0)
        .to(q("[data-hero-content]"), { yPercent: -18, opacity: 0, ease: "power1.in" }, 0)
        .to(q("[data-vf]"), { opacity: 0 }, 0)
        .fromTo(
          q("[data-frame]"),
          { clipPath: "inset(0% 0% 0% 0% round 0px)" },
          { clipPath: "inset(7% 5% 7% 5% round 36px)", ease: "power2.inOut" },
          0.15,
        )
        .to(q("[data-frame-dim]"), { opacity: 0.55 }, 0.3);
    });

    // Pointer parallax on desktop.
    let off: (() => void) | undefined;
    if (finePointer() && !reduce) {
      const layers = q("[data-depth]") as HTMLElement[];
      const setters = layers.map((l) => ({
        d: Number(l.dataset.depth),
        x: gsap.quickTo(l, "x", { duration: 1.2, ease: "power3" }),
        y: gsap.quickTo(l, "y", { duration: 1.2, ease: "power3" }),
      }));
      const move = (e: PointerEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        setters.forEach((s) => {
          s.x(nx * s.d);
          s.y(ny * s.d * 0.5);
        });
      };
      window.addEventListener("pointermove", move, { passive: true });
      off = () => window.removeEventListener("pointermove", move);
    }

    // Running timecode while the hero is visible.
    let raf = 0;
    const t0 = performance.now();
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      const f = Math.floor((t % 1) * 24);
      const s = Math.floor(t);
      if (tcRef.current) tcRef.current.textContent = `00:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`;
      raf = requestAnimationFrame(tick);
    };
    const vis = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        cancelAnimationFrame(raf);
        if (self.isActive && !reduce) raf = requestAnimationFrame(tick);
      },
    });

    return () => {
      ctx.revert();
      off?.();
      vis.kill();
      cancelAnimationFrame(raf);
    };
  }, []);

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollTo(href);
  };

  return (
    <section
      ref={root}
      id="top"
      aria-label="Introduction"
      className="relative h-[150svh] sm:h-[175svh] motion-reduce:h-[100svh] motion-reduce:sm:h-[100svh]"
    >
      <div className="sticky top-0 h-[100svh] min-h-[560px] overflow-hidden">
        <div data-frame className="absolute inset-0 overflow-hidden will-change-[clip-path]">
          {/* Sky */}
          <div data-layer="sky" className="absolute inset-0 origin-[50%_60%]" style={{ background: "var(--sunset)" }}>
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              {STARS.map((s, i) => (
                <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="#fff4dc" opacity={s.o} />
              ))}
            </svg>
          </div>

          {/* Sun with synthwave cut lines */}
          <div data-depth="14" className="absolute inset-0">
            <div
              className="absolute left-1/2 top-[61%] aspect-square w-[clamp(260px,46vw,620px)] sm:top-[56%]"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <div
                data-layer="sun"
                className="h-full w-full rounded-full"
                style={{
                  background: "linear-gradient(180deg,#fff7c4 0%,#ffe08a 30%,#ffb46e 62%,#ff7e8a 100%)",
                  boxShadow: "0 0 120px 30px rgba(255,190,120,0.35), 0 0 260px 80px rgba(255,120,150,0.25)",
                  WebkitMaskImage:
                    "linear-gradient(180deg,#000 52%,transparent 52%),repeating-linear-gradient(180deg,#000 0 12px,transparent 12px 18px)",
                  maskImage:
                    "linear-gradient(180deg,#000 52%,transparent 52%),repeating-linear-gradient(180deg,#000 0 12px,transparent 12px 18px)",
                }}
              />
            </div>
          </div>

          {/* Far ridge + skyline */}
          <div data-depth="24" className="absolute inset-0">
            <svg
              data-layer="far"
              className="absolute bottom-[26%] left-[-5%] h-[26%] w-[110%] origin-bottom"
              viewBox="0 0 1440 300"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M0 300V190l90-40 70 30 110-80 90 50 80-30 120 70 70-20 60-60 70 40 100-90 120 100 80-30 110 60 90-40 100 50 90-30v180z"
                fill="#8a3f93"
                opacity=".75"
              />
              <g fill="#5d2b78">
                <rect x="70" y="150" width="26" height="150" />
                <rect x="100" y="110" width="34" height="190" />
                <rect x="138" y="170" width="22" height="130" />
                <rect x="164" y="90" width="30" height="210" />
                <rect x="198" y="140" width="40" height="160" />
                <rect x="1180" y="130" width="30" height="170" />
                <rect x="1214" y="80" width="26" height="220" />
                <rect x="1244" y="150" width="40" height="150" />
                <rect x="1290" y="115" width="24" height="185" />
              </g>
              <g fill="#ffd27a" opacity=".55">
                {[110, 122, 172, 182, 1222, 1230, 1252, 1298].map((x, i) => (
                  <rect key={i} x={x} y={130 + ((i * 29) % 90)} width="3" height="4" />
                ))}
              </g>
            </svg>
          </div>

          {/* Sea + reflection */}
          <div data-depth="34" className="absolute inset-x-0 bottom-0 h-[27%]">
            <div
              data-layer="near"
              className="absolute inset-0 origin-bottom"
              style={{ background: "linear-gradient(180deg,#6a2f86 0%,#3a1b55 45%,#160d1f 100%)" }}
            >
              <div
                className="absolute left-1/2 top-0 h-full w-[min(70vw,640px)] -translate-x-1/2"
                style={{
                  background:
                    "repeating-linear-gradient(180deg, rgba(255,214,130,.85) 0 3px, transparent 3px 11px)",
                  WebkitMaskImage: "radial-gradient(50% 90% at 50% 0%, #000 0%, transparent 75%)",
                  maskImage: "radial-gradient(50% 90% at 50% 0%, #000 0%, transparent 75%)",
                  animation: "shimmer 3.5s ease-in-out infinite alternate",
                }}
              />
              <div className="absolute inset-x-0 top-0 h-px bg-[#ffcf86]/60" />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-ink via-ink/75 to-transparent sm:h-[38%]" />
          <div className="scanlines absolute inset-0" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(12,9,16,.7) 100%)" }}
          />
          <div data-frame-dim className="pointer-events-none absolute inset-0 bg-ink opacity-0" />
        </div>

        {/* Viewfinder overlay */}
        <div data-vf aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-4 top-[84px] sm:inset-x-8 sm:bottom-8 sm:top-[104px]">
          {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-b-2 border-l-2", "right-0 bottom-0 border-b-2 border-r-2"].map(
            (c) => (
              <span key={c} className={`absolute h-6 w-6 border-cream/70 sm:h-9 sm:w-9 ${c}`} />
            ),
          )}
          <div className="absolute left-4 top-3 flex items-center gap-2 text-[10px] font-semibold tracking-[0.25em] text-cream/85 sm:left-6 sm:top-4 sm:text-[11px]">
            <span className="h-2 w-2 rounded-full bg-[#ff4d6d]" style={{ animation: "blink 1.2s steps(1) infinite" }} />
            REC
          </div>
          <div className="absolute right-4 top-3 text-[10px] font-semibold tracking-[0.25em] text-cream/85 sm:right-6 sm:top-4 sm:text-[11px]">
            4K · 24FPS
          </div>
          <div className="absolute bottom-3 left-4 hidden font-mono text-[11px] tracking-[0.15em] text-cream/80 sm:left-6 sm:bottom-4 sm:block">
            TC <span ref={tcRef}>00:00:00:00</span>
          </div>
          <div className="absolute bottom-4 right-6 hidden text-[11px] font-semibold tracking-[0.25em] text-cream/70 lg:block">
            ISO 800 · 35MM
          </div>
        </div>

        {/* Content */}
        <div
          data-hero-content
          className="relative z-[2] mx-auto flex h-full max-w-[1500px] flex-col items-center px-5 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-[clamp(7.5rem,17svh,11rem)] text-center sm:px-10 sm:pb-16"
        >
          <p data-hero-fade className="tracked mb-3 text-[11px] font-bold text-cream/90 sm:mb-5 sm:text-[13px]">
            {hero.eyebrow}
          </p>
          <SplitText
            as="h1"
            text={hero.headline}
            className="max-w-[16ch] text-balance text-[clamp(2.15rem,7.2vw,6.4rem)] font-extrabold uppercase leading-[0.98] tracking-[0.07em] text-cream drop-shadow-[0_6px_30px_rgba(60,20,90,0.35)] sm:max-w-[18ch]"
          />

          <div className="flex-1" />

          <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-end md:justify-between md:text-left">
            <div className="max-w-[460px]">
              <p data-hero-fade className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-pink sm:text-xs">
                {hero.designation}
              </p>
              <p data-hero-fade className="text-[15px] leading-relaxed text-cream/85 sm:text-[17px]">
                {hero.description}
              </p>
            </div>
            <div data-hero-fade className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a
                href="#work"
                onClick={go("#work")}
                data-magnetic="0.25"
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-sun px-7 text-[15px] font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,214,107,0.7)] transition-colors hover:bg-cream"
              >
                {hero.primaryCta}
                <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <a
                href="#contact"
                onClick={go("#contact")}
                data-magnetic="0.25"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-cream/40 bg-ink/20 px-7 text-[15px] font-semibold text-cream backdrop-blur-md transition-colors hover:border-sun hover:text-sun"
              >
                {hero.secondaryCta}
              </a>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="absolute bottom-6 left-1/2 z-[2] hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
          <span className="tracked text-[10px] text-cream/60">Scroll</span>
          <span className="relative h-10 w-px overflow-hidden bg-cream/20">
            <span className="absolute inset-x-0 top-0 h-1/2 bg-sun" style={{ animation: "scrollcue 1.8s ease-in-out infinite" }} />
          </span>
        </div>
      </div>
    </section>
  );
}
