"use client";

import { useEffect, useRef } from "react";
import type { Package, SiteContent } from "@/lib/types";
import { whatsappLink } from "@/lib/video";
import { DUR, EASE, ENTER, finePointer, gsap, reducedMotion, replayOnEnter, setupGsap, STAGGER } from "./motion";
import { ArrowIcon, CheckIcon } from "./icons";
import { PhoneShowcase } from "./fx/PhoneShowcase";

function Price({ p, big = false }: { p: Package; big?: boolean }) {
  const numeric = /^[\d,.\s]+$/.test(p.price);
  return (
    <div className="flex items-end gap-2">
      <span className={`font-display leading-none text-cream ${big ? "text-[clamp(3rem,6vw,5rem)]" : "text-[clamp(2.6rem,5vw,3.6rem)]"}`}>
        <span className="mr-1 align-top text-[0.55em]">{p.currency}</span>
        <span data-price={numeric ? p.price.replace(/[^\d.]/g, "") : undefined}>{p.price}</span>
      </span>
      {p.priceNote && <span className="mb-1.5 text-sm text-cream/75">{p.priceNote}</span>}
    </div>
  );
}

function Specs({ p, wide = false }: { p: Package; wide?: boolean }) {
  const rows = [
    ["Videos", p.videoQuantity],
    ["Revisions", p.revisions],
    ["Delivery", p.delivery],
  ].filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <dl className={`grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-cream/15 bg-cream/15 ${wide ? "sm:grid-cols-3" : ""}`}>
      {rows.map(([k, v]) => (
        <div key={k} className="bg-ink/35 px-4 py-3 backdrop-blur-sm">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/60">{k}</dt>
          <dd className="mt-1 text-[14px] font-medium leading-snug text-cream">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Features({ p, two = false }: { p: Package; two?: boolean }) {
  if (!p.features.length) return null;
  return (
    <ul className={`grid gap-2.5 ${two ? "sm:grid-cols-2" : ""}`}>
      {p.features.map((f, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[15px] text-cream/90">
          <span data-check className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sun text-ink">
            <CheckIcon className="h-3 w-3" />
          </span>
          {f}
        </li>
      ))}
    </ul>
  );
}

function Cta({ p, contact, light = true }: { p: Package; contact: SiteContent["contact"]; light?: boolean }) {
  return (
    <a
      href={whatsappLink(contact.whatsapp, `Hi ${contact.name.split(" ")[0]}, I'm interested in the ${p.name} package.`)}
      target="_blank"
      rel="noopener noreferrer"
      data-magnetic="0.2"
      className={`group inline-flex min-h-[52px] items-center justify-center gap-2 self-start rounded-full px-7 text-[15px] font-semibold transition-colors ${
        light ? "bg-sun text-ink hover:bg-cream" : "border border-cream/30 text-cream hover:border-sun hover:bg-sun hover:text-ink"
      }`}
    >
      {p.ctaLabel}
      <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </a>
  );
}

export function Packages({
  section,
  packages,
  contact,
  images,
}: {
  section: SiteContent["packagesSection"];
  packages: Package[];
  contact: SiteContent["contact"];
  images: string[];
}) {
  const root = useRef<HTMLElement>(null);
  const featured = packages.find((p) => p.featured);
  const rest = packages.filter((p) => p !== featured);

  useEffect(() => {
    setupGsap();
    const el = root.current!;
    const q = gsap.utils.selector(el);
    if (reducedMotion()) return;

    /** Count a price up from 0 and land exactly on the admin's text. */
    const countUp = (node: Element) => {
      const target = Number((node as HTMLElement).dataset.price);
      const original = (node as HTMLElement).dataset.text ?? node.textContent ?? "";
      (node as HTMLElement).dataset.text = original;
      if (!Number.isFinite(target) || target <= 0) return gsap.timeline();
      const state = { v: 0 };
      return gsap.timeline().to(state, {
        v: target,
        duration: DUR.slow,
        ease: "power3.out",
        onStart: () => void (node.textContent = "0"),
        onUpdate: () => void (node.textContent = Math.round(state.v).toLocaleString("en-IN")),
        onComplete: () => void (node.textContent = original),
      });
    };

    const ctx = gsap.context(() => {
      // HEADER — replays on every entry
      const head = q("[data-pk-head]")[0];
      const headTl = gsap
        .timeline()
        .fromTo(q("[data-pk-eyebrow]"), { opacity: 0, letterSpacing: "1.1em" }, { opacity: 1, letterSpacing: "0.55em", duration: DUR.slow })
        .fromTo(q("[data-pk-head] [data-w]"), { yPercent: 110 }, { yPercent: 0, stagger: STAGGER.words, duration: DUR.base }, 0.05)
        .fromTo(q("[data-pk-intro]"), ENTER, { y: 0, opacity: 1, duration: DUR.base }, 0.25);
      replayOnEnter(head, headTl, { start: "top 85%" });

      // FEATURED — scale-in is scroll-linked (always in sync); its content replays on entry
      const panel = q("[data-feature]")[0];
      if (panel) {
        gsap.fromTo(
          panel,
          { scale: 0.88, borderRadius: 64 },
          { scale: 1, borderRadius: 32, ease: EASE.none, scrollTrigger: { trigger: panel, start: "top bottom", end: "top 30%", scrub: 0.6 } },
        );
        const fTl = gsap
          .timeline()
          .fromTo(q("[data-feature-copy] > *"), ENTER, { y: 0, opacity: 1, stagger: STAGGER.items, duration: DUR.base })
          .fromTo(q("[data-feature] [data-check]"), { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, stagger: 0.06, duration: 0.5, ease: EASE.pop }, 0.5)
          .fromTo(q("[data-feature] [data-sweep]"), { x: 0, xPercent: -130 }, { xPercent: 130, duration: 1.4, ease: "power2.inOut" }, 0.2);
        q("[data-feature] [data-price]").forEach((n: Element) => fTl.add(countUp(n), 0.25));
        replayOnEnter(panel, fTl, { start: "top 65%", end: "bottom 30%" });
      }

      // CARDS — staggered 3D rise, prices count, checks pop; every entry
      const grid = q("[data-pk-grid]")[0];
      if (grid) {
        const cTl = gsap
          .timeline()
          .fromTo(q("[data-pk-card]"), { y: 90, opacity: 0, rotateX: -14, transformPerspective: 900 }, { y: 0, opacity: 1, rotateX: 0, stagger: 0.12, duration: DUR.slow })
          .fromTo(q("[data-pk-card] [data-check]"), { scale: 0 }, { scale: 1, stagger: 0.03, duration: 0.45, ease: EASE.pop }, 0.6)
          .fromTo(q("[data-pk-card] [data-sweep]"), { x: 0, xPercent: -130 }, { xPercent: 130, stagger: 0.12, duration: 1.2, ease: "power2.inOut" }, 0.3);
        q("[data-pk-card] [data-price]").forEach((n: Element, i: number) => cTl.add(countUp(n), 0.3 + i * 0.12));
        replayOnEnter(grid, cTl, { start: "top 80%", end: "bottom 20%" });
      }
    }, el);

    // Subtle 3D tilt on hover (desktop only)
    const offs: Array<() => void> = [];
    if (finePointer()) {
      q("[data-tilt]").forEach((card: Element) => {
        const c = card as HTMLElement;
        const rx = gsap.quickTo(c, "rotationX", { duration: 0.6, ease: "power3" });
        const ry = gsap.quickTo(c, "rotationY", { duration: 0.6, ease: "power3" });
        gsap.set(c, { transformPerspective: 1200 });
        const strength = Number(c.dataset.tilt) || 6;
        const move = (e: PointerEvent) => {
          const r = c.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * strength);
          rx(-((e.clientY - r.top) / r.height - 0.5) * strength);
          c.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
          c.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
        };
        const leave = () => {
          rx(0);
          ry(0);
        };
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
  }, [packages]);

  if (!packages.length) return null;

  return (
    <section ref={root} id="packages" aria-labelledby="packages-title" className="relative bg-ink py-24 sm:py-36">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <header data-pk-head className="mb-10 flex flex-col gap-4 sm:mb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p data-pk-eyebrow className="mb-3 text-xs font-semibold uppercase tracking-[0.55em] text-cream/70 sm:text-sm">{section.eyebrow}</p>
            <h2 id="packages-title" aria-label={section.headline} className="font-display text-[clamp(3rem,8vw,6.5rem)] text-sun">
              {section.headline.split(/\s+/).map((w, i) => (
                <span key={i} aria-hidden="true" className="reveal-mask mr-[0.2em]">
                  <span data-w className="inline-block">
                    {w}
                  </span>
                </span>
              ))}
            </h2>
          </div>
          {section.intro && <p data-pk-intro className="max-w-[420px] text-[15px] leading-relaxed text-cream-dim sm:text-base">{section.intro}</p>}
        </header>

        {featured && (
          <article
            data-feature
            className="ring-anim relative mb-6 overflow-hidden rounded-[32px] shadow-[0_40px_120px_-40px_rgba(224,74,146,0.6)] sm:mb-8"
            style={{ background: "linear-gradient(125deg,#3d2683 0%,#7e3fae 32%,#c94b9c 62%,#f0607a 85%,#ff8a5f 100%)" }}
          >
            <div className="diag-lines absolute inset-0" />
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sun/25 blur-[90px]" aria-hidden="true" />
            <span data-sweep aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-cream/25 to-transparent" style={{ transform: "translateX(-130%)" }} />
            <span aria-hidden="true" className="light-sweep pointer-events-none absolute inset-0" />
            <div className="relative grid items-center gap-8 p-5 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:p-14">
              <PhoneShowcase images={images} />
              <div data-feature-copy className="flex flex-col gap-5">
                <span className="self-start rounded-full bg-ink/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-sun backdrop-blur">
                  Most popular
                </span>
                <h3 className="font-display text-[clamp(3rem,7vw,6rem)] text-sun drop-shadow-[0_4px_20px_rgba(60,10,60,0.35)]">{featured.name}</h3>
                <Price p={featured} big />
                {featured.description && <p className="max-w-[46ch] text-[16px] font-medium leading-relaxed text-cream sm:text-lg">{featured.description}</p>}
                <Specs p={featured} wide />
                <Features p={featured} two />
                <Cta p={featured} contact={contact} />
              </div>
            </div>
          </article>
        )}

        {rest.length > 0 && (
          <div data-pk-grid className={`grid gap-6 sm:gap-8 ${rest.length === 1 ? "" : rest.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {rest.map((p) => (
              <article
                key={p.id}
                data-pk-card
                data-tilt="7"
                className="group ring-anim relative flex flex-col gap-5 overflow-hidden rounded-[28px] border border-line bg-ink-2 p-6 transition-[transform,box-shadow] duration-500 ease-cine [--ring-o:0] hover:-translate-y-1.5 hover:shadow-[0_30px_80px_-30px_rgba(224,74,146,0.55)] hover:[--ring-o:1] sm:p-9"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  style={{ background: "linear-gradient(150deg, rgba(94,58,168,.45), rgba(224,74,146,.25) 55%, rgba(255,138,95,.18))" }}
                />
                <div className="diag-lines absolute inset-0 opacity-40" aria-hidden="true" />
                {/* cursor-follow glow + entry light sweep */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "radial-gradient(420px circle at var(--mx,50%) var(--my,30%), rgba(255,240,160,.18), transparent 60%)" }}
                />
                <span data-sweep aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-cream/15 to-transparent" style={{ transform: "translateX(-130%)" }} />
                <div className="relative flex flex-col gap-5">
                  <h3 className="font-display text-[clamp(2.4rem,5vw,3.6rem)] text-sun">{p.name}</h3>
                  <Price p={p} />
                  {p.description && <p className="text-[15px] leading-relaxed text-cream/85">{p.description}</p>}
                  <Specs p={p} />
                  <Features p={p} />
                  <div className="pt-2">
                    <Cta p={p} contact={contact} light={false} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
