"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Reel } from "@/lib/types";
import { EASE, gsap, reducedMotion, setupGsap } from "./motion";
import { useGallery } from "./gallery/GalleryController";
import { audioUnlocked, playWithSound } from "./audio";
import { SoundOffIcon, SoundOnIcon } from "./icons";

/**
 * Scroll-scrubbed zoom-through cut. A black plate with a giant word punched
 * out of it; the SECOND FEATURED REEL plays live behind the letters. The
 * camera flies through a letter's stroke until the footage fills the frame,
 * then the shot pulls back into a card.
 *
 * The video is a gallery member (id "cut:<reel>"), so it never plays at the
 * same time as another reel, and it only downloads when the section is near.
 */
export function ZoomCut({ reel, word = "CUT." }: { reel?: Reel; word?: string }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const maskId = useId().replace(/:/g, "");
  const g = useGallery();
  const cutId = `cut:${reel?.id ?? "none"}`;
  const [near, setNear] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">("idle");

  // Scroll choreography
  useEffect(() => {
    setupGsap();
    if (reducedMotion()) return;
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const text = q("[data-zc-text]")[0] as unknown as SVGTextElement;

    const ctx = gsap.context(() => {
      const measure = () => {
        try {
          const ext = text.getExtentOfChar(0);
          gsap.set(text, { svgOrigin: `${ext.x + ext.width * 0.17} ${ext.y + ext.height * 0.55}` });
        } catch {}
      };
      measure();
      const tl = gsap.timeline({
        defaults: { ease: EASE.none },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6, onRefresh: measure },
      });
      tl.fromTo(q("[data-zc-cap]"), { opacity: 1 }, { opacity: 0, duration: 0.15 }, 0)
        // Glyphs stop rasterising at extreme sizes, so the zoom tops out at 16× and the plate dissolves for the punch-through.
        .fromTo(text, { scale: 1 }, { scale: 16, duration: 0.62, ease: "power3.in" }, 0.05)
        .fromTo(q("[data-zc-plate]"), { opacity: 1 }, { opacity: 0, duration: 0.12, ease: "power1.in" }, 0.55)
        .fromTo(q("[data-zc-media]"), { scale: 1.45 }, { scale: 1, duration: 0.95, ease: "power2.out" }, 0)
        .fromTo(q("[data-zc-after]"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.2 }, 0.72)
        .fromTo(q("[data-zc-frame]"), { clipPath: "inset(0% 0% 0% 0% round 0px)" }, { clipPath: "inset(10% 6% 10% 6% round 32px)", duration: 0.25, ease: "power2.inOut" }, 0.75);
    }, el);
    return () => ctx.revert();
  }, []);

  // Lazy-load: only fetch the reel when the section is close.
  useEffect(() => {
    if (!reel) return;
    const el = root.current!;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [reel]);

  // Join the single-play gallery with the pinned stage as the measured element.
  useEffect(() => (reel ? g.observe(cutId, stage.current!) : undefined), [g.observe, cutId, reel]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = g.activeId === cutId && !g.suspended;
  // This reel plays WITH its own audio (sound is on by default site-wide).
  const audible = active && g.soundOn;
  const audibleRef = useRef(audible);
  const activeRef = useRef(active);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    audibleRef.current = audible;
    activeRef.current = active;
  });
  useEffect(() => {
    const v = video.current;
    if (!v || !near || status === "error") return;
    if (active) playWithSound(v, () => audibleRef.current, () => activeRef.current);
    else if (!v.paused) v.pause();
  }, [active, near, status]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!audible) v.muted = true;
    else if (audioUnlocked()) v.muted = false;
  }, [audible]);
  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    const next = v.muted;
    v.muted = !next;
    g.setSoundOn(next);
  };

  return (
    <section ref={root} aria-label="Featured reel" className="relative h-[260svh] bg-ink motion-reduce:h-[100svh]">
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        <div data-zc-frame className="absolute inset-0 overflow-hidden bg-black">
          <div data-zc-media className="absolute inset-0">
            {reel ? (
              <>
                <video
                    ref={video}
                    src={near ? reel.url : undefined}
                    poster={reel.poster}
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="absolute inset-0 h-full w-full object-cover"
                    onWaiting={() => setStatus("loading")}
                    onLoadStart={() => setStatus((s) => (s === "playing" ? s : "loading"))}
                    onPlaying={() => setStatus("playing")}
                    onError={() => setStatus("error")}
                    onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
                    aria-label="Featured reel"
                  />
                {/* Poster holds the frame until real frames are rolling (and stays if the video fails). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reel.poster}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                  style={{ opacity: status === "playing" ? 0 : 1 }}
                />
              </>
            ) : (
              <div className="absolute inset-0" style={{ background: "var(--sunset)" }} />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 mix-blend-color" style={{ background: "linear-gradient(160deg,#5e3aa8,#e0559a 60%,#ff8a5f)", opacity: 0.22 }} />
          <div className="scanlines pointer-events-none absolute inset-0" />
          {status === "loading" && near && active && (
            <span aria-label="Loading video" className="absolute right-6 top-24 h-7 w-7 animate-spin rounded-full border-2 border-cream/30 border-t-sun" />
          )}
          {status === "error" && reel && (
            <a
              href={reel.link ?? reel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-6 top-24 z-[2] rounded-full bg-ink/70 px-4 py-2 text-xs font-semibold text-cream backdrop-blur"
            >
              Video unavailable — open the original ↗
            </a>
          )}
          <div data-zc-after className="pointer-events-none absolute inset-x-0 bottom-[16%] text-center opacity-0">
            <p className="font-display text-[clamp(2.6rem,8vw,6.5rem)] text-cream drop-shadow-[0_6px_30px_rgba(0,0,0,0.6)]">Cut to: your story</p>
          </div>
        </div>
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
              <rect width="100%" height="100%" fill="white" />
              <text data-zc-text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="black" className="font-display" style={{ fontSize: "min(46vw, 62svh)", letterSpacing: "0.01em" }}>
                {word}
              </text>
            </mask>
          </defs>
          <rect data-zc-plate width="100%" height="100%" fill="var(--ink)" mask={`url(#${maskId})`} />
        </svg>
        {reel && near && (
          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? "Turn sound on" : "Mute"}
            className={`absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-[3] flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur-md sm:right-8 ${
              muted ? "border-sun bg-sun text-ink" : "border-cream/30 bg-ink/60 text-cream"
            }`}
          >
            {muted ? <SoundOffIcon className="h-4 w-4" /> : <SoundOnIcon className="h-4 w-4" />}
            {muted ? "Sound" : "Sound on"}
          </button>
        )}
        <div data-zc-cap className="pointer-events-none absolute inset-x-0 bottom-[8%] flex justify-center">
          <span className="tracked text-[11px] text-cream/60">Scroll to cut</span>
        </div>
      </div>
    </section>
  );
}
