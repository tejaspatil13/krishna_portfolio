"use client";

import { enableSfx } from "./fx/sfx";

/**
 * Sound is ON by default. Browsers refuse audible autoplay until the visitor
 * has interacted with the page (a tap, click or key). So every video first
 * tries to play WITH sound; if the browser refuses, it plays muted and the
 * very first interaction anywhere on the page unlocks audio instantly.
 */
let unlocked = false;
let blocked = false;
const blockedListeners = new Set<(b: boolean) => void>();

/** True once a browser has refused audible autoplay (and before the first tap). */
export const audioBlocked = () => blocked && !unlocked;
export function subscribeBlocked(fn: (b: boolean) => void) {
  blockedListeners.add(fn);
  return () => void blockedListeners.delete(fn);
}
const listeners = new Set<() => void>();
const stateListeners = new Set<(u: boolean) => void>();

export function audioUnlocked() {
  if (unlocked) return true;
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return !!ua?.hasBeenActive;
}

/** Run `fn` (inside the unlocking gesture) once audio becomes available. */
export function onAudioUnlock(fn: () => void) {
  if (unlocked) return () => {};
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function subscribeUnlock(fn: (u: boolean) => void) {
  stateListeners.add(fn);
  return () => void stateListeners.delete(fn);
}

let installed = false;
export function installAudioUnlock() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    enableSfx();
    // Synchronous, still inside the gesture → browsers allow play() with sound.
    listeners.forEach((fn) => fn());
    listeners.clear();
    stateListeners.forEach((fn) => fn(true));
    blockedListeners.forEach((fn) => fn(false));
    events.forEach((e) => window.removeEventListener(e, unlock, true));
  };
  events.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
}

/**
 * Play a video with sound if allowed; otherwise play muted and switch the
 * sound on at the first interaction. `wantSound()` is re-checked at unlock.
 */
export function playWithSound(v: HTMLVideoElement, wantSound: () => boolean, stillWanted: () => boolean) {
  v.volume = 1;
  v.muted = !wantSound();
  v.play().catch((err: DOMException) => {
    if (err?.name !== "NotAllowedError" || !stillWanted() || v.muted) return;
    if (!blocked && !unlocked) {
      blocked = true;
      blockedListeners.forEach((fn) => fn(true));
    }
    v.muted = true;
    v.play().catch(() => {});
    onAudioUnlock(() => {
      if (stillWanted() && wantSound()) {
        v.muted = false;
        v.play().catch(() => {});
      }
    });
  });
}

/* ------------------------------------------------------------------ enter gate */
let entered = false;
const enterListeners = new Set<() => void>();
export const hasEntered = () => entered;
export function onEntered(fn: () => void) {
  if (entered) {
    fn();
    return () => {};
  }
  enterListeners.add(fn);
  return () => void enterListeners.delete(fn);
}
export function markEntered() {
  if (entered) return;
  entered = true;
  enterListeners.forEach((fn) => fn());
  enterListeners.clear();
}

/**
 * Call INSIDE the Enter tap. Safari grants sound permission per <video>
 * element, so every reel element on the page is "touched" with an audible
 * play() during the gesture (then paused again unless it is already playing).
 */
export function primeMedia() {
  document.querySelectorAll<HTMLVideoElement>("video:not([data-sr-loop])").forEach((v) => {
    if (!v.paused) {
      v.muted = false;
      return;
    }
    v.muted = false;
    try {
      const p = v.play();
      v.pause();
      p?.catch(() => {});
    } catch {}
  });
}
