"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* ------------------------------------------------------------------------
 * Motion design system — every section draws from these tokens so the hero,
 * showreel, pricing, process and contact feel like one piece of motion.
 * ---------------------------------------------------------------------- */
export const EASE = {
  /** Entrances: fast start, long cinematic settle. */
  out: "expo.out",
  /** Camera moves and morphs. */
  inOut: "expo.inOut",
  /** Exits / pushes into something. */
  in: "expo.in",
  /** Scroll-linked movement. */
  none: "none",
  /** Playful pops (badges, chips). */
  pop: "back.out(1.8)",
} as const;

export const DUR = { fast: 0.45, base: 0.9, slow: 1.4, scene: 2.2 } as const;
export const STAGGER = { chars: 0.025, words: 0.05, items: 0.08 } as const;
/** Standard entrance: rise from below, out of a mask. */
export const ENTER = { y: 48, opacity: 0 } as const;

let registered = false;
export function setupGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: EASE.out, duration: DUR.base });
    registered = true;
    // Dev-only handle for frame-by-frame inspection of animations.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __gsap: typeof gsap }).__gsap = gsap;
  }
  return { gsap, ScrollTrigger };
}

export function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function finePointer() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function isSmallScreen() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Plays `tl` every time `trigger` enters the viewport (from either direction)
 * and rewinds it once the section is completely off screen, so it can replay
 * cleanly next time. Returns the ScrollTriggers for cleanup (gsap.context
 * reverts them automatically when created inside one).
 */
export function replayOnEnter(trigger: Element, tl: gsap.core.Timeline, { start = "top 80%", end = "bottom 20%" } = {}) {
  tl.pause(0);
  const play = ScrollTrigger.create({
    trigger,
    start,
    end,
    onEnter: () => tl.restart(),
    onEnterBack: () => tl.restart(),
  });
  const reset = ScrollTrigger.create({
    trigger,
    start: "top bottom",
    end: "bottom top",
    onLeave: () => tl.pause(0),
    onLeaveBack: () => tl.pause(0),
  });
  // Already in view on load (e.g. after a refresh mid-page).
  if (play.isActive) tl.restart();
  return [play, reset];
}

/* Signals that the page is ready for its entrance animations. */
let ready = false;
const waiters: Array<() => void> = [];
export function markReady() {
  if (ready) return;
  ready = true;
  waiters.splice(0).forEach((fn) => fn());
}
export function onReady(fn: () => void) {
  if (ready) fn();
  else waiters.push(fn);
}

/* Gallery-wide pause (menu open etc.). */
export const PAUSE_EVENT = "kp:media-pause";
export const RESUME_EVENT = "kp:media-resume";

export { gsap, ScrollTrigger };
