"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, onReady, PAUSE_EVENT, reducedMotion, RESUME_EVENT, ScrollTrigger, setupGsap } from "./motion";
import { useSmoothScroll } from "./SmoothScroll";
import { Monogram, ArrowUpRight, MailIcon, PhoneIcon, WhatsAppIcon } from "./icons";
import { telLink, whatsappLink } from "@/lib/video";
import type { SiteContent } from "@/lib/types";

const LINKS = [
  { href: "#top", label: "Home" },
  { href: "#work", label: "Work" },
  { href: "#packages", label: "Packages" },
  { href: "#process", label: "Process" },
  { href: "#contact", label: "Contact" },
];

export function Nav({ contact }: { contact: SiteContent["contact"] }) {
  const bar = useRef<HTMLElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const toggleBtn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { scrollTo, lock } = useSmoothScroll();

  // Hide on scroll down, reveal on scroll up; scroll progress bar.
  useEffect(() => {
    setupGsap();
    const el = bar.current!;
    gsap.set(el, { yPercent: -120, opacity: 0 });
    onReady(() => gsap.to(el, { yPercent: 0, opacity: 1, duration: 1.2, delay: 0.5 }));
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (progress.current) progress.current.style.transform = `scaleX(${self.progress})`;
        if (document.documentElement.dataset.menu === "1") return;
        const hide = self.direction === 1 && self.scroll() > 240;
        gsap.to(el, { yPercent: hide ? -120 : 0, duration: 0.6, ease: "expo.out", overwrite: "auto" });
        el.dataset.scrolled = self.scroll() > 40 ? "1" : "0";
      },
    });
    return () => st.kill();
  }, []);

  // Menu open/close choreography.
  useEffect(() => {
    const m = menu.current!;
    document.documentElement.dataset.menu = open ? "1" : "0";
    if (open) {
      lock(true);
      window.dispatchEvent(new Event(PAUSE_EVENT));
      gsap.set(m, { visibility: "visible" });
      const tl = gsap.timeline();
      tl.fromTo(
        m,
        { clipPath: "circle(0% at calc(100% - 44px) 40px)" },
        { clipPath: "circle(150% at calc(100% - 44px) 40px)", duration: reducedMotion() ? 0 : 1, ease: "expo.inOut" },
      )
        .fromTo(
          m.querySelectorAll("[data-menu-link] > span"),
          { yPercent: 110 },
          { yPercent: 0, stagger: 0.06, duration: 1 },
          "-=0.45",
        )
        .fromTo(m.querySelectorAll("[data-menu-fade]"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.05 }, "-=0.8");
      m.querySelector<HTMLElement>("[data-menu-link]")?.focus({ preventScroll: true });
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    } else if (m.style.visibility === "visible") {
      gsap.to(m, {
        clipPath: "circle(0% at calc(100% - 44px) 40px)",
        duration: reducedMotion() ? 0 : 0.8,
        ease: "expo.inOut",
        onComplete: () => {
          gsap.set(m, { visibility: "hidden" });
        },
      });
      lock(false);
      window.dispatchEvent(new Event(RESUME_EVENT));
    }
  }, [open, lock]);

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const wasOpen = open;
    setOpen(false);
    setTimeout(() => scrollTo(href), wasOpen ? 450 : 0);
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] h-[2px] bg-transparent">
        <div ref={progress} className="h-full origin-left bg-gradient-to-r from-violet via-magenta to-sun" style={{ transform: "scaleX(0)" }} />
      </div>
      <header
        ref={bar}
        data-scrolled="0"
        className="group/nav fixed inset-x-0 top-0 z-[80] px-4 pt-[max(14px,env(safe-area-inset-top))] sm:px-8 sm:pt-6"
      >
        <nav aria-label="Primary" className="mx-auto flex max-w-[1600px] items-center justify-between">
          <a href="#top" onClick={go("#top")} aria-label="Krishna Patil — back to top" className="flex items-center gap-3" data-magnetic="0.25">
            <Monogram className="h-9 w-auto drop-shadow-[0_2px_12px_rgba(224,85,154,0.45)] sm:h-11" gradientId="kp-nav" />
            <span className="hidden text-[13px] font-semibold leading-tight text-cream lg:block">
              Krishna Patil
              <span className="block text-[11px] font-normal text-cream-dim">Video Editor</span>
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#contact"
              onClick={go("#contact")}
              data-magnetic="0.3"
              className="rounded-full bg-lavender px-4 py-2.5 text-[13px] font-semibold text-ink shadow-[0_6px_24px_-6px_rgba(235,185,223,0.6)] transition-colors hover:bg-sun sm:px-5"
            >
              Let&apos;s Talk
            </a>
            <button
              ref={toggleBtn}
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
              data-magnetic="0.3"
              className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-ink/40 backdrop-blur-md transition-colors hover:border-sun"
            >
              <span className="relative block h-3 w-5">
                <span
                  className="absolute left-0 top-0 h-[2px] w-full bg-cream transition-transform duration-500 ease-cine"
                  style={{ transform: open ? "translateY(5px) rotate(45deg)" : "none" }}
                />
                <span
                  className="absolute bottom-0 left-0 h-[2px] w-full bg-cream transition-transform duration-500 ease-cine"
                  style={{ transform: open ? "translateY(-5px) rotate(-45deg)" : "none" }}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <div
        ref={menu}
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="fixed inset-0 z-[75] overflow-y-auto"
        style={{ visibility: "hidden", background: "var(--sunset-diag)", clipPath: "circle(0% at calc(100% - 44px) 40px)" }}
      >
        <div className="scanlines absolute inset-0" />
        <div className="relative mx-auto flex min-h-full max-w-[1600px] flex-col justify-between px-6 pb-10 pt-28 sm:px-12">
          <ul className="flex flex-col gap-1 sm:gap-2">
            {LINKS.map((l, i) => (
              <li key={l.href} className="flex items-baseline gap-4">
                <span data-menu-fade className="w-8 text-[12px] font-semibold text-cream/70">
                  0{i + 1}
                </span>
                <a
                  href={l.href}
                  onClick={go(l.href)}
                  data-menu-link
                  tabIndex={open ? 0 : -1}
                  className="reveal-mask font-display text-[clamp(3.2rem,12vw,8.5rem)] text-cream transition-colors hover:text-sun"
                >
                  <span>{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <div data-menu-fade className="mt-10 flex flex-col gap-4 border-t border-cream/25 pt-6 text-cream sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-cream/80">{contact.name} · Available for projects</p>
            <div className="flex flex-wrap gap-2">
              <a tabIndex={open ? 0 : -1} href={whatsappLink(contact.whatsapp, contact.whatsappMessage)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full bg-ink/25 px-4 py-2.5 text-sm backdrop-blur hover:bg-ink/50">
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
              <a tabIndex={open ? 0 : -1} href={telLink(contact.phone)} className="flex items-center gap-2 rounded-full bg-ink/25 px-4 py-2.5 text-sm backdrop-blur hover:bg-ink/50">
                <PhoneIcon className="h-4 w-4" /> Call
              </a>
              <a tabIndex={open ? 0 : -1} href={`mailto:${contact.email}`} className="flex items-center gap-2 rounded-full bg-ink/25 px-4 py-2.5 text-sm backdrop-blur hover:bg-ink/50">
                <MailIcon className="h-4 w-4" /> Email <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
