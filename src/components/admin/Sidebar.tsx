"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { Monogram, ArrowUpRight } from "@/components/site/icons";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" },
  { href: "/admin/reels", label: "Manage Reels", icon: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm5 4v8l6-4-6-4Z" },
  { href: "/admin/packages", label: "Manage Packages", icon: "M12 3 3 7.5 12 12l9-4.5L12 3Zm-9 9 9 4.5 9-4.5M3 16.5 12 21l9-4.5" },
  { href: "/admin/content", label: "Edit Website Content", icon: "M4 20h4L19 9l-4-4L4 16v4Zm10-14 4 4" },
  { href: "/admin/contact", label: "Contact Details", icon: "M4 6h16v12H4V6Zm0 0 8 6 8-6" },
  { href: "/admin/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 z-20 border-b border-line bg-ink-2/95 backdrop-blur lg:h-[100svh] lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 py-3 lg:block lg:px-6 lg:py-8">
        <Link href="/admin" className="flex items-center gap-3">
          <Monogram className="h-9 w-auto" gradientId="kp-admin" />
          <span className="text-sm font-semibold leading-tight">
            Krishna Patil
            <span className="block text-xs font-normal text-cream-dim">Studio admin</span>
          </span>
        </Link>
        <a href="/" target="_blank" className="flex items-center gap-1 rounded-full border border-line px-3 py-2 text-xs text-cream/80 lg:hidden">
          View site <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
      <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-4 lg:pb-0">
        {NAV.map((n) => {
          const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                active ? "bg-cream/10 text-sun" : "text-cream/75 hover:bg-cream/5 hover:text-cream"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
                <path d={n.icon} />
              </svg>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden px-4 pt-8 lg:block">
        <a href="/" target="_blank" className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm text-cream/75 hover:text-cream">
          View website <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <form action={logout}>
          <button type="submit" className="w-full rounded-xl px-3.5 py-2.5 text-left text-sm text-cream/60 hover:text-[#ff8099]">
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
