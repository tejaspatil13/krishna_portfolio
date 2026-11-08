import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "@/components/admin/Sidebar";

export const metadata: Metadata = {
  title: "Admin · Krishna Patil",
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-[100svh] bg-ink text-cream lg:grid lg:grid-cols-[264px_1fr]">
      <Sidebar />
      <main className="min-w-0 px-4 pb-10 pt-6 sm:px-8 sm:pt-10">
        <div className="mx-auto max-w-[1100px]">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-ink-2" />}>{children}</Suspense>
        </div>
      </main>
    </div>
  );
}
