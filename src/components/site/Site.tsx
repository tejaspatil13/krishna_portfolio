"use client";

import type { SiteContent } from "@/lib/types";
import { bestReel } from "@/lib/video";
import { SmoothScroll } from "./SmoothScroll";
import { GalleryController } from "./gallery/GalleryController";
import { AutoScrollToWork } from "./AutoScrollToWork";
import { SoundPrompt } from "./SoundPrompt";
import { EnterGate } from "./EnterGate";
import { Cursor } from "./Cursor";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Marquee } from "./Marquee";
import { Work } from "./Work";
import { ZoomCut } from "./ZoomCut";
import { Packages } from "./Packages";
import { Process } from "./Process";
import { Contact } from "./Contact";

export function Site({ content }: { content: SiteContent }) {
  const reels = content.reels;
  const stills = reels.flatMap((r) => [r.poster, ...(r.stills ?? [])]).filter(Boolean) as string[];
  const best = bestReel(reels);
  // The zoom-through cut plays the second featured reel (the first after the best reel).
  const second = reels.find((r) => r !== best);

  return (
    <SmoothScroll>
      <GalleryController>
        <>
          <EnterGate />
          <AutoScrollToWork />
          <SoundPrompt />
          <Cursor />
          <a
            href="#work"
            className="sr-only z-[120] rounded-full bg-sun px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to work
          </a>
          <Nav contact={content.contact} />
          <main>
            <Hero hero={content.hero} />
            <Marquee />
            <Work work={content.work} reels={reels} />
            <ZoomCut reel={second} />
            <Packages section={content.packagesSection} packages={content.packages} contact={content.contact} images={stills} />
            <Process process={content.process} images={stills} />
            <Contact contact={content.contact} images={stills} />
          </main>
          <div className="grain" aria-hidden="true" />
        </>
      </GalleryController>
    </SmoothScroll>
  );
}
