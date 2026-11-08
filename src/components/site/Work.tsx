"use client";

import { useEffect, useRef, useState } from "react";
import type { Reel, SiteContent } from "@/lib/types";
import { isLandscape } from "@/lib/video";
import { gsap, reducedMotion, ScrollTrigger, setupGsap } from "./motion";
import { ReelCard } from "./gallery/ReelCard";
import { Showreel } from "./Showreel";
import { Orbit } from "./fx/Orbit";
import { makeShards } from "./fx/shards";

const SHARDS = makeShards(3, 3, 11);

/** Grid span from the reel's real shape: the best reel goes full width, landscape ~half, vertical ~third. */
function spanFor(aspect: number, featured: boolean) {
  if (featured) return "sm:col-span-6";
  return aspect > 1.05 ? "sm:col-span-3" : "sm:col-span-3 lg:col-span-2";
}

export function Work({ work, reels }: { work: SiteContent["work"]; reels: Reel[] }) {
  const root = useRef<HTMLElement>(null);
  // The best reel lives in the Showreel (first item); the grid holds the rest — no duplicate footage.
  const featured = reels.find((r) => r.featured) ?? reels[0];
  const ordered = reels.filter((r) => r !== featured);
  const [aspects, setAspects] = useState<Record<string, number>>(() =>
    Object.fromEntries(reels.map((r) => [r.id, r.width && r.height ? r.width / r.height : 9 / 16])),
  );
  const stills = reels.flatMap((r) => [r.poster, ...(r.stills ?? [])]).filter(Boolean) as string[];

  useEffect(() => {
    setupGsap();
    if (reducedMotion()) return;
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const reveals: gsap.core.Timeline[] = [];
    const ctx = gsap.context(() => {
      // ORBIT — the ring of frames turns with the scroll, tilting as it passes.
      const ring = q("[data-work-orbit] [data-orbit-ring]");
      gsap.fromTo(ring, { rotationY: 0 }, { rotationY: -300, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 } });
      gsap.fromTo(
        q("[data-work-orbit]"),
        { rotationX: -22, scale: 0.8 },
        { rotationX: -6, scale: 1.08, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: true } },
      );
      gsap.from(q("[data-work-head] [data-c]"), {
        yPercent: 115,
        stagger: 0.05,
        duration: 1.2,
        scrollTrigger: { trigger: q("[data-work-head]")[0], start: "top 85%" },
      });

      // FRAME BREAK (reversed) — each card's thumbnail flies together from shards, then the live card takes over.
      q("[data-card-wrap]").forEach((wrap: Element, i: number) => {
        const card = wrap.querySelector<HTMLElement>("[data-reel-card]")!;
        const shards = card.querySelector<HTMLElement>("[data-shards]");
        const pieces = shards ? Array.from(shards.querySelectorAll<HTMLElement>("[data-shard]")) : [];
        const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
        if (pieces.length) {
          tl.set(shards, { display: "block", autoAlpha: 1 })
            .set(card, { backgroundColor: "transparent", boxShadow: "none" })
            .fromTo(
              pieces,
              {
                x: (k: number) => (SHARDS[k].cx - 50) * gsap.utils.random(4, 9),
                y: (k: number) => (SHARDS[k].cy - 50) * gsap.utils.random(4, 9),
                rotation: () => gsap.utils.random(-70, 70),
                scale: () => gsap.utils.random(0.4, 1.4),
                opacity: 0,
              },
              { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 1.3, stagger: { each: 0.012, from: "random" } },
            )
            .to(shards, { autoAlpha: 0, duration: 0.35 }, ">-0.05")
            .set(shards, { display: "none" })
            .set(card, { clearProps: "backgroundColor,boxShadow" });
          gsap.set(card.querySelectorAll(":scope > :not([data-shards])"), { opacity: 0 });
          tl.to(card.querySelectorAll(":scope > :not([data-shards])"), { opacity: 1, duration: 0.3 }, ">-0.45");
        } else {
          tl.fromTo(card, { clipPath: "inset(100% 0% 0% 0% round 22px)", y: 80 }, { clipPath: "inset(0% 0% 0% 0% round 22px)", y: 0, duration: 1.4 });
        }
        reveals.push(tl);
        ScrollTrigger.create({ trigger: wrap, start: "top 88%", once: true, onEnter: () => tl.delay((i % 3) * 0.1).play() });
      });

      // Depth: on desktop, alternate cards drift against the scroll.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        q("[data-card-wrap]").forEach((wrap: Element, i: number) => {
          if (i === 0) return;
          gsap.fromTo(
            wrap,
            { y: i % 2 ? 50 : -20 },
            { y: i % 2 ? -50 : 20, ease: "none", scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: true } },
          );
        });
      });
    }, el);

    // The intro lands on a card directly — finish every reveal instantly.
    const revealAll = () => reveals.forEach((t) => t.progress(1).kill());
    window.addEventListener("kp:reveal-all", revealAll);
    ScrollTrigger.refresh();
    return () => {
      window.removeEventListener("kp:reveal-all", revealAll);
      ctx.revert();
    };
  }, [reels.length]);

  const title = work.headline;

  return (
    <section ref={root} id="work" aria-labelledby="work-title" className="relative overflow-hidden bg-ink pb-24 pt-10 sm:pb-36 sm:pt-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[20%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(closest-side, #7a3fa8, transparent)" }}
      />

      {/* ORBIT header */}
      <div className="relative h-[clamp(300px,52vw,560px)]" style={{ perspective: "1000px" }} aria-hidden="true">
        <div data-work-orbit className="absolute left-1/2 top-1/2 h-0 w-0 [transform-style:preserve-3d]">
          <Orbit
            images={stills}
            count={14}
            className="h-0 w-0"
            style={{ ["--orbit-r" as string]: "min(620px, 58vw)", ["--orbit-w" as string]: "clamp(120px, 19vw, 250px)" }}
            cardClass="opacity-90"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,transparent_55%,var(--ink)_100%)]" />
      </div>

      <div className="relative mx-auto -mt-[clamp(200px,34vw,380px)] max-w-[1240px] px-5 sm:px-8">
        <header data-work-head className="relative z-[1] mb-12 text-center sm:mb-20">
          <p className="tracked mb-3 text-xs font-bold text-pink sm:text-sm">{work.eyebrow}</p>
          <h2 id="work-title" aria-label={title} className="font-display text-[clamp(3.6rem,11vw,9rem)] text-sun drop-shadow-[0_10px_40px_rgba(12,9,16,0.9)]">
            <span className="reveal-mask" aria-hidden="true">
              {title.split("").map((c, i) => (
                <span key={i} data-c className="inline-block">
                  {c === " " ? " " : c}
                </span>
              ))}
            </span>
          </h2>
        </header>

        {featured && (
          <div className="relative z-[1] mb-6 sm:mb-8 lg:mb-10">
            <Showreel reel={featured} reels={reels} />
          </div>
        )}
        {ordered.length ? (
          <ul className="relative z-[1] grid grid-cols-1 gap-6 sm:grid-cols-6 sm:gap-6 lg:gap-8">
            {ordered.map((reel, i) => {
              const a = aspects[reel.id] ?? 9 / 16;
              const isFeat = false;
              return (
                <li key={reel.id} className={`${spanFor(a, isFeat)} ${a <= 1.05 && !isFeat ? "mx-auto w-full max-w-[420px] sm:max-w-none" : ""}`}>
                  <div data-card-wrap className="will-change-transform">
                    <ReelCard
                      reel={reel}
                      index={i}
                      aspect={a}
                      onAspect={(na) => {
                        if (Math.abs(na - a) > 0.02 && !(reel.width && reel.height)) setAspects((m) => ({ ...m, [reel.id]: na }));
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : !featured ? (
          <p className="text-center text-cream-dim">New work is on its way.</p>
        ) : null}
      </div>
    </section>
  );
}

export { isLandscape };
