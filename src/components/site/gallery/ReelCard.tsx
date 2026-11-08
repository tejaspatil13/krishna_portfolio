"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Reel } from "@/lib/types";
import { isFileSource } from "@/lib/video";
import { makeShards } from "../fx/shards";
import { useGallery } from "./GalleryController";
import { playWithSound } from "../audio";
import { ArrowUpRight, InstagramIcon, Monogram, PauseIcon, PlayIcon, SoundOffIcon, SoundOnIcon } from "../icons";

const COVERS = [
  "linear-gradient(165deg,#3b2a86 0%,#8c47b4 40%,#e0559a 75%,#ff9a66 100%)",
  "linear-gradient(165deg,#2a3d8f 0%,#5a6fd1 30%,#c45bb4 65%,#ff8f8f 100%)",
  "linear-gradient(165deg,#4a2369 0%,#b04a9a 45%,#ff7d6b 80%,#ffc970 100%)",
];

const SHARDS = makeShards(3, 3, 11);

/** Marks a card "near" the viewport (sticky) so media is only fetched when needed. */
function useNear(ref: React.RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, near]);
  return near;
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function ReelCard({ reel, index, aspect, onAspect }: { reel: Reel; index: number; aspect: number; onAspect?: (a: number) => void }) {
  const card = useRef<HTMLDivElement>(null);
  const g = useGallery();
  useEffect(() => g.observe(reel.id, card.current!), [g.observe, reel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={card}
      data-reel-card
      data-reel-id={reel.id}
      className="reel-card relative w-full overflow-hidden rounded-[22px] bg-ink-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
      style={{ aspectRatio: String(aspect) }}
    >
      {isFileSource(reel.source) ? (
        <FileReel reel={reel} index={index} cardRef={card} onAspect={onAspect} />
      ) : reel.source === "instagram" ? (
        <InstagramReel reel={reel} index={index} cardRef={card} />
      ) : (
        <EmbedReel reel={reel} index={index} cardRef={card} />
      )}
      {/* Frame-break reveal: shards of the thumbnail that assemble on entry (driven by Work.tsx). */}
      {reel.poster && (
        <div data-shards aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] hidden">
          {SHARDS.map((s, i) => (
            <div
              key={i}
              data-shard
              className="absolute inset-0"
              style={{
                clipPath: `polygon(${s.points})`,
                backgroundImage: `url(${reel.poster})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transformOrigin: `${s.cx}% ${s.cy}%`,
              }}
            />
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 z-[6] rounded-[22px] ring-1 ring-inset ring-cream/10" />
    </div>
  );
}

function Thumb({ reel, index }: { reel: Reel; index: number }) {
  if (reel.poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={reel.poster}
        alt=""
        loading={index < 2 ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="absolute inset-0" style={{ background: COVERS[index % COVERS.length] }}>
      <div className="diag-lines absolute inset-0 opacity-70" />
      <div className="scanlines absolute inset-0" />
      <Monogram className="absolute bottom-[12%] left-1/2 h-10 w-auto -translate-x-1/2 opacity-80" gradientId={`kp-c-${reel.id}`} />
    </div>
  );
}

function BigPlay({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="group/play absolute inset-0 z-[2] grid cursor-pointer place-items-center">
      <span className="relative grid h-[68px] w-[68px] place-items-center rounded-full bg-cream/90 text-coral shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition-[transform,background-color] duration-500 ease-cine group-hover/play:scale-110 group-hover/play:bg-sun sm:h-[76px] sm:w-[76px]">
        <span className="absolute inset-0 rounded-full border border-cream/60" style={{ animation: "pulse-ring 2.2s ease-out infinite" }} />
        <PlayIcon className="ml-1 h-7 w-7" />
      </span>
    </button>
  );
}

function FileReel({
  reel,
  index,
  cardRef,
  onAspect,
}: {
  reel: Reel;
  index: number;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onAspect?: (a: number) => void;
}) {
  const g = useGallery();
  const near = useNear(cardRef);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const timeEl = useRef<HTMLSpanElement>(null);
  const slider = useRef<HTMLDivElement>(null);
  const wantPlay = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [muted, setMuted] = useState(true);

  const isActive = g.activeId === reel.id;
  const engaged = g.engagedId === reel.id;
  const shouldPlay = near && isActive && !g.suspended && !g.isUserPaused(reel.id);
  // Sound is on by default for whichever reel is playing.
  const audible = isActive && g.soundOn;
  const audibleRef = useRef(audible);
  useEffect(() => {
    audibleRef.current = audible;
  });

  useEffect(() => {
    const v = video.current;
    wantPlay.current = shouldPlay;
    if (!v || !near) return;
    if (shouldPlay) {
      const seek = g.takeSeek(reel.id);
      if (seek !== undefined) {
        const apply = () => {
          try {
            v.currentTime = seek;
          } catch {}
        };
        if (v.readyState >= 1) apply();
        else v.addEventListener("loadedmetadata", apply, { once: true });
      }
      playWithSound(v, () => audibleRef.current, () => wantPlay.current);
    } else if (!v.paused) {
      v.pause(); // currentTime is preserved
    }
  }, [shouldPlay, audible, near]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Tap to watch: unmute inside the gesture so phones allow sound. */
  const watch = () => {
    const v = video.current;
    if (v) {
      v.muted = false;
      v.play().catch(() => {});
    }
    g.engage(reel.id);
  };
  const toggle = () => (playing ? g.userPause(reel.id) : engaged ? g.engage(reel.id) : watch());
  const toggleSound = () => {
    const v = video.current;
    const next = !(g.soundOn && v && !v.muted);
    if (v) v.muted = !next; // inside the click → allowed
    g.setSoundOn(next);
  };
  const fullscreen = () => {
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (cardRef.current?.requestFullscreen) void cardRef.current.requestFullscreen();
    else v?.webkitEnterFullscreen?.();
  };
  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = video.current;
    if (!v?.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.duration;
  };

  return (
    <div
      className="group/card absolute inset-0 bg-black"
      data-cursor={engaged ? (playing ? "Pause" : "Play") : "Watch"}
      onPointerEnter={(e) => e.pointerType === "mouse" && g.preview(reel.id)}
    >
      <div className="absolute inset-0 transition-transform duration-700 ease-cine group-hover/card:scale-[1.03]">
        <video
            ref={video}
            src={near ? reel.url : undefined}
            poster={reel.poster}
            muted
            loop
            playsInline
            preload={reel.poster ? "none" : "metadata"}
            disablePictureInPicture
            className="absolute inset-0 h-full w-full object-cover"
            onClick={engaged ? toggle : undefined}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) onAspect?.(v.videoWidth / v.videoHeight);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            onWaiting={() => setWaiting(true)}
            onPlaying={() => {
              setWaiting(false);
              setRolling(true);
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (bar.current && v.duration) bar.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
              if (timeEl.current && v.duration) timeEl.current.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
              if (slider.current && v.duration) slider.current.setAttribute("aria-valuenow", String(Math.round((v.currentTime / v.duration) * 100)));
            }}
            aria-label={`Reel ${index + 1}`}
          />
        {/* Thumbnail holds the frame until the first picture is actually rolling. */}
        <div className="pointer-events-none absolute inset-0 transition-opacity duration-500" style={{ opacity: rolling ? 0 : 1 }}>
          <Thumb reel={reel} index={index} />
        </div>
      </div>

      {!engaged &&
        (playing ? (
          // Autoplaying: no big play button. Tap for full controls (and sound, if the browser was holding it).
          <>
            <button type="button" onClick={watch} aria-label={`Play reel ${index + 1} with sound`} className="absolute inset-0 z-[2] cursor-pointer" />
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[3] flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full bg-ink/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream backdrop-blur">
                {muted ? (
                  <>
                    <SoundOffIcon className="h-3.5 w-3.5" /> Tap anywhere for sound
                  </>
                ) : (
                  <>
                    <SoundOnIcon className="h-3.5 w-3.5" /> Sound on
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => g.userPause(reel.id)}
                aria-label="Pause"
                className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-ink/60 text-cream backdrop-blur hover:bg-ink/85"
              >
                <PauseIcon className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <BigPlay label={`Play reel ${index + 1} with sound`} onClick={watch} />
          </>
        ))}

      {engaged && playing && waiting && (
        <span aria-label="Loading" className="pointer-events-none absolute left-1/2 top-1/2 z-[3] h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-cream/30 border-t-sun" />
      )}

      {engaged && (
        <div
          className={`absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-300 ${
            playing ? "opacity-0 focus-within:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100" : ""
          }`}
        >
          <div
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            ref={slider}
            aria-valuenow={0}
            onClick={seekTo}
            onKeyDown={(e) => {
              const v = video.current;
              if (!v) return;
              if (e.key === "ArrowRight") v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
              if (e.key === "ArrowLeft") v.currentTime = Math.max(0, v.currentTime - 5);
            }}
            className="flex h-5 cursor-pointer items-center"
          >
            <span className="h-1 w-full overflow-hidden rounded-full bg-cream/25">
              <span ref={bar} className="block h-full origin-left bg-gradient-to-r from-pink to-sun" style={{ transform: "scaleX(0)" }} />
            </span>
          </div>
          <div className="flex items-center gap-1 text-cream">
            <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream/15">
              {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
            </button>
            <button type="button" onClick={toggleSound} aria-label={!muted ? "Mute" : "Unmute"} className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream/15">
              {!muted ? <SoundOnIcon className="h-4 w-4" /> : <SoundOffIcon className="h-4 w-4" />}
            </button>
            <span ref={timeEl} className="ml-1 font-mono text-[11px] tabular-nums text-cream/75">
              0:00
            </span>
            <button type="button" onClick={fullscreen} aria-label="Full screen" className="ml-auto grid h-10 w-10 place-items-center rounded-full hover:bg-cream/15">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Instagram: plays inside the card via the official embed — no separate screen. */
function InstagramReel({ reel, index, cardRef }: { reel: Reel; index: number; cardRef: React.RefObject<HTMLDivElement | null> }) {
  const g = useGallery();
  const near = useNear(cardRef);
  const engaged = g.engagedId === reel.id;
  const src = useMemo(() => `https://www.instagram.com/${reel.url.includes("/p/") ? "p" : "reel"}/${reel.embedId}/embed/`, [reel]);
  return (
    <div className="group/card absolute inset-0 bg-black">
      {engaged && near ? (
        <div className="absolute inset-0 overflow-y-auto overscroll-contain bg-white" data-lenis-prevent>
          <iframe title={`Reel ${index + 1}`} src={src} allow="autoplay; encrypted-media; fullscreen" className="block h-[760px] w-full border-0" />
        </div>
      ) : (
        <>
          <div className="absolute inset-0 transition-transform duration-700 ease-cine group-hover/card:scale-[1.04]">
            <Thumb reel={reel} index={index} />
          </div>
          <BigPlay label={`Play reel ${index + 1}`} onClick={() => g.engage(reel.id)} />
        </>
      )}
      <a
        href={reel.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open reel ${index + 1} on Instagram`}
        className="absolute right-3 top-3 z-[3] flex h-10 items-center gap-1.5 rounded-full bg-ink/55 px-3 text-cream backdrop-blur-md transition-colors hover:bg-ink/80"
      >
        <InstagramIcon className="h-4 w-4" />
        <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
      </a>
    </div>
  );
}

/** YouTube / Vimeo: iframe mounted once the card first plays; play/pause/mute via postMessage. */
function EmbedReel({ reel, index, cardRef }: { reel: Reel; index: number; cardRef: React.RefObject<HTMLDivElement | null> }) {
  const g = useGallery();
  const near = useNear(cardRef);
  const frame = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const isActive = g.activeId === reel.id;
  const engaged = g.engagedId === reel.id;
  const shouldPlay = near && isActive && !g.suspended && !g.isUserPaused(reel.id);
  const audible = isActive && g.soundOn;
  const yt = reel.source === "youtube";

  if (shouldPlay && !mounted) setMounted(true);

  useEffect(() => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    const send = (m: object) => w.postMessage(JSON.stringify(m), "*");
    if (yt) {
      send({ event: "command", func: audible ? "unMute" : "mute", args: [] });
      send({ event: "command", func: shouldPlay ? "playVideo" : "pauseVideo", args: [] });
    } else {
      send({ method: "setVolume", value: audible ? 1 : 0 });
      send({ method: shouldPlay ? "play" : "pause" });
    }
  }, [shouldPlay, audible, yt, mounted]);

  const src = yt
    ? `https://www.youtube-nocookie.com/embed/${reel.embedId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${reel.embedId}&controls=0&rel=0&modestbranding=1&enablejsapi=1`
    : `https://player.vimeo.com/video/${reel.embedId}?autoplay=1&muted=1&loop=1&playsinline=1&controls=0&dnt=1`;

  return (
    <div className="group/card absolute inset-0 bg-black" onPointerEnter={(e) => e.pointerType === "mouse" && g.preview(reel.id)}>
      <Thumb reel={reel} index={index} />
      {mounted && (
        <iframe
          ref={frame}
          title={`Reel ${index + 1}`}
          src={src}
          allow="autoplay; encrypted-media; picture-in-picture"
          className="pointer-events-none absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{ aspectRatio: "16/9", width: "auto", height: "100%", minWidth: "100%" }}
          tabIndex={-1}
        />
      )}
      {!engaged ? (
        <BigPlay label={`Play reel ${index + 1} with sound`} onClick={() => g.engage(reel.id)} />
      ) : (
        <div className="absolute inset-x-3 bottom-3 z-[3] flex justify-between">
          <button
            type="button"
            onClick={() => (shouldPlay ? g.userPause(reel.id) : g.engage(reel.id))}
            aria-label={shouldPlay ? "Pause" : "Play"}
            className="grid h-11 w-11 place-items-center rounded-full bg-ink/55 text-cream backdrop-blur-md"
          >
            {shouldPlay ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => g.setSoundOn(!audible)}
            aria-label={audible ? "Mute" : "Unmute"}
            className="grid h-11 w-11 place-items-center rounded-full bg-ink/55 text-cream backdrop-blur-md"
          >
            {audible ? <SoundOnIcon className="h-4 w-4" /> : <SoundOffIcon className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
