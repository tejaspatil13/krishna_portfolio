"use client";

/**
 * Synthesised trailer SFX (no audio files). Browsers only allow audio after a
 * user gesture, so `enable()` must be called from a click/tap handler.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

export function sfxEnabled() {
  return !!ctx && ctx.state === "running";
}

export function enableSfx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function disableSfx() {
  void ctx?.suspend();
}

function noise(dur: number) {
  const src = ctx!.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const t = ctx!.currentTime;
  src.start(t);
  src.stop(t + dur + 0.05);
  return src;
}

function env(peak: number, attack: number, decay: number) {
  const g = ctx!.createGain();
  const t = ctx!.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

/** Air whoosh — band-passed noise sweeping up then down. */
export function whoosh(dur = 0.6, up = true) {
  if (!sfxEnabled()) return;
  const t = ctx!.currentTime;
  const f = ctx!.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(up ? 300 : 3000, t);
  f.frequency.exponentialRampToValueAtTime(up ? 4000 : 250, t + dur);
  const g = env(0.5, dur * 0.55, dur * 0.45);
  noise(dur).connect(f).connect(g).connect(master!);
}

/** Cinematic impact — sub drop + noise crack. */
export function hit(strength = 1) {
  if (!sfxEnabled()) return;
  const t = ctx!.currentTime;
  const o = ctx!.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(32, t + 0.6);
  const og = env(0.9 * strength, 0.005, 0.8);
  o.connect(og).connect(master!);
  o.start(t);
  o.stop(t + 0.9);
  const f = ctx!.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1200;
  const ng = env(0.35 * strength, 0.002, 0.18);
  noise(0.25).connect(f).connect(ng).connect(master!);
}

/** Rising tension — detuned saws gliding up. */
export function riser(dur = 1.4) {
  if (!sfxEnabled()) return;
  const t = ctx!.currentTime;
  const f = ctx!.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(6000, t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + dur * 0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  f.connect(g).connect(master!);
  for (const det of [-9, 0, 7]) {
    const o = ctx!.createOscillator();
    o.type = "sawtooth";
    o.detune.value = det * 10;
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(880, t + dur);
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
}

/** Digital glitch tick. */
export function glitch() {
  if (!sfxEnabled()) return;
  const t = ctx!.currentTime;
  const o = ctx!.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(1800 + Math.random() * 1600, t);
  const g = env(0.12, 0.001, 0.05);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.07);
}
