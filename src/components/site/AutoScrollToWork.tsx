"use client";

import { useEffect } from "react";
import { reducedMotion } from "./motion";
import { onEntered } from "./audio";
import { useSmoothScroll } from "./SmoothScroll";

/**
 * On every open/reload: let the hero land, then glide to the showreel (the
 * first item in Work), which starts playing as it arrives.
 *  - Runs once per page load — never loops.
 *  - A deep link (#packages, #contact …) is respected and wins.
 *  - Any scroll / tap / key from the visitor before it fires cancels it.
 */
export function AutoScrollToWork() {
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    if (location.hash && location.hash !== "#top") {
      // Deep link: land on the requested section once the visitor has entered.
      return onEntered(() => {
        if (document.querySelector(location.hash)) requestAnimationFrame(() => scrollTo(location.hash, { immediate: true }));
      });
    }
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    const events = ["wheel", "touchmove", "keydown", "pointerdown"] as const;

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready ?? Promise.resolve();
    // A brief beat on the hero (fonts/layout settled), then glide — same glide speed as before.
    // Starts after the Enter tap (that tap must not count as "the visitor scrolled away").
    const go = () => {
      if (cancelled || window.scrollY > 40) return;
      const reel = document.getElementById("showreel");
      if (!reel) return;
      const h = reel.getBoundingClientRect().height;
      const offset = -Math.max(76, (window.innerHeight - h) / 2);
      scrollTo(reel, { offset, duration: 2.8, immediate: reducedMotion() });
    };
    const offEntered = onEntered(() => {
      events.forEach((e) => window.addEventListener(e, cancel, { passive: true, once: true }));
      Promise.all([fonts, wait(reducedMotion() ? 150 : 450)]).then(go);
    });
    return () => {
      offEntered();
      cancelled = true;
      events.forEach((e) => window.removeEventListener(e, cancel));
    };
  }, [scrollTo]);

  return null;
}
