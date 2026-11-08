"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Reel } from "@/lib/types";
import { DUR, EASE, gsap, isSmallScreen, reducedMotion, setupGsap, STAGGER } from "./motion";
import { useGallery } from "./gallery/GalleryController";
import { makeShards } from "./fx/shards";
import { Orbit } from "./fx/Orbit";
import { disableSfx, enableSfx, glitch, hit, riser, whoosh } from "./fx/sfx";
import { audioUnlocked, playWithSound } from "./audio";
import { PauseIcon, PlayIcon, SoundOffIcon, SoundOnIcon } from "./icons";

/**
 * The SHOWREEL — first item of the Work section.
 *
 * A motion-graphics intro (ignition → frame break → orbit → phone mockup)
 * that ends with the phone pushing in until its screen IS the player. One
 * shared <video> element plays inside the phone and keeps playing as the
 * full player, so there is no hand-off, no restart and no repeated footage.
 *
 * Phases: idle → loading → intro → reel
 */

type Phase = "idle" | "loading" | "intro" | "reel";

const SHARDS = makeShards(5, 4, 23);
const MONO =
  "M6 6h20v26L48 6h25L47 36l28 38H50L33 50l-7 8v16H6V6Zm72 0h20c13 0 22 8 22 21s-9 21-22 21h-1v26H78V6Zm19 17v8h1c3 0 5-1.5 5-4s-2-4-5-4h-1Z";
const CRACKS = ["55,45 40,30 34,12 30,0", "55,45 70,38 84,20 100,12", "55,45 78,52 92,64 100,70", "55,45 60,66 52,84 56,100", "55,45 38,58 20,64 0,72", "55,45 30,44 12,36 0,38"];
const SPEED = Array.from({ length: 24 }, (_, i) => i);
const LOOPS = Array.from({ length: 8 }, (_, i) => i + 1);
const PAD = 0.032; // phone bezel as a fraction of phone width

const pad2 = (n: number) => String(Math.floor(n)).padStart(2, "0");
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function loadImage(src: string) {
  return new Promise<void>((res) => {
    const img = new Image();
    img.onload = img.onerror = () => res();
    img.src = src;
  });
}

export function Showreel({ reel, reels }: { reel: Reel; reels: Reel[] }) {
  const card = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const master = useRef<gsap.core.Timeline | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoStarted = useRef(false);
  type Final = { vars: gsap.TweenVars; r: { w: number; h: number } };
  const applyFinal = useRef<(immediate: boolean) => Final>(() => ({ vars: {}, r: { w: 0, h: 0 } }));
  const bar = useRef<HTMLSpanElement>(null);
  const timeEl = useRef<HTMLSpanElement>(null);
  const g = useGallery();

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  const stills = reels.flatMap((r) => [r.poster, ...(r.stills ?? [])]).filter(Boolean) as string[];
  const frame = reel.poster ?? stills[0] ?? "";
  const aspect = reel.width && reel.height ? reel.width / reel.height : 16 / 9;

  const isActive = g.activeId === reel.id;
  const shouldPlay = isActive && !g.suspended && !g.isUserPaused(reel.id);
  // Sound is on by default; the browser may hold it until the first tap (see audio.ts).
  const audible = isActive && g.soundOn;
  const audibleRef = useRef(audible);
  const wantRef = useRef(false);
  const [vMuted, setVMuted] = useState(true);
  useEffect(() => {
    audibleRef.current = audible;
    wantRef.current = shouldPlay;
  });

  // Register with the gallery: only one video on the page plays at a time.
  useEffect(() => g.observe(reel.id, card.current!), [g.observe, reel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start fetching when the card is near (the page auto-scrolls here on load).
  useEffect(() => {
    const el = card.current!;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: "2600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || phaseRef.current !== "idle") return;
    setPhase("loading");
    const v = video.current!;
    v.src = reel.url;
    v.preload = "auto";
    const vidReady = new Promise<void>((res) => {
      if (v.readyState >= 3) return res();
      v.addEventListener("canplay", () => res(), { once: true });
      v.addEventListener("error", () => res(), { once: true });
    });
    let cancelled = false;
    Promise.race([Promise.all([loadImage(frame), ...stills.slice(0, 12).map(loadImage), vidReady]), new Promise((r) => setTimeout(r, 4000))]).then(
      () => !cancelled && setReady(true),
    );
    return () => {
      cancelled = true;
    };
  }, [near]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------ build the intro */
  const build = useCallback(() => {
    setupGsap();
    const el = card.current!;
    const q = gsap.utils.selector(el);
    const v = video.current!;
    const small = isSmallScreen();
    const cw = el.clientWidth;
    const ch = el.clientHeight;

    // Phone + ring geometry, all derived from the card.
    const W0 = Math.min(ch * 0.36, cw * (small ? 0.4 : 0.2), 270);
    const H0 = (W0 * 19.5) / 9;
    const scr = { w: W0 * (1 - 2 * PAD), h: H0 - 2 * PAD * W0 };
    const landscape = Math.min(1, (cw * 0.62) / H0, (ch * 0.62) / W0);
    const ringR = Math.max(cw * (small ? 0.42 : 0.33), H0 * 0.66);
    const cardW = Math.max(58, Math.min(170, cw * (small ? 0.19 : 0.125)));
    el.style.setProperty("--ring-r", `${ringR}px`);
    el.style.setProperty("--ring-w", `${cardW}px`);

    // The final player rect: the reel contain-fitted in the card.
    applyFinal.current = (immediate: boolean) => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const r = W / H > aspect ? { w: H * aspect, h: H } : { w: W, h: W / aspect };
      const vars = { width: r.h, height: r.w, x: 0, y: 0, z: 0, scale: 1, rotation: -90, rotationY: 0, rotationX: 0 };
      if (immediate) {
        gsap.set(q("[data-sr-phone]"), vars);
        gsap.set(q("[data-sr-media]"), { width: r.w, height: r.h, rotation: 90 });
      }
      return { vars, r };
    };

    // ---- initial state
    gsap.set(q("[data-sr-scene]"), { autoAlpha: 0 });
    gsap.set(q("[data-sr-scene='ignite']"), { autoAlpha: 1 });
    gsap.set(q("[data-sr-bar]"), { height: "50%" });
    const path = q("[data-sr-mono-path]")[0] as unknown as SVGPathElement;
    const len = path.getTotalLength();
    gsap.set(q("[data-sr-mono-path]"), { strokeDasharray: len, strokeDashoffset: len, fillOpacity: 0 });
    gsap.set(q("[data-sr-mono]"), { scale: 1, autoAlpha: 1 });
    gsap.set(q("[data-sr-crack] polyline"), { strokeDasharray: 200, strokeDashoffset: 200 });
    gsap.set(q("[data-sr-frame], [data-sr-crack], [data-sr-frame-type]"), { autoAlpha: 1 });
    gsap.set(q("[data-sr-shards]"), { autoAlpha: 0 });
    gsap.set(q("[data-sr-orbit]"), { z: 0, scale: 1, rotationX: -12, autoAlpha: 1 });
    gsap.set(q("[data-sr-matters]"), { autoAlpha: 1 });
    gsap.set(q("[data-sr-phone]"), { width: W0, height: H0, xPercent: -50, yPercent: -50, x: 0, y: 0, z: -1600, rotation: 0, rotationY: 540, rotationX: 22, scale: 1, autoAlpha: 0 });
    gsap.set(q("[data-sr-pad]"), { padding: `${PAD * 100}%` });
    gsap.set(q("[data-sr-screen]"), { borderRadius: "11% / 5.2%" });
    gsap.set(q("[data-sr-bezel], [data-sr-back]"), { opacity: 1 });
    gsap.set(q("[data-sr-media]"), { width: scr.w, height: scr.w / aspect, xPercent: -50, yPercent: -50, rotation: 0 });
    gsap.set(q("[data-sr-ring]"), { rotationY: 0, scale: 0.55, autoAlpha: 0 });
    gsap.set(q("[data-sr-sky]"), { opacity: 1, clipPath: "circle(0% at 50% 50%)" });
    gsap.set(q("[data-sr-backdrop]"), { opacity: 0 });
    gsap.set(q("[data-sr-hud]"), { autoAlpha: 1 });
    gsap.set(q("[data-sr-shadow]"), { opacity: 0, scaleX: 0.4 });

    const label = (txt: string) => () => {
      const l = q("[data-sr-label]")[0] as HTMLElement;
      if (l) l.textContent = txt;
    };
    const shakeAt = (tl: gsap.core.Timeline, at: string, power = 12) =>
      tl.to(
        q("[data-sr-camera]"),
        {
          keyframes: Array.from({ length: 6 }, (_, i) => ({ x: (Math.random() - 0.5) * power * (1 - i / 6), y: (Math.random() - 0.5) * power * (1 - i / 6), duration: 0.04 })).concat({ x: 0, y: 0, duration: 0.04 }),
        },
        at,
      );

    const loops = () => q("[data-sr-loop]") as HTMLVideoElement[];
    const startLoops = () => {
      if (small) return; // phones show stills instead of eight decoders
      loops().forEach((lv) => {
        if (!lv.src) lv.src = lv.dataset.src!;
        lv.play().catch(() => {});
      });
    };
    const stopLoops = () => {
      loops().forEach((lv) => {
        lv.pause();
        lv.removeAttribute("src");
        lv.load(); // release the decoder
      });
    };

    // Specular sheen follows the phone's rotation; shadow breathes with its depth.
    const phoneEl = q("[data-sr-phone]")[0] as HTMLElement;
    const sheen = q("[data-sr-sheen]")[0] as HTMLElement;
    const light = () => {
      const ry = Number(gsap.getProperty(phoneEl, "rotationY")) || 0;
      sheen.style.backgroundPosition = `${50 + Math.sin((ry * Math.PI) / 180) * 120}% 0`;
    };

    const tl = gsap.timeline({ paused: true, defaults: { ease: EASE.out } });

    /* ===== A · IGNITION */
    tl.addLabel("ignite", 0)
      .call(label("SC 01 — IGNITION"))
      .to(q("[data-sr-bar]"), { height: "8%", duration: DUR.base, ease: EASE.inOut }, 0)
      .to(q("[data-sr-mono-path]"), { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, 0.1)
      .to(q("[data-sr-mono-path]"), { fillOpacity: 1, duration: 0.3 }, 0.85)
      .fromTo(q("[data-sr-tag]"), { opacity: 0, letterSpacing: "1.4em" }, { opacity: 1, letterSpacing: "0.6em", duration: DUR.base }, 0.3)
      .fromTo(q("[data-sr-rgb]"), { x: -8 }, { x: 0, duration: 0.5, ease: "steps(6)" }, 0.2)
      .call(() => glitch(), [], 0.5)
      .call(() => whoosh(0.7, true), [], 1.1)
      .to(q("[data-sr-tag]"), { autoAlpha: 0, duration: 0.25 }, 1.15)
      .to(q("[data-sr-mono]"), { scale: 14, duration: 0.7, ease: EASE.in }, 1.2)
      .set(q("[data-sr-scene='ignite']"), { autoAlpha: 0 }, 1.9)

      /* ===== B · FRAME BREAK — "EVERY FRAME" */
      .addLabel("frame", 1.9)
      .call(label("SC 02 — FRAME BREAK"), [], "frame")
      .set(q("[data-sr-scene='frame'], [data-sr-scene='orbit']"), { autoAlpha: 1 }, "frame")
      .fromTo(q("[data-sr-flash]"), { opacity: 0.9 }, { opacity: 0, duration: 0.5, ease: "power2.out" }, "frame")
      .fromTo(q("[data-sr-frame]"), { scale: 1.5 }, { scale: 1, duration: 0.7 }, "frame")
      .call(() => hit(1), [], "frame")
      .fromTo(q("[data-sr-frame-type] [data-c]"), { yPercent: 120 }, { yPercent: 0, stagger: STAGGER.chars, duration: 0.6 }, "frame+=0.1")
      .to(q("[data-sr-crack] polyline"), { strokeDashoffset: 0, duration: 0.22, stagger: 0.025, ease: "power3.out" }, "frame+=0.75")
      .call(() => glitch(), [], "frame+=0.78")
      .addLabel("break", "frame+=1.05")
      .set(q("[data-sr-shards]"), { autoAlpha: 1 }, "break")
      .set(q("[data-sr-frame], [data-sr-crack], [data-sr-frame-type]"), { autoAlpha: 0 }, "break")
      .call(() => (hit(0.8), whoosh(0.9, false)), [], "break")
      .add(shatter(q("[data-sr-shards]")[0] as HTMLCanvasElement, frame, cw, ch), "break")

      /* ===== C · ORBIT — "MATTERS" */
      .addLabel("orbit", "break+=0.05")
      .call(label("SC 03 — ORBIT"), [], "orbit")
      .fromTo(q("[data-sr-orbit]"), { scale: 0.4, rotationX: -32 }, { scale: 1, rotationX: -12, duration: DUR.slow }, "orbit")
      .fromTo(q("[data-sr-orbit] [data-orbit-ring]"), { rotationY: 140 }, { rotationY: -360, duration: DUR.scene, ease: "power3.inOut" }, "orbit")
      .fromTo(q("[data-sr-speed] span"), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 0.8, duration: 0.6, stagger: { each: 0.01, from: "random" }, ease: "power2.out" }, "orbit+=0.3")
      .to(q("[data-sr-speed]"), { rotation: 90, duration: DUR.scene, ease: EASE.none }, "orbit")
      .fromTo(q("[data-sr-matters] [data-c]"), { z: 380, opacity: 0 }, { z: 0, opacity: 1, stagger: 0.05, duration: 0.8 }, "orbit+=0.4")
      .call(() => whoosh(1.2, true), [], "orbit+=0.2")
      .call(() => riser(1.6), [], "orbit+=0.9")

      /* ===== D · CUT — dolly into the ring, flash cut (no name card) */
      .addLabel("cut", "orbit+=2.15")
      .to(q("[data-sr-matters]"), { autoAlpha: 0, duration: 0.25, ease: "power2.in" }, "cut")
      .to(q("[data-sr-speed]"), { autoAlpha: 0, duration: 0.3 }, "cut")
      .to(q("[data-sr-orbit]"), { z: 300, rotationX: 0, duration: 0.6, ease: EASE.in }, "cut")
      .fromTo(q("[data-sr-flash]"), { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, "cut+=0.5")
      .call(() => hit(1.1), [], "cut+=0.58")
      .set(q("[data-sr-scene='frame'], [data-sr-scene='orbit']"), { autoAlpha: 0 }, "cut+=0.62")

      /* ===== E · PHONE MOCKUP inside an orbit of live reel loops */
      .addLabel("phone", "cut+=0.62")
      .call(label("SC 04 — PHONE"), [], "phone")
      .set(q("[data-sr-scene='phone']"), { autoAlpha: 1 }, "phone")
      .to(q("[data-sr-flash]"), { opacity: 0, duration: 0.35, ease: "power2.out" }, "phone")
      .to(q("[data-sr-sky]"), { clipPath: "circle(120% at 50% 50%)", duration: 0.9 }, "phone")
      .call(() => {
        // The ONE video: starts here, keeps playing as the final player.
        if (!videoStarted.current) {
          v.currentTime = reel.introStart ?? 0;
          videoStarted.current = true;
        }
        playWithSound(v, () => audibleRef.current, () => wantRef.current);
        startLoops();
      }, [], "phone")
      .to(q("[data-sr-ring]"), { autoAlpha: 1, scale: 1, duration: 1.1 }, "phone+=0.1")
      .to(q("[data-sr-ring]"), { rotationY: -250, duration: 4.2, ease: "power1.inOut" }, "phone")
      .to(q("[data-sr-phone]"), { z: 0, rotationY: -22, rotationX: 7, autoAlpha: 1, duration: 1.5, ease: EASE.out, onUpdate: light }, "phone")
      .to(q("[data-sr-shadow]"), { opacity: 0.75, scaleX: 1, duration: 1.2 }, "phone+=0.3")
      .call(() => whoosh(0.8, false), [], "phone")
      .call(() => hit(0.6), [], "phone+=0.6")
      .addLabel("rotate", "phone+=1.6")
      .call(() => whoosh(0.5, true), [], "rotate")
      .to(q("[data-sr-phone]"), { rotation: -90, rotationY: 10, rotationX: 4, scale: landscape, duration: DUR.base, ease: "back.inOut(1.3)", onUpdate: light }, "rotate")
      .to(q("[data-sr-media]"), { rotation: 90, width: scr.h, height: scr.w, duration: DUR.base, ease: "back.inOut(1.3)" }, "rotate")

      /* ===== F · PUSH-IN — the phone screen becomes the player */
      .addLabel("push", "rotate+=1.2")
      .call(label("SC 05 — PLAY"), [], "push")
      .call(() => whoosh(0.9, false), [], "push")
      .to(q("[data-sr-ring]"), { scale: 2.2, autoAlpha: 0, duration: 0.9, ease: EASE.in }, "push")
      .to(q("[data-sr-shadow]"), { opacity: 0, duration: 0.4 }, "push")
      .to(q("[data-sr-sky]"), { opacity: 0, duration: 0.9, ease: "power2.inOut" }, "push+=0.1")
      .to(q("[data-sr-backdrop]"), { opacity: 1, duration: 0.9 }, "push+=0.1")
      .to(q("[data-sr-bar]"), { height: 0, duration: 0.7 }, "push")
      .to(q("[data-sr-hud]"), { autoAlpha: 0, duration: 0.4 }, "push")
      .to(q("[data-sr-phone]"), { ...applyFinal.current(false).vars, duration: 1.15, ease: EASE.inOut }, "push+=0.05")
      .to(q("[data-sr-media]"), { width: () => applyFinal.current(false).r.w, height: () => applyFinal.current(false).r.h, duration: 1.15, ease: EASE.inOut }, "push+=0.05")
      .to(q("[data-sr-pad]"), { padding: 0, duration: 0.6 }, "push+=0.6")
      .to(q("[data-sr-bezel], [data-sr-back]"), { opacity: 0, duration: 0.45, ease: "power2.in" }, "push+=0.65")
      .to(q("[data-sr-screen]"), { borderRadius: 0, duration: 0.5 }, "push+=0.7")
      .call(() => {
        stopLoops();
        setPhase("reel");
      }, [], "push+=1.25");

    shakeAt(tl, "frame", 16);
    shakeAt(tl, "break", 10);
    shakeAt(tl, "cut+=0.58", 14);
    shakeAt(tl, "phone+=0.6", 6);

    // HUD timecode follows the timeline
    tl.eventCallback("onUpdate", () => {
      const tc = q("[data-sr-tc]")[0] as HTMLElement;
      const f = tl.time() * 24;
      if (tc) tc.textContent = `00:00:${pad2(f / 24)}:${pad2(f % 24)}`;
    });

    return { tl, stopLoops, startLoops };
  }, [aspect, frame, reel.introStart]);  

  const ctl = useRef<{ stopLoops: () => void; startLoops: () => void } | null>(null);

  // Drive the intro / player from the gallery's single-play state.
  useEffect(() => {
    const v = video.current!;
    if (!ready) return;
    if (reducedMotion() && phaseRef.current !== "reel") {
      // No intro for reduced motion: show the player directly.
      setupGsap();
      setPhase("reel");
      gsap.set(card.current!.querySelectorAll("[data-sr-scene]:not([data-sr-scene='phone']), [data-sr-sky], [data-sr-hud], [data-sr-bar], [data-sr-ring], [data-sr-bezel], [data-sr-back], [data-sr-shadow]"), { autoAlpha: 0 });
      gsap.set(card.current!.querySelectorAll("[data-sr-scene='phone'], [data-sr-backdrop]"), { autoAlpha: 1 });
      gsap.set(card.current!.querySelectorAll("[data-sr-phone]"), { xPercent: -50, yPercent: -50, autoAlpha: 1 });
      gsap.set(card.current!.querySelectorAll("[data-sr-pad]"), { padding: 0 });
      applyFinal.current = (immediate) => {
        const el = card.current!;
        const W = el.clientWidth;
        const H = el.clientHeight;
        const r = W / H > aspect ? { w: H * aspect, h: H } : { w: W, h: W / aspect };
        if (immediate) {
          gsap.set(el.querySelectorAll("[data-sr-phone]"), { width: r.h, height: r.w, rotation: -90 });
          gsap.set(el.querySelectorAll("[data-sr-media]"), { width: r.w, height: r.h, rotation: 90, xPercent: -50, yPercent: -50 });
        }
        return { vars: {}, r };
      };
      applyFinal.current(true);
      videoStarted.current = true;
    }

    if (phaseRef.current === "loading" && shouldPlay) {
      const built = build();
      master.current = built.tl;
      ctl.current = built;
      setPhase("intro");
      built.tl.play();
      return;
    }
    if (phaseRef.current === "intro") {
      if (shouldPlay) {
        master.current?.play();
        if (videoStarted.current) playWithSound(v, () => audibleRef.current, () => wantRef.current);
        ctl.current?.startLoops();
      } else {
        master.current?.pause();
        v.pause();
        card.current?.querySelectorAll<HTMLVideoElement>("[data-sr-loop]").forEach((l) => l.pause());
      }
      return;
    }
    if (phaseRef.current === "reel") {
      if (shouldPlay) playWithSound(v, () => audibleRef.current, () => wantRef.current);
      else v.pause();
    }
  }, [ready, shouldPlay, phase, build]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!audible) v.muted = true;
    else if (audioUnlocked()) v.muted = false;
  }, [audible]);

  // Intro sound design follows the same preference.
  useEffect(() => {
    if (!g.soundOn) disableSfx();
    else if (audioUnlocked()) enableSfx();
  }, [g.soundOn]);

  // Keep the player fitted when the card resizes.
  useEffect(() => {
    const el = card.current!;
    const ro = new ResizeObserver(() => phaseRef.current === "reel" && applyFinal.current(true));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      master.current?.kill();
    },
    [],
  );

  /* ---------------------------------------------------------------- controls */
  const soundOn = () => {
    enableSfx();
    const v = video.current;
    if (v) v.muted = false; // inside the click → allowed with sound
    g.setSoundOn(true);
  };
  const toggleSound = () => {
    const v = video.current;
    if (g.soundOn && v && !v.muted) {
      g.setSoundOn(false);
      v.muted = true;
      disableSfx();
    } else soundOn();
  };
  const togglePlay = () => (shouldPlay ? g.userPause(reel.id) : g.engage(reel.id));
  const skip = () => {
    const tl = master.current;
    if (!tl) return;
    tl.progress(1, true); // jump to the end without firing every SFX on the way
    ctl.current?.stopLoops();
    const v = video.current!;
    if (!videoStarted.current) {
      v.currentTime = reel.introStart ?? 0;
      videoStarted.current = true;
    }
    applyFinal.current(true);
    setPhase("reel");
  };
  const replay = () => {
    const tl = master.current;
    if (!tl) return;
    setPhase("intro");
    videoStarted.current = false;
    video.current?.pause();
    tl.restart();
  };
  const fullscreen = () => {
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (card.current?.requestFullscreen) void card.current.requestFullscreen();
    else v?.webkitEnterFullscreen?.();
  };
  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = video.current;
    if (!v?.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.duration;
  };

  const chars = (t: string) =>
    t.split("").map((c, i) => (
      <span key={i} data-c className="inline-block">
        {c === " " ? " " : c}
      </span>
    ));

  return (
    <div
      ref={card}
      id="showreel"
      data-reel-card
      data-reel-id={reel.id}
      data-phase={phase}
      className="group/sr relative aspect-[4/5] w-full overflow-hidden rounded-[22px] bg-black shadow-[0_40px_120px_-40px_rgba(224,74,146,0.55)] ring-1 ring-cream/10 [container-type:size] sm:aspect-video"
      aria-label="Showreel"
    >
      {/* Letterbox backdrop for the final player on tall (mobile) cards */}
      <div data-sr-backdrop className="absolute inset-0 opacity-0" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frame} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />
        <div className="absolute inset-0 bg-ink/55" />
      </div>

      <div data-sr-camera className="absolute inset-0">
        {/* A · IGNITION */}
        <div data-sr-scene="ignite" className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-[3cqh]">
            <div data-sr-mono className="relative aspect-[3/2] w-[clamp(110px,22cqw,240px)]">
              {[["#ff2e6a", true], ["#2ee6ff", true], ["", false]].map(([tint, rgb], i) => (
                <svg
                  key={i}
                  {...(rgb ? { "data-sr-rgb": true } : {})}
                  viewBox="0 0 120 80"
                  className="absolute inset-0 h-full w-full"
                  style={{ mixBlendMode: rgb ? "screen" : "normal", opacity: rgb ? 0.6 : 1 }}
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={`srg${i}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#7a4bd0" />
                      <stop offset=".45" stopColor="#e0559a" />
                      <stop offset=".8" stopColor="#ff9466" />
                      <stop offset="1" stopColor="#ffd66b" />
                    </linearGradient>
                  </defs>
                  <path data-sr-mono-path d={MONO} fill={(tint as string) || `url(#srg${i})`} stroke={(tint as string) || "#fff4dc"} strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              ))}
            </div>
            <p data-sr-tag className="text-[clamp(10px,1.4cqw,13px)] font-bold uppercase tracking-[0.6em] text-cream/80">
              Showreel
            </p>
          </div>
        </div>

        {/* B · FRAME BREAK */}
        <div data-sr-scene="frame" className="invisible absolute inset-0">
          <div data-sr-frame className="absolute inset-0 overflow-hidden" style={{ background: `center/cover url(${frame})` }}>
            <div className="scanlines absolute inset-0" />
          </div>
          <svg data-sr-crack className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {CRACKS.map((p, i) => (
              <polyline key={i} points={p} fill="none" stroke="#fff4dc" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <h3 data-sr-frame-type className="font-display absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[clamp(2.4rem,13cqw,11rem)] text-sun drop-shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            <span className="reveal-mask">{chars("EVERY FRAME")}</span>
          </h3>
          <canvas data-sr-shards className="absolute inset-0 h-full w-full" />
        </div>

        {/* C · ORBIT */}
        <div data-sr-scene="orbit" className="invisible absolute inset-0 grid place-items-center" style={{ perspective: "900px" }}>
          <div data-sr-speed aria-hidden="true" className="absolute left-1/2 top-1/2 h-0 w-0">
            {SPEED.map((i) => (
              <span
                key={i}
                className="absolute left-0 top-0 block w-[2px] origin-top"
                style={{
                  height: "80cqw",
                  transform: `rotate(${(360 / SPEED.length) * i}deg) translateY(${10 + (i % 4) * 4}cqw)`,
                  background: `linear-gradient(to bottom, transparent, ${i % 3 ? "#f7a3d0" : "#fff0a0"}, transparent)`,
                }}
              />
            ))}
          </div>
          <div data-sr-orbit className="h-0 w-0 [transform-style:preserve-3d]">
            <Orbit images={stills} count={12} className="h-0 w-0" style={{ ["--orbit-r" as string]: "min(420px, 40cqw)", ["--orbit-w" as string]: "clamp(110px, 22cqw, 260px)" }} />
          </div>
          <h3 data-sr-matters className="font-display pointer-events-none absolute text-[clamp(2.6rem,14cqw,12rem)] text-transparent" style={{ WebkitTextStroke: "2px #fff0a0" }}>
            {chars("MATTERS")}
          </h3>
        </div>

        {/* E/F · PHONE + RING OF LOOPS → PLAYER */}
        <div data-sr-scene="phone" className="invisible absolute inset-0">
          <div data-sr-sky className="absolute inset-0 overflow-hidden" style={{ background: "var(--sunset)" }}>
            <div
              className="absolute left-1/2 top-[58%] aspect-square w-[min(62cqw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: "linear-gradient(180deg,#fff7c4,#ffd27a 40%,#ff8a8a)",
                WebkitMaskImage: "linear-gradient(180deg,#000 50%,transparent 50%),repeating-linear-gradient(180deg,#000 0 12px,transparent 12px 18px)",
                maskImage: "linear-gradient(180deg,#000 50%,transparent 50%),repeating-linear-gradient(180deg,#000 0 12px,transparent 12px 18px)",
              }}
            />
            <div className="scanlines absolute inset-0" />
          </div>
          <div data-sr-shadow className="absolute bottom-[12%] left-1/2 h-[5%] w-[34%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-xl" aria-hidden="true" />
          <div className="absolute inset-0" style={{ perspective: "1000px" }}>
            <div className="absolute left-1/2 top-1/2 h-0 w-0 [transform-style:preserve-3d]">
              {/* Ring of live 9:16 reel loops — real footage, not names */}
              <div className="absolute h-0 w-0 [transform-style:preserve-3d]" style={{ transform: "rotateX(-12deg)" }}>
                <div data-sr-ring className="absolute h-0 w-0 [transform-style:preserve-3d]">
                  {LOOPS.map((n, i) => (
                    <div
                      key={n}
                      className="absolute overflow-hidden rounded-[10px] bg-ink-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] ring-1 ring-cream/25"
                      style={{
                        width: "var(--ring-w, 110px)",
                        aspectRatio: "9 / 16",
                        left: "calc(var(--ring-w, 110px) / -2)",
                        top: "calc(var(--ring-w, 110px) * -0.889)",
                        transform: `rotateY(${(360 / LOOPS.length) * i}deg) translateZ(var(--ring-r, 380px))`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/reels/loop${n}.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      <video
                        data-sr-loop
                        data-src={`/reels/loop${n}.mp4`}
                        muted
                        loop
                        playsInline
                        preload="none"
                        className="absolute inset-0 hidden h-full w-full object-cover md:block"
                        aria-hidden="true"
                      />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[9px] font-semibold text-cream/90">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ff4d6d]" /> {String(n).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* The phone */}
              <div data-sr-phone className="invisible absolute left-0 top-0 [transform-style:preserve-3d]">
                {/* back panel — seen while it spins in */}
                <div
                  data-sr-back
                  className="absolute inset-0 rounded-[14%/6.5%] [backface-visibility:hidden]"
                  style={{
                    transform: "rotateY(180deg) translateZ(6px)",
                    background: "linear-gradient(150deg,#4a3656 0%,#1a121f 55%,#3a2a44 100%)",
                    boxShadow: "inset 0 0 0 1.5px rgba(255,244,220,.18)",
                  }}
                >
                  <span className="absolute left-[9%] top-[5%] h-[17%] w-[38%] rounded-[22%] bg-black/70 ring-1 ring-cream/15" />
                  <span className="font-display absolute bottom-[10%] left-1/2 -translate-x-1/2 text-[clamp(14px,2cqw,24px)] text-cream/40">KP</span>
                </div>
                {/* front */}
                <div className="absolute inset-0 [backface-visibility:hidden]">
                  <div
                    data-sr-bezel
                    className="absolute inset-0 rounded-[14%/6.5%]"
                    style={{
                      background: "linear-gradient(145deg,#3a2c44 0%,#120d17 45%,#2b2133 100%)",
                      boxShadow:
                        "inset 0 0 0 1.5px rgba(255,244,220,.22), inset 0 0 0 4px #0b080e, 0 50px 120px -20px rgba(20,0,30,.85), 0 0 80px -10px rgba(224,85,154,.55)",
                    }}
                  >
                    <span className="absolute left-1/2 top-[1.8%] z-[3] h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
                  </div>
                  <div data-sr-pad className="absolute inset-0">
                    <div data-sr-screen className="relative h-full w-full overflow-hidden bg-black">
                      <div data-sr-media className="absolute left-1/2 top-1/2">
                        <video
                          ref={video}
                          playsInline
                          muted
                          preload="none"
                          poster={reel.poster}
                          className="h-full w-full object-cover"
                          onClick={phase === "reel" ? togglePlay : undefined}
                          onPlay={() => setPlaying(true)}
                          onPause={() => setPlaying(false)}
                          onVolumeChange={(e) => setVMuted(e.currentTarget.muted)}
                          // When the featured reel finishes, the intro plays again (intro → reel → intro …).
                          onEnded={() => phaseRef.current === "reel" && replay()}
                          onTimeUpdate={(e) => {
                            const vv = e.currentTarget;
                            if (bar.current && vv.duration) bar.current.style.transform = `scaleX(${vv.currentTime / vv.duration})`;
                            if (timeEl.current && vv.duration) timeEl.current.textContent = `${fmt(vv.currentTime)} / ${fmt(vv.duration)}`;
                          }}
                          aria-label="Best reel"
                        />
                      </div>
                      <div
                        data-sr-sheen
                        className="pointer-events-none absolute inset-0 transition-opacity duration-500 group-data-[phase=reel]/sr:opacity-0"
                        style={{
                          backgroundImage: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,.22) 45%, rgba(255,255,255,.05) 55%, transparent 70%)",
                          backgroundSize: "300% 100%",
                          backgroundPosition: "50% 0",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div data-sr-flash className="pointer-events-none absolute inset-0 bg-cream opacity-0" />
      <div data-sr-bar className="pointer-events-none absolute inset-x-0 top-0 h-0 bg-black" />
      <div data-sr-bar className="pointer-events-none absolute inset-x-0 bottom-0 h-0 bg-black" />
      <div data-sr-hud className="pointer-events-none absolute inset-x-3 top-2.5 flex justify-between font-mono text-[10px] tracking-[0.2em] text-cream/75 sm:inset-x-5 sm:top-3.5 sm:text-[11px]">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ff4d6d]" style={{ animation: "blink 1s steps(1) infinite" }} />
          REC <span data-sr-tc>00:00:00:00</span>
        </span>
        <span data-sr-label className="hidden sm:inline">
          SHOWREEL
        </span>
      </div>

      {/* Controls */}
      {phase !== "reel" ? (
        <div className="absolute inset-x-3 bottom-3 z-[5] flex items-center justify-between gap-2 sm:inset-x-5 sm:bottom-4">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!vMuted}
            className={`flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur-md hover:border-sun ${
              vMuted && g.soundOn ? "animate-pulse border-sun bg-sun text-ink" : "border-cream/25 bg-ink/55 text-cream"
            }`}
          >
            {!vMuted ? <SoundOnIcon className="h-4 w-4" /> : <SoundOffIcon className="h-4 w-4" />}
            <span>{!vMuted ? "Sound on" : g.soundOn ? "Tap for sound" : "Sound off"}</span>
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={togglePlay} aria-label={shouldPlay ? "Pause" : "Play"} className="grid h-10 w-10 place-items-center rounded-full border border-cream/25 bg-ink/55 text-cream backdrop-blur-md hover:border-sun">
              {shouldPlay ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
            </button>
            <button type="button" onClick={skip} disabled={phase !== "intro"} className="min-h-[40px] rounded-full bg-cream/90 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-ink hover:bg-sun disabled:opacity-40">
              Skip intro
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`absolute inset-x-0 bottom-0 z-[5] bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-300 ${
            playing ? "opacity-0 focus-within:opacity-100 group-hover/sr:opacity-100 [@media(hover:none)]:opacity-100" : ""
          }`}
        >
          <div role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} onClick={seekTo} className="flex h-5 cursor-pointer items-center"
            onKeyDown={(e) => {
              const vv = video.current;
              if (!vv) return;
              if (e.key === "ArrowRight") vv.currentTime = Math.min(vv.duration || 0, vv.currentTime + 5);
              if (e.key === "ArrowLeft") vv.currentTime = Math.max(0, vv.currentTime - 5);
            }}
          >
            <span className="h-1 w-full overflow-hidden rounded-full bg-cream/25">
              <span ref={bar} className="block h-full origin-left bg-gradient-to-r from-pink to-sun" style={{ transform: "scaleX(0)" }} />
            </span>
          </div>
          <div className="flex items-center gap-1 text-cream">
            <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream/15">
              {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
            </button>
            <button type="button" onClick={toggleSound} aria-label={!vMuted ? "Mute" : "Unmute"} className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream/15">
              {!vMuted ? <SoundOnIcon className="h-4 w-4" /> : <SoundOffIcon className="h-4 w-4" />}
            </button>
            <span ref={timeEl} className="ml-1 font-mono text-[11px] tabular-nums text-cream/75">0:00</span>
            {vMuted && (
              <button type="button" onClick={soundOn} className="ml-2 whitespace-nowrap rounded-full bg-cream/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] hover:bg-cream/25">
                Tap for sound
              </button>
            )}
            <button type="button" onClick={replay} aria-label="Replay intro" className="ml-auto rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/80 hover:bg-cream/15">
              <span className="hidden sm:inline">Replay intro</span>
              <span className="text-base sm:hidden" aria-hidden="true">↺</span>
            </button>
            <button type="button" onClick={fullscreen} aria-label="Full screen" className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream/15">
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

/** Frame break, drawn on one canvas (pseudo-3D) — returns a nestable timeline so it pauses with the intro. */
function shatter(canvas: HTMLCanvasElement, src: string, cw: number, ch: number) {
  const tl = gsap.timeline();
  const g2 = canvas.getContext("2d");
  if (!g2) return tl;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const img = new Image();
  img.src = src;
  const polys = SHARDS.map((sh) =>
    sh.points.split(",").map((pt) => {
      const [px, py] = pt.trim().split(" ").map((v) => parseFloat(v) / 100);
      return [px * cw, py * ch] as [number, number];
    }),
  );
  const state = SHARDS.map(() => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, o: 1 }));
  const draw = () => {
    if (canvas.width !== Math.round(cw * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const iw = img.naturalWidth || 16;
    const ih = img.naturalHeight || 9;
    const sc = Math.max(cw / iw, ch / ih);
    const dw = iw * sc;
    const dh = ih * sc;
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    g2.clearRect(0, 0, cw, ch);
    state.forEach((st, i) => {
      if (st.o <= 0.01) return;
      const cx = (SHARDS[i].cx / 100) * cw;
      const cy = (SHARDS[i].cy / 100) * ch;
      const persp = 1100 / Math.max(120, 1100 - st.z);
      g2.save();
      g2.globalAlpha = st.o;
      g2.translate(cx + st.x * persp, cy + st.y * persp);
      g2.rotate(st.rz);
      g2.scale(persp * Math.cos(st.ry), persp * Math.cos(st.rx));
      g2.translate(-cx, -cy);
      g2.beginPath();
      polys[i].forEach(([px, py], k) => (k ? g2.lineTo(px, py) : g2.moveTo(px, py)));
      g2.closePath();
      g2.clip();
      g2.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      g2.strokeStyle = "rgba(255,244,220,0.55)";
      g2.lineWidth = 1;
      g2.stroke();
      g2.restore();
    });
  };
  tl.eventCallback("onUpdate", draw);
  state.forEach((st, i) => {
    tl.fromTo(
      st,
      { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, o: 1 },
      {
        x: (SHARDS[i].cx - 50) * cw * 0.022 * gsap.utils.random(0.8, 1.6),
        y: (SHARDS[i].cy - 50) * ch * 0.022 * gsap.utils.random(0.8, 1.6),
        z: gsap.utils.random(250, 900),
        rx: gsap.utils.random(-4, 4),
        ry: gsap.utils.random(-4, 4),
        rz: gsap.utils.random(-1.6, 1.6),
        o: 0,
        duration: gsap.utils.random(0.9, 1.4),
        ease: "power3.out",
      },
      Math.random() * 0.12,
    );
  });
  return tl;
}
