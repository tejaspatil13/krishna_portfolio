import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;

export const PlayIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.4-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" fill="currentColor" />
  </svg>
);
export const PauseIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
  </svg>
);
export const SoundOnIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
export const SoundOffIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
    <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
export const ArrowIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ArrowUpRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
export const MailIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
export const PhoneIcon = (p: P) => (
  <svg {...base} {...p}>
    <path
      d="M6.6 3.5h2.6l1.4 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);
export const WhatsAppIcon = (p: P) => (
  <svg {...base} {...p}>
    <path
      d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M8.7 7.9c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.3.6.8 1.2 1.3 1.6.6.5 1.2.8 1.6 1 .2.1.4 0 .5-.1l.6-.8c.2-.2.3-.2.6-.1l1.6.8c.2.1.4.2.4.4 0 .3 0 1-.4 1.4-.4.5-1.3.9-2 .9-.8 0-2.3-.4-3.9-1.8-1.9-1.7-2.6-3.4-2.7-4.1-.2-.9.2-1.8.6-2.2Z"
      fill="currentColor"
    />
  </svg>
);
export const InstagramIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.2 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Monogram({ className = "", gradientId = "kp-g" }: { className?: string; gradientId?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} role="img" aria-label="Krishna Patil">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7a4bd0" />
          <stop offset=".45" stopColor="#e0559a" />
          <stop offset=".8" stopColor="#ff9466" />
          <stop offset="1" stopColor="#ffd66b" />
        </linearGradient>
      </defs>
      <path
        d="M6 6h20v26L48 6h25L47 36l28 38H50L33 50l-7 8v16H6V6Zm72 0h20c13 0 22 8 22 21s-9 21-22 21h-1v26H78V6Zm19 17v8h1c3 0 5-1.5 5-4s-2-4-5-4h-1Z"
        fill={`url(#${gradientId})`}
        stroke="#fff4dc"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
