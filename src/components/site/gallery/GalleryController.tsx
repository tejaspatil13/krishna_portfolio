"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PAUSE_EVENT, RESUME_EVENT } from "../motion";
import { installAudioUnlock } from "../audio";

/**
 * Playback controller for the reel gallery.
 *  - One IntersectionObserver scores how much of each card is on screen.
 *  - Exactly one card is "active" (most visible, with hysteresis); only it plays.
 *    Until the visitor engages, that playback is a silent preview.
 *  - Tapping a card "engages" it: plays in place with sound and full controls.
 *    It stays the active card until it leaves the viewport.
 *  - A card the visitor pauses stays paused until it scrolls out of view.
 *  - Menu / intro fire a global pause.
 */
interface Ctx {
  activeId: string | null;
  engagedId: string | null;
  suspended: boolean;
  soundOn: boolean;
  isUserPaused: (id: string) => boolean;
  observe: (id: string, el: HTMLElement) => () => void;
  /** Visitor tapped play: play here, with sound. */
  engage: (id: string) => void;
  /** Hover preview (muted) — ignored while another reel is engaged. */
  preview: (id: string) => void;
  userPause: (id: string) => void;
  setSoundOn: (on: boolean) => void;
  /** Intro hand-off: continue this reel at `time`. */
  handoff: (id: string, time: number, sound: boolean) => void;
  takeSeek: (id: string) => number | undefined;
}

const GalleryCtx = createContext<Ctx | null>(null);
export const useGallery = () => {
  const c = useContext(GalleryCtx);
  if (!c) throw new Error("useGallery outside GalleryController");
  return c;
};

/** Lets non-gallery code (the intro) hand a reel over without prop-drilling. */
let external: Pick<Ctx, "handoff"> | null = null;
export const galleryHandoff = (id: string, time: number, sound: boolean) => external?.handoff(id, time, sound);

const ACTIVATE = 0.6;
const SWITCH_MARGIN = 0.18;
const LEAVE = 0.02;

export function GalleryController({ children }: { children: ReactNode }) {
  const scores = useRef(new Map<string, number>());
  const elements = useRef(new Map<Element, string>());
  const pinned = useRef<string | null>(null);
  const userPaused = useRef(new Set<string>());
  const seeks = useRef(new Map<string, number>());
  const activeRef = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [engagedId, setEngagedId] = useState<string | null>(null);
  const engagedRef = useRef<string | null>(null);
  const [suspended, setSuspended] = useState(false);
  // Sound is ON by default (the browser may still hold it until the first tap — see audio.ts).
  const [soundOn, setSoundOn] = useState(true);
  const [tick, force] = useState(0);
  const io = useRef<IntersectionObserver | null>(null);

  const setEngaged = (id: string | null) => {
    engagedRef.current = id;
    setEngagedId(id);
  };

  const pick = useCallback(() => {
    const current = activeRef.current;
    let best: string | null = null;
    let bestScore = 0;
    for (const [id, s] of scores.current) {
      if (s > bestScore) {
        best = id;
        bestScore = s;
      }
    }
    let next: string | null = current;
    const curScore = current ? scores.current.get(current) ?? 0 : 0;

    if (pinned.current) {
      next = (scores.current.get(pinned.current) ?? 0) > 0.25 ? pinned.current : null;
      if (!next) pinned.current = null;
    }
    if (!pinned.current) {
      if (!current || curScore < ACTIVATE) next = bestScore >= ACTIVATE ? best : null;
      else if (best && best !== current && bestScore - curScore > SWITCH_MARGIN) next = best;
    }
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActiveId(next);
      // Leaving an engaged reel ends its "watching" session (full controls); sound preference stays.
      if (engagedRef.current && engagedRef.current !== next) {
        engagedRef.current = null;
        setEngagedId(null);
      }
    }
  }, []);

  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
    io.current = new IntersectionObserver(
      (entries) => {
        let changedPause = false;
        for (const e of entries) {
          const id = elements.current.get(e.target);
          if (!id) continue;
          const vh = e.rootBounds?.height ?? window.innerHeight;
          const h = Math.min(e.boundingClientRect.height, vh) || 1;
          const score = e.isIntersecting ? Math.min(1, e.intersectionRect.height / h) : 0;
          scores.current.set(id, score);
          if (score <= LEAVE && userPaused.current.delete(id)) changedPause = true;
        }
        pick();
        if (changedPause) force((n) => n + 1);
      },
      { threshold: thresholds },
    );
    for (const el of elements.current.keys()) io.current.observe(el);

    const pause = () => setSuspended(true);
    const resume = () => setSuspended(false);
    const vis = () => setSuspended(document.hidden);
    window.addEventListener(PAUSE_EVENT, pause);
    window.addEventListener(RESUME_EVENT, resume);
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.current?.disconnect();
      window.removeEventListener(PAUSE_EVENT, pause);
      window.removeEventListener(RESUME_EVENT, resume);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [pick]);

  const observe = useCallback(
    (id: string, el: HTMLElement) => {
      elements.current.set(el, id);
      io.current?.observe(el);
      return () => {
        io.current?.unobserve(el);
        elements.current.delete(el);
        scores.current.delete(id);
        pick();
      };
    },
    [pick],
  );

  const engage = useCallback(
    (id: string) => {
      userPaused.current.delete(id);
      pinned.current = id;
      setEngaged(id);
      setSoundOn(true);
      setSuspended(false);
      pick();
      force((n) => n + 1);
    },
    [pick],
  );

  const preview = useCallback(
    (id: string) => {
      if (engagedRef.current && engagedRef.current !== id) return;
      if (userPaused.current.has(id)) return;
      pinned.current = id;
      pick();
    },
    [pick],
  );

  const userPause = useCallback((id: string) => {
    userPaused.current.add(id);
    if (pinned.current === id && engagedRef.current !== id) pinned.current = null;
    force((n) => n + 1);
  }, []);

  const handoff = useCallback(
    (id: string, time: number, sound: boolean) => {
      seeks.current.set(id, time);
      userPaused.current.delete(id);
      pinned.current = id;
      setEngaged(id);
      setSoundOn(sound);
      setSuspended(false);
      // The card may only just have scrolled into view; give the observer a frame.
      requestAnimationFrame(() => {
        scores.current.set(id, Math.max(scores.current.get(id) ?? 0, 0.5));
        pick();
        force((n) => n + 1);
      });
    },
    [pick],
  );

  const takeSeek = useCallback((id: string) => {
    const t = seeks.current.get(id);
    seeks.current.delete(id);
    return t;
  }, []);

  useEffect(() => {
    external = { handoff };
    return () => {
      external = null;
    };
  }, [handoff]);

  const value = useMemo<Ctx>(
    () => ({
      activeId,
      engagedId,
      suspended,
      soundOn,
      isUserPaused: (id) => userPaused.current.has(id),
      observe,
      engage,
      preview,
      userPause,
      setSoundOn,
      handoff,
      takeSeek,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId, engagedId, suspended, soundOn, observe, engage, preview, userPause, handoff, takeSeek, tick],
  );

  return <GalleryCtx.Provider value={value}>{children}</GalleryCtx.Provider>;
}
