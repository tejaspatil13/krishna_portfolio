import type { CSSProperties } from "react";

/**
 * 3D ring of frames. Rotate the element with [data-orbit-ring] (rotateY) to
 * spin it; the parent supplies perspective. Radius/card size are CSS vars so
 * it scales across breakpoints.
 */
export function Orbit({
  images,
  count = 12,
  className = "",
  style,
  cardClass = "",
}: {
  images: string[];
  count?: number;
  className?: string;
  style?: CSSProperties;
  cardClass?: string;
}) {
  const list = images.length ? images : [""];
  return (
    <div className={`relative [transform-style:preserve-3d] ${className}`} style={style}>
      <div data-orbit-ring className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]" style={{ width: 0, height: 0 }}>
        {Array.from({ length: count }).map((_, i) => {
          const src = list[i % list.length];
          return (
            <div
              key={i}
              data-orbit-card
              className={`absolute overflow-hidden rounded-[14px] bg-ink-3 ring-1 ring-cream/15 [backface-visibility:hidden] ${cardClass}`}
              style={{
                width: "var(--orbit-w, 220px)",
                aspectRatio: "16 / 9",
                left: "calc(var(--orbit-w, 220px) / -2)",
                top: "calc(var(--orbit-w, 220px) * -0.28125)",
                transform: `rotateY(${(360 / count) * i}deg) translateZ(var(--orbit-r, 520px))`,
              }}
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" draggable={false} />
              )}
              <span className="scanlines absolute inset-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
