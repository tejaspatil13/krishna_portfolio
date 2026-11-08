import type { Metadata, Viewport } from "next";
import { Anton, Outfit } from "next/font/google";
import { getSiteContent } from "@/lib/content";
import "./globals.css";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"], display: "swap" });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteContent();
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: settings.siteTitle,
    description: settings.metaDescription,
    applicationName: "Krishna Patil",
    authors: [{ name: "Krishna Patil" }],
    keywords: ["video editor", "reel editor", "motion graphics", "Krishna Patil", "video editing", "Instagram reels editor"],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      title: settings.siteTitle,
      description: settings.metaDescription,
      siteName: "Krishna Patil",
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title: settings.siteTitle, description: settings.metaDescription },
  };
}

export const viewport: Viewport = {
  themeColor: "#0c0910",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: a pre-paint script adds the `js` class before React hydrates.
    <html lang="en" className={`${anton.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
