"use client";

import { useEffect, useRef } from "react";
import { finePointer, gsap, reducedMotion, ScrollTrigger, setupGsap } from "../motion";
import { Phone } from "./Phone";

/**
 * Pricing showcase: a phone running a reel feed, wrapped in a 3D gyroscope —
 * an inner ring of glass "tool tokens" (the craft) and a cross-tilted outer
 * ring of real reel frames (the work) spinning the other way. Tokens stay
 * face-on (billboarded) while they orbit, pass genuinely in front of and
 * behind the phone, and spin faster when the visitor scrolls fast.
 */

const TOKENS: { name: string; color: string; d: string }[] = [
  { name: "Cut", color: "#ff8a5f", d: "M6 7a2.5 2.5 0 1 0 0-.01M6 17a2.5 2.5 0 1 0 0 .01M8.2 8.5 20 18M8.2 15.5 20 6" },
  { name: "Sound", color: "#f7a3d0", d: "M3 12h1.5M6.5 8v8M10 5v14M13.5 9v6M17 6.5v11M20.5 11v2" },
  { name: "Grade", color: "#fff0a0", d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v9l7.8 4.5M12 12 4.2 16.5" },
  { name: "Keyframes", color: "#c58bff", d: "M3 18c4-9 8-9 12-3s4 3 6-1M12 6.5l2.5 2.5L12 11.5 9.5 9z" },
  { name: "Type", color: "#ffd66b", d: "M4 19 9 5l5 14M5.8 14h6.4M15 19v-6.5a2.5 2.5 0 0 1 5 0V19M15 15.5h5" },
  { name: "Camera", color: "#8fa2ff", d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 3l3.5 7.5M21 12l-8.2.9M16.5 19.8 11 13.6M7.5 19.8l3-7.5M3 12l7.7-1.4M7.5 4.2l4 6" },
  { name: "VFX", color: "#ff5fa2", d: "M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7ZM19 15.5c.3 1.7 1 2.4 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.1 2.2-.8 2.5-2.5Z" },
  { name: "Reels", color: "#ff8a8a", d: "M7 3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm3 6v6l5-3z" },
];
const FRAMES = [1, 4, 6, 8].map((n) => `/reels/loop${n}.jpg`);

export function PhoneShowcase({ images }: { images: string[] }) {
  const root = useRef<HTMLDivElement>(null);
  const feed = images.length ? [...images, ...images] : [];

  useEffect(() => {
    setupGsap();
    const el = root.current!;
    const q = gsap.utils.selector(el);

    const ringA = q("[data-ps-ring='a']")[0] as HTMLElement;
    const ringB = q("[data-ps-ring='b']")[0] as HTMLElement;
    const tokens = q("[data-ps-token]") as HTMLElement[];
    const thumbs = q("[data-ps-thumb]") as HTMLElement[];
    const nA = tokens.length;
    const nB = thumbs.length;

    let angle = 0;
    let boost = 0;
    const place = () => {
      ringA.style.transform = `rotateY(${angle}deg)`;
      ringB.style.transform = `rotateY(${-angle * 0.75}deg)`;
      // billboard: undo each item's ring angle + the ring's spin so it always faces the camera
      tokens.forEach((t, i) => (t.style.transform = `rotateY(${-(i * (360 / nA)) - angle}deg)`));
      thumbs.forEach((t, i) => (t.style.transform = `rotateY(${-(i * (360 / nB)) + angle * 0.75}deg)`));
    };
    place();
    if (reducedMotion()) return;

    let visible = false;
    const tick = (_t: number, dt: number) => {
      if (!visible) return;
      boost *= 0.94;
      angle += (dt / 1000) * (18 + boost);
      place();
    };
    gsap.ticker.add(tick);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        q("[data-ps-phone]"),
        { rotationY: -30, rotationX: 10, y: 60 },
        { rotationY: 16, rotationX: -4, y: -20, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 } },
      );
      gsap.fromTo(q("[data-ps-gyro]"), { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 95%", end: "top 45%", scrub: 0.6 } });
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => void (boost = Math.min(160, boost + Math.abs(self.getVelocity()) / 60)),
      });
    }, el);

    let off: (() => void) | undefined;
    if (finePointer()) {
      const tx = gsap.quickTo(q("[data-ps-tilt]"), "rotationY", { duration: 0.8, ease: "power3" });
      const ty = gsap.quickTo(q("[data-ps-tilt]"), "rotationX", { duration: 0.8, ease: "power3" });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        tx(((e.clientX - r.left) / r.width - 0.5) * 18);
        ty(-((e.clientY - r.top) / r.height - 0.5) * 14);
      };
      const leave = () => (tx(0), ty(0));
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      off = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    }
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      ctx.revert();
      off?.();
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="relative mx-auto grid w-full max-w-[460px] place-items-center py-10 [--ps-r:min(38vw,230px)] [--ps-r2:min(40vw,250px)] [--ps-th:clamp(44px,9vw,62px)] [--ps-tok:clamp(42px,9vw,58px)]"
      style={{ perspective: "1100px" }}
    >
      <div data-ps-tilt className="relative [transform-style:preserve-3d]">
        {/* Gyroscope: phone + both rings share ONE 3D space, so items really pass behind the phone. */}
        <div data-ps-gyro className="absolute left-1/2 top-1/2 h-0 w-0 [transform-style:preserve-3d]">
          {/* Ring A — glass tool tokens */}
          <div className="absolute h-0 w-0 [transform-style:preserve-3d]" style={{ transform: "rotateX(-14deg)" }}>
            <span
              className="absolute rounded-full border border-sun/40 shadow-[0_0_24px_rgba(255,240,160,0.35)]"
              style={{ width: "calc(var(--ps-r) * 2)", height: "calc(var(--ps-r) * 2)", left: "calc(var(--ps-r) * -1)", top: "calc(var(--ps-r) * -1)", transform: "rotateX(90deg)" }}
            />
            <div data-ps-ring="a" className="absolute h-0 w-0 [transform-style:preserve-3d]">
              {TOKENS.map((t, i) => (
                <div key={t.name} className="absolute [transform-style:preserve-3d]" style={{ transform: `rotateY(${(360 / TOKENS.length) * i}deg) translateZ(var(--ps-r))` }}>
                  <div data-ps-token className="[transform-style:preserve-3d]">
                    <span
                      className="absolute grid place-items-center rounded-full"
                      style={{
                        width: "var(--ps-tok)",
                        height: "var(--ps-tok)",
                        left: "calc(var(--ps-tok) / -2)",
                        top: "calc(var(--ps-tok) / -2)",
                        background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,.4), rgba(255,255,255,.08) 45%, rgba(20,10,30,.6) 100%)",
                        boxShadow: `inset 0 0 0 1px rgba(255,244,220,.38), 0 10px 28px -6px rgba(0,0,0,.6), 0 0 24px -4px ${t.color}`,
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="h-[48%] w-[48%]" fill="none" stroke={t.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d={t.d} />
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ring B — real reel frames, cross-tilted, counter-rotating */}
          <div className="absolute h-0 w-0 [transform-style:preserve-3d]" style={{ transform: "rotateZ(-22deg) rotateX(18deg)" }}>
            <span
              className="absolute rounded-full border border-dashed border-pink/45"
              style={{ width: "calc(var(--ps-r2) * 2)", height: "calc(var(--ps-r2) * 2)", left: "calc(var(--ps-r2) * -1)", top: "calc(var(--ps-r2) * -1)", transform: "rotateX(90deg)" }}
            />
            <div data-ps-ring="b" className="absolute h-0 w-0 [transform-style:preserve-3d]">
              {FRAMES.map((src, i) => (
                <div key={src} className="absolute [transform-style:preserve-3d]" style={{ transform: `rotateY(${(360 / FRAMES.length) * i}deg) translateZ(var(--ps-r2))` }}>
                  <div data-ps-thumb className="[transform-style:preserve-3d]">
                    <span
                      className="absolute overflow-hidden rounded-[8px] ring-1 ring-cream/45 shadow-[0_12px_30px_-8px_rgba(0,0,0,.7)]"
                      style={{ width: "var(--ps-th)", aspectRatio: "9 / 16", left: "calc(var(--ps-th) / -2)", top: "calc(var(--ps-th) * -0.889)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-[#ff4d6d]" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div data-ps-phone className="relative [transform-style:preserve-3d]">
          <Phone className="w-[clamp(160px,36vw,230px)]">
            <div className="absolute inset-x-0 top-0 flex animate-[feed_18s_linear_infinite] flex-col gap-1.5 p-1.5">
              {feed.map((src, i) => (
                <div key={i} className="relative aspect-[9/12] w-full shrink-0 overflow-hidden rounded-[10px] bg-ink-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-x-2 bottom-2 flex items-center justify-between text-[9px] font-semibold text-cream">
                    <span className="rounded-full bg-black/45 px-1.5 py-0.5">▶ REEL {String((i % Math.max(1, images.length)) + 1).padStart(2, "0")}</span>
                    <span className="rounded-full bg-black/45 px-1.5 py-0.5">♥</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[12%] bg-gradient-to-b from-black/70 to-transparent" />
          </Phone>
        </div>
      </div>
    </div>
  );
}
