"use client";

import Lenis from "lenis";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { reducedMotion, setupGsap } from "./motion";

type ScrollToFn = (target: string | number | HTMLElement, opts?: { immediate?: boolean; offset?: number; duration?: number }) => void;
const ScrollCtx = createContext<{ scrollTo: ScrollToFn; lock: (on: boolean) => void }>({
  scrollTo: () => {},
  lock: () => {},
});

export const useSmoothScroll = () => useContext(ScrollCtx);

export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const { gsap, ScrollTrigger } = setupGsap();
    if (reducedMotion()) return;
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95 });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollTo = useCallback<ScrollToFn>((target, opts) => {
    const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target instanceof HTMLElement ? target : null;
    const offset = opts?.offset ?? 0;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el ?? (target as number), {
        immediate: opts?.immediate,
        offset,
        duration: opts?.duration ?? 1.6,
        force: true,
        // cinematic glide: slow start, long settle
        easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      });
    } else if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: opts?.immediate || reducedMotion() ? "auto" : "smooth" });
    } else if (typeof target === "number") {
      window.scrollTo({ top: target });
    }
    if (typeof target === "string" && el) history.replaceState(null, "", target === "#top" ? location.pathname : target);
  }, []);

  const lock = useCallback((on: boolean) => {
    if (lenisRef.current) {
      if (on) lenisRef.current.stop();
      else lenisRef.current.start();
    }
    document.documentElement.style.overflow = on ? "hidden" : "";
  }, []);

  return <ScrollCtx.Provider value={{ scrollTo, lock }}>{children}</ScrollCtx.Provider>;
}
