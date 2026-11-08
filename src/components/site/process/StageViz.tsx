"use client";

import { useEffect, useRef } from "react";
import { EASE, gsap, reducedMotion, setupGsap } from "../motion";

/**
 * One looping motion piece per production stage, rendered inside a 16:9
 * "program monitor". Plays only while `active`; pauses otherwise.
 *
 *  0 Creative Brief      – moodboard pins + brief notes typing + ticks
 *  1 Footage Analysis    – contact sheet scan, picks get selected
 *  2 Storytelling & Edit – clips fly onto a timeline and snap in order
 *  3 Motion & VFX        – kinetic type builds with handles + keyframes
 *  4 Sound & Color       – before/after grade wipe + live waveform
 *  5 Final Delivery      – export bar, render, delivered stamp + final loop
 */
export function StageViz({ kind, images, active }: { kind: number; images: string[]; active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const k = ((kind % 6) + 6) % 6;
  const img = (i: number) => images[i % Math.max(1, images.length)] ?? "";

  useEffect(() => {
    setupGsap();
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      const t = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6, defaults: { ease: EASE.out } });
      if (k === 0) {
        t.fromTo(q("[data-pin]"), { y: -60, rotate: (i: number) => (i % 2 ? 14 : -14), opacity: 0 }, { y: 0, rotate: (i: number) => [-6, 4, -3, 7][i % 4], opacity: 1, stagger: 0.15, duration: 0.7, ease: EASE.pop })
          .fromTo(q("[data-line]"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", stagger: 0.35, duration: 0.6, ease: "steps(18)" }, 0.5)
          .fromTo(q("[data-tick]"), { scale: 0 }, { scale: 1, stagger: 0.35, duration: 0.35, ease: EASE.pop }, 0.9)
          .to({}, { duration: 1.6 });
      } else if (k === 1) {
        t.fromTo(q("[data-scan]"), { yPercent: -10 }, { yPercent: 1000, duration: 1.4, ease: "none" })
          .to(q("[data-cell]"), { opacity: 0.35, duration: 0.3, stagger: 0.03 }, 0.4)
          .to(q("[data-cell][data-pick]"), { opacity: 1, duration: 0.2 }, 1.3)
          .fromTo(q("[data-sel]"), { scale: 1.3, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.3, duration: 0.4, ease: EASE.pop }, 1.4)
          .fromTo(q("[data-count]"), { textContent: 0 }, { textContent: 3, snap: { textContent: 1 }, duration: 0.9, ease: "none" }, 1.4)
          .to({}, { duration: 1.4 })
          .to(q("[data-cell]"), { opacity: 1, duration: 0.3 });
      } else if (k === 2) {
        t.fromTo(q("[data-clip]"), { x: (i: number) => [-140, 120, -60, 160][i % 4], y: (i: number) => [-120, -150, 140, 110][i % 4], rotate: (i: number) => [-20, 18, -12, 10][i % 4], opacity: 0 }, { x: 0, y: 0, rotate: 0, opacity: 1, stagger: 0.25, duration: 0.8, ease: "back.out(1.4)" })
          .fromTo(q("[data-head]"), { left: "0%" }, { left: "100%", duration: 2.4, ease: "none" }, 0.6)
          .fromTo(q("[data-view]"), { opacity: 0 }, { opacity: 1, stagger: 0.6, duration: 0.15, ease: "none" }, 0.6)
          .to({}, { duration: 0.8 });
      } else if (k === 3) {
        t.fromTo(q("[data-kt]"), { yPercent: 120, rotate: 12, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, stagger: 0.06, duration: 0.6 })
          .fromTo(q("[data-box]"), { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5 }, 0.3)
          .fromTo(q("[data-shape]"), { strokeDashoffset: 300 }, { strokeDashoffset: 0, duration: 1, ease: "power2.inOut" }, 0.4)
          .fromTo(q("[data-key]"), { scale: 0, rotate: 0 }, { scale: 1, rotate: 45, stagger: 0.12, duration: 0.35, ease: EASE.pop }, 0.5)
          .to(q("[data-kt-wrap]"), { scale: 1.06, duration: 0.8, yoyo: true, repeat: 1, ease: "sine.inOut" }, 1.2)
          .to({}, { duration: 0.6 });
      } else if (k === 4) {
        const before = q("[data-before]")[0] as HTMLElement;
        const divider = q("[data-divider]")[0] as HTMLElement;
        const st = { p: 15 };
        t.to(st, {
          p: 85,
          duration: 1.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: 1,
          onUpdate: () => {
            before.style.clipPath = `inset(0 ${100 - st.p}% 0 0)`;
            divider.style.left = `${st.p}%`;
          },
        })
          .fromTo(q("[data-bar]"), { scaleY: 0.15 }, { scaleY: () => gsap.utils.random(0.2, 1), duration: 0.18, stagger: { each: 0.02, repeat: 17, yoyo: true }, ease: "sine.inOut" }, 0)
          .fromTo(q("[data-wheel]"), { rotate: 0 }, { rotate: 160, duration: 3.2, ease: "sine.inOut" }, 0);
      } else {
        t.fromTo(q("[data-prog]"), { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: "power1.inOut" })
          .fromTo(q("[data-pct]"), { textContent: 0 }, { textContent: 100, snap: { textContent: 1 }, duration: 1.8, ease: "power1.inOut" }, 0)
          .fromTo(q("[data-stamp]"), { scale: 2.4, opacity: 0, rotate: -20 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.5, ease: "back.out(2.2)" })
          .fromTo(q("[data-plat]"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.4 }, "-=0.2")
          .to({}, { duration: 1.6 });
      }
      tl.current = t;
      if (reducedMotion()) t.progress(0.7).pause();
    }, el);
    return () => {
      ctx.revert();
      tl.current = null;
    };
  }, [k]);

  useEffect(() => {
    const t = tl.current;
    const v = root.current?.querySelector("video");
    if (!t || reducedMotion()) return;
    if (active) {
      t.restart();
      v?.play().catch(() => {});
    } else {
      t.pause();
      v?.pause();
    }
  }, [active]);

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden bg-ink [container-type:size]" aria-hidden="true">
      {k === 0 && (
        <div className="absolute inset-0 grid grid-cols-[1.2fr_1fr] gap-[3cqw] p-[4cqw]">
          <div className="relative">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                data-pin
                className="absolute w-[46%] bg-cream p-[1.2cqw] pb-[3cqw] shadow-xl"
                style={{ left: `${[2, 50, 8, 48][i]}%`, top: `${[2, 6, 50, 48][i]}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(i * 2)} alt="" className="aspect-video w-full object-cover" />
                <span className="absolute -top-[1cqw] left-1/2 h-[2.4cqw] w-[2.4cqw] -translate-x-1/2 rounded-full bg-magenta shadow" />
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-center gap-[2.2cqw] rounded-[1.6cqw] bg-ink-3/90 p-[3cqw] ring-1 ring-cream/10">
            <p className="font-display text-[4.2cqw] leading-none text-sun">BRIEF</p>
            {["Goal — launch reel", "Audience — 18 to 30", "Mood — high energy", "Refs — 3 · Length 30s"].map((l) => (
              <div key={l} className="flex items-center gap-[1.4cqw]">
                <span data-tick className="grid h-[2.8cqw] w-[2.8cqw] shrink-0 place-items-center rounded-full bg-sun text-[1.8cqw] font-bold text-ink">✓</span>
                <span data-line className="whitespace-nowrap font-mono text-[2.1cqw] text-cream/90">
                  {l}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {k === 1 && (
        <div className="absolute inset-0 p-[3cqw]">
          <div className="relative grid h-full grid-cols-3 grid-rows-3 gap-[1.2cqw]">
            {Array.from({ length: 9 }).map((_, i) => {
              const pick = i === 1 || i === 5 || i === 6;
              return (
                <div key={i} data-cell {...(pick ? { "data-pick": true } : {})} className="relative overflow-hidden rounded-[0.8cqw] bg-ink-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(i + 1)} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-[0.8cqw] top-[0.6cqw] font-mono text-[1.5cqw] text-cream/80">TAKE {String(i + 1).padStart(2, "0")}</span>
                  {pick && (
                    <span data-sel className="absolute inset-0 grid place-items-end rounded-[0.8cqw] p-[0.8cqw] ring-[0.5cqw] ring-inset ring-pink">
                      <span className="rounded-full bg-pink px-[1.2cqw] py-[0.3cqw] text-[1.6cqw] font-bold text-ink">✓ SELECT</span>
                    </span>
                  )}
                </div>
              );
            })}
            <span data-scan className="pointer-events-none absolute inset-x-0 top-0 h-[10%] bg-gradient-to-b from-transparent via-sun/40 to-transparent" />
          </div>
          <span className="absolute bottom-[1cqw] right-[3cqw] rounded-full bg-ink/80 px-[1.4cqw] py-[0.4cqw] font-mono text-[1.7cqw] text-cream">
            selected <span data-count>0</span> / 9
          </span>
        </div>
      )}

      {k === 2 && (
        <div className="absolute inset-0">
          {[0, 1, 2, 3].map((i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} data-view src={img(i + 3)} alt="" className="absolute inset-0 h-[72%] w-full object-cover opacity-0" />
          ))}
          <div className="absolute inset-x-[3cqw] bottom-[3cqw] h-[20%] rounded-[1cqw] bg-ink-3/95 p-[1cqw] ring-1 ring-cream/10">
            <div className="relative flex h-full gap-[0.8cqw]">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} data-clip className="relative h-full flex-1 overflow-hidden rounded-[0.6cqw] ring-1 ring-pink/60" style={{ flexGrow: [1.2, 0.8, 1.4, 1][i] }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(i + 3)} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
              <span data-head className="absolute -bottom-[0.5cqw] -top-[0.5cqw] w-[0.35cqw] bg-sun shadow-[0_0_12px_#fff0a0]" />
            </div>
          </div>
        </div>
      )}

      {k === 3 && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img(7)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="none">
            <circle data-shape cx="122" cy="26" r="13" fill="none" stroke="#f7a3d0" strokeWidth="0.8" strokeDasharray="300" />
            <path data-shape d="M18 72 C 50 60, 70 80, 104 66" fill="none" stroke="#fff0a0" strokeWidth="0.8" strokeDasharray="300" />
          </svg>
          <div data-kt-wrap className="absolute inset-0 grid place-items-center">
            <div className="relative">
              <p className="font-display text-[10cqw] leading-none text-sun">
                {"EVERY FRAME".split("").map((c, i) => (
                  <span key={i} className="reveal-mask">
                    <span data-kt className="inline-block">
                      {c === " " ? " " : c}
                    </span>
                  </span>
                ))}
              </p>
              <span data-box className="absolute -inset-[1.5cqw] border border-dashed border-cream/70">
                {[["-left-[0.7cqw] -top-[0.7cqw]"], ["-right-[0.7cqw] -top-[0.7cqw]"], ["-bottom-[0.7cqw] -left-[0.7cqw]"], ["-bottom-[0.7cqw] -right-[0.7cqw]"]].map(([c]) => (
                  <span key={c} className={`absolute h-[1.4cqw] w-[1.4cqw] bg-cream ${c}`} />
                ))}
              </span>
            </div>
          </div>
          <div className="absolute inset-x-[4cqw] bottom-[3cqw] flex items-center gap-[2cqw] rounded-full bg-ink/80 px-[2cqw] py-[1cqw]">
            <span className="font-mono text-[1.6cqw] text-cream/70">KEYS</span>
            <div className="relative h-px flex-1 bg-cream/30">
              {[8, 30, 52, 74, 92].map((x) => (
                <span key={x} data-key className="absolute top-1/2 h-[1.4cqw] w-[1.4cqw] -translate-y-1/2 bg-pink" style={{ left: `${x}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {k === 4 && (
        <div className="absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[68%] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(2)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: "saturate(1.45) contrast(1.12) hue-rotate(-8deg)" }} />
            {/* "before": the same frame, flat and desaturated, clipped at the wipe line */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-before src={img(2)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: "saturate(0.25) contrast(0.8) brightness(1.08)", clipPath: "inset(0 50% 0 0)" }} />
            <span data-divider className="absolute inset-y-0 w-[0.3cqw] -translate-x-1/2 bg-cream shadow-[0_0_14px_rgba(255,244,220,.9)]" style={{ left: "50%" }} />
            <span className="absolute left-[2cqw] top-[1.5cqw] rounded bg-ink/70 px-[1cqw] font-mono text-[1.6cqw] text-cream">LOG</span>
            <span className="absolute right-[2cqw] top-[1.5cqw] rounded bg-sun px-[1cqw] font-mono text-[1.6cqw] font-bold text-ink">GRADED</span>
          </div>
          <div className="absolute inset-x-[3cqw] bottom-[3cqw] top-[72%] flex items-center gap-[2cqw]">
            <div className="flex h-full flex-1 items-center gap-[0.35cqw]">
              {Array.from({ length: 36 }).map((_, i) => (
                <span key={i} data-bar className="h-full flex-1 origin-center rounded-full" style={{ background: i % 2 ? "#f7a3d0" : "#fff0a0" }} />
              ))}
            </div>
            {["#ff8a5f", "#a457c8", "#5a6fd1"].map((c) => (
              <span key={c} data-wheel className="relative grid h-[7cqw] w-[7cqw] place-items-center rounded-full" style={{ background: `conic-gradient(from 0deg, ${c}, #fff0a0, ${c})` }}>
                <span className="h-[1.4cqw] w-[1.4cqw] translate-x-[1.6cqw] rounded-full bg-ink ring-2 ring-cream" />
              </span>
            ))}
          </div>
        </div>
      )}

      {k === 5 && (
        <div className="absolute inset-0">
          <video src="/reels/loop2.mp4" muted loop playsInline preload="none" poster="/reels/loop2.jpg" className="absolute left-1/2 top-1/2 h-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[1.4cqw] object-cover ring-1 ring-cream/20" style={{ aspectRatio: "9/16" }} />
          <div className="absolute inset-x-[6cqw] bottom-[5cqw]">
            <div className="mb-[1cqw] flex justify-between font-mono text-[1.8cqw] text-cream">
              <span>EXPORT · 4K · H.264</span>
              <span>
                <span data-pct>0</span>%
              </span>
            </div>
            <div className="h-[1cqw] overflow-hidden rounded-full bg-cream/20">
              <span data-prog className="block h-full origin-left bg-gradient-to-r from-pink to-sun" />
            </div>
          </div>
          <span data-stamp className="font-display absolute right-[6cqw] top-[7cqw] rounded-[1cqw] border-[0.5cqw] border-sun px-[2cqw] py-[0.6cqw] text-[4.5cqw] text-sun">
            DELIVERED
          </span>
          <div className="absolute left-[6cqw] top-[7cqw] flex flex-col gap-[1cqw]">
            {["Reels 9:16", "Shorts 9:16", "YouTube 16:9"].map((p) => (
              <span key={p} data-plat className="rounded-full bg-ink/75 px-[1.6cqw] py-[0.6cqw] font-mono text-[1.6cqw] text-cream ring-1 ring-cream/20">
                ✓ {p}
              </span>
            ))}
          </div>
        </div>
      )}
      <span className="scanlines pointer-events-none absolute inset-0" />
    </div>
  );
}
