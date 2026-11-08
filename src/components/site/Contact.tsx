"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/lib/types";
import { telLink, whatsappLink } from "@/lib/video";
import { DUR, EASE, ENTER, finePointer, gsap, reducedMotion, replayOnEnter, setupGsap, STAGGER } from "./motion";
import { useSmoothScroll } from "./SmoothScroll";
import { ArrowIcon, InstagramIcon, MailIcon, Monogram, PhoneIcon, WhatsAppIcon } from "./icons";

const FOOTER_LINKS = [
  { href: "#work", label: "Work" },
  { href: "#packages", label: "Packages" },
  { href: "#process", label: "Process" },
  { href: "#top", label: "Back to top" },
];

/**
 * The closing scene: drifting film strips of real frames, a film-leader
 * countdown that cuts to the headline, and three "channel" cards styled as
 * camera viewfinders. Every entrance replays when the visitor comes back.
 */
export function Contact({ contact, images }: { contact: SiteContent["contact"]; images: string[] }) {
  const root = useRef<HTMLElement>(null);
  const { scrollTo } = useSmoothScroll();
  const [copied, setCopied] = useState(false);
  const wa = whatsappLink(contact.whatsapp, contact.whatsappMessage);
  const strip = images.length ? [...images, ...images] : [];
  // Emphasise the last two words of the headline ("worth watching.")
  const words = contact.headline.split(/\s+/).filter(Boolean);
  const accentFrom = Math.max(0, words.length - 2);

  useEffect(() => {
    setupGsap();
    const el = root.current!;
    const q = gsap.utils.selector(el);
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      // Film strips drift against each other with the scroll.
      gsap.fromTo(q("[data-ct-strip='a']"), { xPercent: 0 }, { xPercent: -25, ease: EASE.none, scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      gsap.fromTo(q("[data-ct-strip='b']"), { xPercent: -25 }, { xPercent: 0, ease: EASE.none, scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });

      // Film-leader countdown → flash → headline. Replays on every entry.
      const num = q("[data-ct-count]")[0] as HTMLElement;
      const intro = gsap.timeline({ defaults: { ease: EASE.out } });
      intro
        .set(q("[data-ct-leader]"), { autoAlpha: 1, scale: 1 })
        .set(q("[data-ct-head] [data-w], [data-ct-fade], [data-ct-card]"), { opacity: 0 })
        .set(q("[data-ct-flash]"), { opacity: 0 });
      [3, 2, 1].forEach((n, i) => {
        intro
          .call(() => void (num.textContent = String(n)), [], i * 0.42)
          .fromTo(q("[data-ct-sweep]"), { rotate: 0 }, { rotate: 360, duration: 0.42, ease: "none" }, i * 0.42)
          .fromTo(num, { scale: 1.25, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.3 }, i * 0.42);
      });
      intro
        .to(q("[data-ct-leader]"), { scale: 2.6, autoAlpha: 0, duration: 0.45, ease: EASE.in }, 1.26)
        .fromTo(q("[data-ct-flash]"), { opacity: 0.35 }, { opacity: 0, duration: 0.35, immediateRender: false }, 1.5)
        .fromTo(q("[data-ct-head] [data-w]"), { yPercent: 115, opacity: 1 }, { yPercent: 0, opacity: 1, stagger: STAGGER.words, duration: DUR.slow, immediateRender: false }, 1.55)
        .fromTo(q("[data-ct-fade]"), ENTER, { y: 0, opacity: 1, stagger: STAGGER.items, duration: DUR.base, immediateRender: false }, 1.9)
        .fromTo(q("[data-ct-card]"), { y: 70, opacity: 0, rotateX: -18, transformPerspective: 900 }, { y: 0, opacity: 1, rotateX: 0, stagger: 0.1, duration: DUR.slow, immediateRender: false }, 2.0)
        .fromTo(q("[data-ct-corner]"), { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.02, duration: 0.6, immediateRender: false }, 2.2);
      replayOnEnter(q("[data-ct-stage]")[0], intro, { start: "top 70%", end: "bottom 30%" });

      // End credits roll in.
      const credits = gsap.timeline().fromTo(q("[data-ct-credit]"), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.1, duration: DUR.base });
      replayOnEnter(q("[data-ct-credits]")[0], credits, { start: "top 95%" });

      gsap.to(q("[data-ct-glow]"), { scale: 1.25, ease: EASE.none, scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: true } });
    }, el);

    // Tilt + cursor light on the channel cards (desktop)
    const offs: Array<() => void> = [];
    if (finePointer()) {
      q("[data-ct-card]").forEach((card: Element) => {
        const c = card as HTMLElement;
        const rx = gsap.quickTo(c, "rotationX", { duration: 0.6, ease: "power3" });
        const ry = gsap.quickTo(c, "rotationY", { duration: 0.6, ease: "power3" });
        const move = (e: PointerEvent) => {
          const r = c.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          ry((px - 0.5) * 10);
          rx(-(py - 0.5) * 10);
          c.style.setProperty("--mx", `${px * 100}%`);
          c.style.setProperty("--my", `${py * 100}%`);
        };
        const leave = () => (rx(0), ry(0));
        c.addEventListener("pointermove", move);
        c.addEventListener("pointerleave", leave);
        offs.push(() => {
          c.removeEventListener("pointermove", move);
          c.removeEventListener("pointerleave", leave);
        });
      });
    }
    return () => {
      ctx.revert();
      offs.forEach((f) => f());
    };
  }, []);

  const copyEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${contact.email}`;
    }
  };

  const channels = [
    { id: "01", label: "WhatsApp", value: contact.whatsapp, hint: "Fastest reply", href: wa, icon: WhatsAppIcon, external: true },
    { id: "02", label: "Call", value: contact.phone, hint: "Tap to call", href: telLink(contact.phone), icon: PhoneIcon, external: false },
    { id: "03", label: "Email", value: contact.email, hint: "Write to me", href: `mailto:${contact.email}`, icon: MailIcon, external: false, copy: true },
  ];

  return (
    <section ref={root} id="contact" aria-labelledby="contact-title" className="relative overflow-hidden bg-ink pb-10 pt-24 sm:pt-32">
      {/* drifting film strips of real frames */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[6%] -rotate-[4deg] opacity-[0.22]">
        {(["a", "b"] as const).map((row) => (
          <div key={row} data-ct-strip={row} className="mb-4 flex w-max gap-3 bg-black/60 px-3 py-4">
            {strip.map((src, i) => (
              <div key={i} className="relative h-[clamp(70px,10vw,130px)] shrink-0 overflow-hidden rounded-[6px]" style={{ aspectRatio: "16/9" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover grayscale" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        data-ct-glow
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[30%] left-1/2 h-[80vh] w-[140vw] -translate-x-1/2 rounded-[50%] opacity-60 blur-[100px]"
        style={{ background: "radial-gradient(closest-side, #e0559a 0%, #7e3fae 45%, transparent 80%)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink via-ink/40 to-ink" aria-hidden="true" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div data-ct-flash className="pointer-events-none absolute inset-0 z-[3] bg-cream opacity-0" aria-hidden="true" />

      <div data-ct-stage className="relative mx-auto flex max-w-[1180px] flex-col items-center px-5 text-center sm:px-8">
        {/* film-leader countdown */}
        <div className="relative grid h-[clamp(120px,18vw,190px)] w-[clamp(120px,18vw,190px)] place-items-center">
          <div data-ct-leader className="invisible absolute inset-0 grid place-items-center rounded-full border-2 border-cream/70" aria-hidden="true">
            <span className="absolute inset-[10%] rounded-full border border-cream/40" />
            <span className="absolute inset-x-0 top-1/2 h-px bg-cream/40" />
            <span className="absolute inset-y-0 left-1/2 w-px bg-cream/40" />
            <span data-ct-sweep className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, rgba(255,240,160,.55), transparent 35%)" }} />
            <span data-ct-count className="font-display relative text-[clamp(3rem,7vw,5rem)] text-sun">
              3
            </span>
          </div>
          <Monogram className="h-16 w-auto drop-shadow-[0_10px_40px_rgba(224,85,154,0.5)] sm:h-24" gradientId="kp-ct" />
        </div>

        <h2 id="contact-title" data-ct-head aria-label={contact.headline} className="font-display mt-6 max-w-[16ch] text-[clamp(2.9rem,9.5vw,8.6rem)] sm:mt-8">
          {words.map((w, i) => (
            <span key={i} aria-hidden="true" className="reveal-mask mr-[0.18em]">
              <span data-w className={`inline-block ${i >= accentFrom ? "text-sunset" : "text-cream"}`}>
                {w}
              </span>
            </span>
          ))}
        </h2>
        <p data-ct-fade className="mt-6 max-w-[46ch] text-[16px] leading-relaxed text-cream/80 sm:text-lg">
          {contact.description}
        </p>

        <a
          data-ct-fade
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          data-magnetic="0.15"
          className="ring-anim group relative mt-10 inline-flex min-h-[60px] items-center gap-3 overflow-hidden rounded-full bg-sun px-8 text-[16px] font-bold text-ink shadow-[0_20px_60px_-15px_rgba(255,214,107,0.7)] sm:text-[17px]"
        >
          <span className="light-sweep pointer-events-none absolute inset-0" aria-hidden="true" />
          <WhatsAppIcon className="h-5 w-5" />
          Start a project
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sun transition-transform duration-500 ease-cine group-hover:translate-x-1">
            <ArrowIcon className="h-4 w-4" />
          </span>
        </a>

        {/* channel cards — styled as camera viewfinders */}
        <ul className="mt-12 grid w-full grid-cols-1 gap-4 sm:mt-16 md:grid-cols-3" style={{ perspective: "1200px" }}>
          {channels.map(({ id, label, value, hint, href, icon: Icon, external, copy }) => (
            <li key={id}>
              <a
                data-ct-card
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group relative flex min-h-[170px] flex-col justify-between overflow-hidden rounded-[22px] border border-line bg-ink-2/80 p-5 text-left backdrop-blur-md transition-[border-color,box-shadow] duration-500 hover:border-pink/60 hover:shadow-[0_30px_80px_-30px_rgba(224,74,146,0.6)] sm:p-6"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "radial-gradient(360px circle at var(--mx,50%) var(--my,40%), rgba(247,163,208,.18), transparent 60%)" }}
                />
                {/* viewfinder corners */}
                {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map((c) => (
                  <span
                    key={c}
                    data-ct-corner
                    aria-hidden="true"
                    className={`absolute h-4 w-4 border-cream/50 transition-all duration-500 ease-cine group-hover:h-6 group-hover:w-6 group-hover:border-sun ${c}`}
                  />
                ))}
                <span className="relative flex items-center justify-between font-mono text-[11px] tracking-[0.2em] text-cream/60">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#ff4d6d]" style={{ animation: "blink 1.2s steps(1) infinite" }} />
                    CH {id} · {label.toUpperCase()}
                  </span>
                  <Icon className="h-5 w-5 text-pink transition-transform duration-500 ease-cine group-hover:-translate-y-0.5 group-hover:scale-110" />
                </span>
                <span className="relative mt-6 block">
                  <span className="block truncate text-[clamp(1.05rem,1.8vw,1.35rem)] font-semibold text-cream">{value}</span>
                  <span className="mt-1 flex items-center justify-between text-[13px] text-cream/55">
                    {hint}
                    {copy ? (
                      <button
                        type="button"
                        onClick={copyEmail}
                        className="relative z-[2] rounded-full border border-cream/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/80 hover:border-sun hover:text-sun"
                        aria-live="polite"
                      >
                        {copied ? "Copied ✓" : "Copy"}
                      </button>
                    ) : (
                      <ArrowIcon className="h-4 w-4 text-cream/60 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-sun" />
                    )}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        {contact.instagram && (
          <a data-ct-fade href={contact.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="mt-8 text-cream/70 hover:text-sun">
            <InstagramIcon className="h-6 w-6" />
          </a>
        )}

      </div>

      {/* end credits */}
      <footer data-ct-credits className="relative mx-auto mt-24 flex max-w-[1180px] flex-col items-center gap-6 border-t border-line px-5 pt-10 sm:mt-32">
        <div className="overflow-hidden text-center">
          <p data-ct-credit className="text-[11px] font-semibold uppercase tracking-[0.45em] text-cream/45">
            Directed &amp; edited by
          </p>
        </div>
        <div className="overflow-hidden">
          <p data-ct-credit className="font-display text-[clamp(2rem,6vw,3.5rem)] text-cream">
            {contact.name}
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-7 gap-y-2 overflow-hidden">
          {FOOTER_LINKS.map((l) => (
            <a
              key={l.href}
              data-ct-credit
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(l.href);
              }}
              className="inline-block text-[13px] font-medium text-lavender transition-colors hover:text-sun"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <p className="text-[12px] text-cream/40">© {contact.name}. All rights reserved. Crafted frame by frame.</p>
      </footer>
    </section>
  );
}
