"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/lib/types";
import { DUR, EASE, ENTER, gsap, reducedMotion, replayOnEnter, ScrollTrigger, setupGsap, STAGGER } from "./motion";
import { useSmoothScroll } from "./SmoothScroll";
import { StageViz } from "./process/StageViz";

const TOOLS = [
  ["Brief", "Moodboard", "References"],
  ["Selects", "Bins", "Best takes"],
  ["Timeline", "Pacing", "Story beats"],
  ["Kinetic type", "Keyframes", "VFX"],
  ["SFX", "Mix", "Colour grade"],
  ["4K export", "Platform cuts", "QC"],
];
const TRACK_CLIPS = {
  V2: [[4, 10], [22, 9], [47, 14], [70, 8]],
  V1: [[0, 17], [17, 12], [29, 20], [49, 15], [64, 18], [82, 18]],
};

const pad2 = (n: number) => String(Math.floor(n)).padStart(2, "0");

export function Process({ process, images }: { process: SiteContent["process"]; images: string[] }) {
  const root = useRef<HTMLElement>(null);
  const studio = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [studioOn, setStudioOn] = useState(false);
  const [stacked, setStacked] = useState(false); // reduced motion → stacked layout everywhere
  const [visible, setVisible] = useState<boolean[]>([]);
  const { scrollTo } = useSmoothScroll();
  const steps = process.steps;
  const n = steps.length;
  const words = process.intro.split(/\s+/).filter(Boolean);

  // Header + scroll-lit intro (replays on entry)
  useEffect(() => {
    setupGsap();
    const reduce = reducedMotion();
    if (reduce) setStacked(true); // eslint-disable-line react-hooks/set-state-in-effect
    if (reduce) return;
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      const head = gsap
        .timeline()
        .fromTo(q("[data-pr-eyebrow]"), { opacity: 0, letterSpacing: "0.9em" }, { opacity: 1, letterSpacing: "0.4em", duration: DUR.slow })
        .fromTo(q("[data-pr-head] [data-w]"), { yPercent: 110 }, { yPercent: 0, stagger: STAGGER.words, duration: DUR.base }, 0.05);
      replayOnEnter(q("[data-pr-head]")[0], head, { start: "top 85%" });
      gsap.fromTo(
        q("[data-intro-word]"),
        { opacity: 0.16 },
        { opacity: 1, stagger: 0.08, ease: EASE.none, scrollTrigger: { trigger: q("[data-intro]")[0], start: "top 80%", end: "bottom 45%", scrub: 0.5 } },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  // DESKTOP STUDIO — pinned; scroll drives the playhead and the active stage
  useEffect(() => {
    if (reducedMotion()) return;
    const el = studio.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const play = q("[data-st-play]")[0] as HTMLElement;
      const tc = q("[data-st-tc]")[0] as HTMLElement;
      let last = -1;
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: () => `+=${n * window.innerHeight * 0.8}`,
        pin: true,
        anticipatePin: 1,
        onToggle: (self) => setStudioOn(self.isActive),
        onUpdate: (self) => {
          const p = self.progress;
          play.style.left = `${p * 100}%`;
          const secs = p * 48;
          tc.textContent = `00:00:${pad2(secs)}:${pad2((secs % 1) * 24)}`;
          const idx = Math.min(n - 1, Math.floor(p * n));
          if (idx !== last) {
            last = idx;
            setCurrent(idx);
          }
        },
      });
      // panel arrives like a window opening
      gsap.fromTo(q("[data-st-panel]"), { scale: 0.92, opacity: 0.4 }, { scale: 1, opacity: 1, ease: EASE.none, scrollTrigger: { trigger: el, start: "top 90%", end: "top top", scrub: true } });
      return () => st.kill();
    });
    return () => mm.revert();
  }, [n]);

  // Stage change → film-strip wipe across the monitor, detail text reveal
  useEffect(() => {
    const el = studio.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline();
    tl.fromTo(q("[data-st-strip]"), { x: 0, xPercent: -110 }, { xPercent: 110, duration: 0.75, ease: "power3.inOut" })
      .fromTo(q("[data-st-num]"), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7 }, 0.15)
      .fromTo(q("[data-st-detail] [data-w]"), { yPercent: 110 }, { yPercent: 0, stagger: 0.03, duration: 0.6 }, 0.2)
      .fromTo(q("[data-st-desc], [data-st-tools] > *"), ENTER, { y: 0, opacity: 1, stagger: 0.05, duration: 0.6 }, 0.3);
    return () => {
      tl.kill();
    };
  }, [current]);

  // MOBILE / stacked — each card's visual plays while it's on screen
  useEffect(() => {
    const cards = root.current!.querySelectorAll<HTMLElement>("[data-stage-card]");
    const io = new IntersectionObserver(
      (entries) =>
        setVisible((prev) => {
          const next = [...prev];
          entries.forEach((e) => (next[Number((e.target as HTMLElement).dataset.stageCard)] = e.intersectionRatio > 0.45));
          return next;
        }),
      { threshold: [0, 0.45, 0.8] },
    );
    cards.forEach((c) => io.observe(c));
    let ctx: gsap.Context | undefined;
    if (!reducedMotion()) {
      ctx = gsap.context(() => {
        cards.forEach((c) => {
          const tl = gsap
            .timeline()
            .fromTo(c.querySelector("[data-sc-num]"), { yPercent: 50, opacity: 0 }, { yPercent: 0, opacity: 1, duration: DUR.base })
            .fromTo(c.querySelectorAll("[data-sc-fade]"), ENTER, { y: 0, opacity: 1, stagger: STAGGER.items, duration: DUR.base }, 0.1)
            .fromTo(c.querySelector("[data-sc-monitor]"), { clipPath: "inset(0 100% 0 0 round 16px)" }, { clipPath: "inset(0 0% 0 0 round 16px)", duration: DUR.slow, ease: EASE.inOut }, 0.15);
          replayOnEnter(c, tl, { start: "top 85%" });
        });
        gsap.fromTo(
          root.current!.querySelector("[data-progress-y]"),
          { scaleY: 0 },
          { scaleY: 1, ease: EASE.none, scrollTrigger: { trigger: root.current!.querySelector("[data-stack]"), start: "top 70%", end: "bottom 70%", scrub: 0.4 } },
        );
      }, root);
    }
    return () => {
      io.disconnect();
      ctx?.revert();
    };
  }, [stacked, n]);

  const jumpTo = (i: number) => {
    const st = ScrollTrigger.getAll().find((t) => t.trigger === studio.current && t.pin);
    if (!st) return;
    scrollTo(st.start + ((i + 0.5) / n) * (st.end - st.start), { duration: 1.2 });
  };

  const stage = steps[current] ?? steps[0];

  return (
    <section ref={root} id="process" aria-labelledby="process-title" className="relative overflow-hidden bg-ink pt-24 sm:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full opacity-30 blur-[140px]" style={{ background: "radial-gradient(closest-side,#e04a92,transparent)" }} />
      <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8">
        <p data-pr-eyebrow className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-cream/60 sm:text-sm">
          {process.eyebrow}
        </p>
        <h2 id="process-title" data-pr-head aria-label={process.headline} className="max-w-[15ch] text-[clamp(2.6rem,6.6vw,5.6rem)] font-bold leading-[1.02] tracking-[-0.01em] text-pink">
          {process.headline.split(/\s+/).map((w, i) => (
            <span key={i} aria-hidden="true" className="reveal-mask mr-[0.25em]">
              <span data-w className="inline-block">
                {w}
              </span>
            </span>
          ))}
        </h2>
        <p data-intro className="text-glow mt-8 max-w-[38ch] text-[clamp(1.35rem,2.7vw,2.35rem)] font-semibold leading-[1.28] sm:mt-10">
          {words.map((w, i) => (
            <span key={i} data-intro-word className="inline">
              {w}{" "}
            </span>
          ))}
        </p>
      </div>

      {/* ============ DESKTOP: interactive editing studio (pinned) ============ */}
      {!stacked && (
        <div ref={studio} className="relative hidden h-[100svh] lg:block">
          <div className="mx-auto flex h-full max-w-[1440px] flex-col px-6 pb-[5vh] pt-[11vh]">
            <div data-st-panel className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-line bg-ink-2 shadow-[0_50px_140px_-50px_rgba(224,74,146,0.55)]">
              {/* title bar */}
              <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                <span className="flex gap-1.5">
                  {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                    <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />
                  ))}
                </span>
                <span className="font-mono text-[12px] tracking-[0.12em] text-cream/60">SHOWREEL_FINAL_v12 — Krishna Patil Studio</span>
                <span className="ml-auto flex items-center gap-2 font-mono text-[12px] text-cream/80">
                  <span className="h-2 w-2 rounded-full bg-[#ff4d6d]" style={{ animation: "blink 1s steps(1) infinite" }} />
                  <span data-st-tc>00:00:00:00</span>
                </span>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_300px] xl:grid-cols-[250px_1fr_330px]">
                {/* stage list */}
                <ol className="flex flex-col gap-1 overflow-hidden border-r border-line p-3">
                  {steps.map((s, i) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => jumpTo(i)}
                        aria-current={i === current ? "step" : undefined}
                        className={`relative w-full overflow-hidden rounded-xl px-3 py-2.5 text-left transition-colors ${i === current ? "bg-cream/10" : "hover:bg-cream/5"}`}
                      >
                        <span className={`font-display mr-2 text-[18px] ${i <= current ? "text-pink" : "text-cream/30"}`}>{String(i + 1).padStart(2, "0")}</span>
                        <span className={`text-[13px] font-medium ${i === current ? "text-sun" : "text-cream/70"}`}>{s.title}</span>
                        <span className="absolute inset-x-3 bottom-1 h-[2px] overflow-hidden rounded-full bg-cream/10">
                          <span className="block h-full origin-left bg-gradient-to-r from-pink to-sun transition-transform duration-500" style={{ transform: `scaleX(${i < current ? 1 : i === current ? 0.5 : 0})` }} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>

                {/* program monitor */}
                <div className="flex min-h-0 flex-col items-center justify-center gap-2 bg-black/40 p-4">
                  <div className="flex w-full items-center justify-between font-mono text-[11px] tracking-[0.15em] text-cream/50">
                    <span>PROGRAM</span>
                    <span>
                      STAGE {String(current + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="relative aspect-video max-h-full w-full overflow-hidden rounded-xl ring-1 ring-cream/15">
                    {steps.map((s, i) => (
                      <div key={s.id} className="absolute inset-0 transition-opacity duration-300" style={{ opacity: i === current ? 1 : 0 }}>
                        <StageViz kind={i} images={images} active={studioOn && i === current} />
                      </div>
                    ))}
                    {/* film-strip wipe between stages */}
                    <div data-st-strip className="pointer-events-none absolute inset-y-0 -left-[10%] z-[2] flex w-[120%]" style={{ transform: "translateX(-110%)" }} aria-hidden="true">
                      <div className="flex h-full w-full flex-col justify-between bg-ink py-1">
                        {[0, 1].map((r) => (
                          <div key={r} className="flex gap-2 px-2">
                            {Array.from({ length: 28 }).map((_, j) => (
                              <span key={j} className="h-2.5 w-3.5 rounded-[2px] bg-cream/70" />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* stage detail */}
                <div data-st-detail className="flex min-h-0 flex-col justify-center gap-4 border-l border-line p-6">
                  <span data-st-num className="font-display text-[clamp(4rem,7vw,6.5rem)] leading-none text-transparent" style={{ WebkitTextStroke: "2px #f7a3d0" }}>
                    {String(current + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[clamp(1.4rem,2vw,1.9rem)] font-bold leading-tight text-sun" aria-label={stage.title}>
                    {stage.title.split(/\s+/).map((w, i) => (
                      <span key={`${current}-${i}`} aria-hidden="true" className="reveal-mask mr-[0.25em]">
                        <span data-w className="inline-block">
                          {w}
                        </span>
                      </span>
                    ))}
                  </h3>
                  <p data-st-desc className="text-[15px] leading-relaxed text-cream/80">
                    {stage.description}
                  </p>
                  <div data-st-tools className="flex flex-wrap gap-2">
                    {TOOLS[current % 6].map((t) => (
                      <span key={t} className="rounded-full border border-cream/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream/75">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* timeline */}
              <div className="relative border-t border-line bg-black/30 px-4 pb-3 pt-2">
                <div className="relative ml-10">
                  <div className="flex h-4 items-end justify-between">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <span key={i} className={`w-px bg-cream/25 ${i % 8 === 0 ? "h-3" : "h-1.5"}`} />
                    ))}
                  </div>
                  <div className="absolute inset-x-0 top-0 flex h-4">
                    {steps.map((s, i) => (
                      <span key={s.id} className={`flex-1 border-l text-[9px] font-semibold uppercase tracking-[0.1em] ${i === current ? "border-sun text-sun" : "border-cream/20 text-cream/35"}`}>
                        &nbsp;{String(i + 1).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {(["V2", "V1"] as const).map((track) => (
                    <div key={track} className="flex items-center gap-2">
                      <span className="w-8 font-mono text-[10px] text-cream/50">{track}</span>
                      <div className="relative h-7 flex-1 rounded bg-cream/5">
                        {TRACK_CLIPS[track].map(([x, w], i) => (
                          <span
                            key={i}
                            className="absolute inset-y-0.5 overflow-hidden rounded-[4px] ring-1 ring-black/40"
                            style={{ left: `${x}%`, width: `${w}%`, background: track === "V1" ? `center/cover url(${images[(i + 2) % Math.max(1, images.length)]})` : "linear-gradient(90deg,#a457c8,#e0559a)" }}
                          >
                            {track === "V2" && <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-cream">TITLE</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(["A1", "A2"] as const).map((track, ti) => (
                    <div key={track} className="flex items-center gap-2">
                      <span className="w-8 font-mono text-[10px] text-cream/50">{track}</span>
                      <div className="flex h-6 flex-1 items-center gap-[2px] rounded bg-cream/5 px-1">
                        {Array.from({ length: 90 }).map((_, i) => (
                          <span key={i} className="flex-1 rounded-full" style={{ height: `${(20 + Math.abs(Math.sin(i * (0.37 + ti * 0.21))) * 70).toFixed(1)}%`, background: ti ? "#fff0a0" : "#f7a3d0", opacity: 0.75 }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* playhead */}
                <div className="pointer-events-none absolute inset-y-0 left-[3.5rem] right-4">
                  <span data-st-play className="absolute inset-y-1 w-[2px] bg-sun shadow-[0_0_14px_#fff0a0]" style={{ left: "0%" }}>
                    <span className="absolute -left-[5px] top-0 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-sun" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ MOBILE / stacked: vertical production timeline ============ */}
      <div className={`relative mx-auto mt-14 max-w-[720px] px-5 pb-24 sm:px-8 ${stacked ? "" : "lg:hidden"}`}>
        <ol data-stack className="relative flex flex-col gap-10">
          <span aria-hidden="true" className="absolute bottom-6 left-[15px] top-6 w-px bg-cream/15">
            <span data-progress-y className="absolute inset-0 origin-top bg-gradient-to-b from-pink via-coral to-sun" />
          </span>
          {steps.map((s, i) => (
            <li key={s.id} data-stage-card={i} className="relative pl-12">
              <span aria-hidden="true" className="absolute left-0 top-1 grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-pink font-mono text-[11px] font-bold text-ink">
                {i + 1}
              </span>
              <span data-sc-num className="font-display block text-[clamp(3rem,13vw,4.5rem)] leading-none text-transparent" style={{ WebkitTextStroke: "1.5px #f7a3d0" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 data-sc-fade className="mt-2 text-[clamp(1.3rem,5vw,1.7rem)] font-bold leading-tight text-sun">
                {s.title}
              </h3>
              <p data-sc-fade className="mt-2 text-[15px] leading-relaxed text-cream/80">
                {s.description}
              </p>
              <div data-sc-monitor className="relative mt-4 aspect-video overflow-hidden rounded-2xl ring-1 ring-cream/15">
                <StageViz kind={i} images={images} active={!!visible[i]} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
