import type { CSSProperties, ReactNode } from "react";

/**
 * Pure-CSS phone mockup (no image assets). Size it with `width` on the parent
 * or via className; the body keeps a 9:19.5 ratio. `children` render inside
 * the screen, clipped to its rounded corners.
 */
export function Phone({
  children,
  className = "",
  style,
  screenRef,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  screenRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className={`relative aspect-[9/19.5] [transform-style:preserve-3d] ${className}`} style={style}>
      {/* side buttons */}
      <span className="absolute -left-[1.6%] top-[18%] h-[6%] w-[1.8%] rounded-l bg-[#2a2030]" />
      <span className="absolute -left-[1.6%] top-[27%] h-[9%] w-[1.8%] rounded-l bg-[#2a2030]" />
      <span className="absolute -right-[1.6%] top-[24%] h-[12%] w-[1.8%] rounded-r bg-[#2a2030]" />
      {/* body */}
      <div
        className="absolute inset-0 rounded-[14%/6.5%] p-[3.2%]"
        style={{
          background: "linear-gradient(145deg,#3a2c44 0%,#120d17 45%,#2b2133 100%)",
          boxShadow:
            "inset 0 0 0 1.5px rgba(255,244,220,.18), inset 0 0 0 4px #0b080e, 0 40px 90px -20px rgba(0,0,0,.8), 0 0 60px -10px rgba(224,85,154,.35)",
        }}
      >
        <div ref={screenRef} className="relative h-full w-full overflow-hidden rounded-[11%/5.2%] bg-black">
          {children}
          {/* dynamic island */}
          <span className="absolute left-1/2 top-[1.8%] z-[3] h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
          {/* glass glare */}
          <span
            className="pointer-events-none absolute inset-0 z-[4]"
            style={{ background: "linear-gradient(115deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 70%, rgba(255,255,255,.07) 100%)" }}
          />
        </div>
      </div>
    </div>
  );
}
