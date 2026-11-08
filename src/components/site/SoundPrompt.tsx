"use client";

import { useEffect, useState } from "react";
import { audioBlocked, subscribeBlocked } from "./audio";
import { useGallery } from "./gallery/GalleryController";
import { SoundOnIcon } from "./icons";

/**
 * Sound is on by default. Only when the browser actually refuses audible
 * autoplay does this pill appear; the tap itself (anywhere on the page)
 * unlocks audio and the playing reel continues with sound.
 */
export function SoundPrompt() {
  const g = useGallery();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(audioBlocked()); // eslint-disable-line react-hooks/set-state-in-effect
    return subscribeBlocked(setShow);
  }, []);

  if (!show || !g.soundOn) return null;
  return (
    <button
      type="button"
      onClick={() => setShow(false)}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[85] flex min-h-[48px] -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-sun px-5 text-[13px] font-bold text-ink shadow-[0_14px_40px_-8px_rgba(255,214,107,0.8)]"
      style={{ animation: "sound-bob 2.2s ease-in-out infinite" }}
    >
      <span className="relative grid h-7 w-7 place-items-center rounded-full bg-ink text-sun">
        <span className="absolute inset-0 rounded-full border border-ink/50" style={{ animation: "pulse-ring 1.6s ease-out infinite" }} />
        <SoundOnIcon className="h-4 w-4" />
      </span>
      Tap anywhere for sound
    </button>
  );
}
