import { ImageResponse } from "next/og";
import { getSiteContent } from "@/lib/content";

export const alt = "Krishna Patil — Video Editor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const { hero, contact } = await getSiteContent();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(180deg,#4b2f93 0%,#8a46b3 30%,#d65aa6 58%,#f4808d 78%,#ffae6e 100%)",
          color: "#fff4dc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 10, textTransform: "uppercase", fontWeight: 700 }}>
          {contact.name}
        </div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 900, lineHeight: 1, letterSpacing: 4, textTransform: "uppercase", maxWidth: 1000 }}>
          {hero.headline}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#fff0a0" }}>{hero.designation}</div>
      </div>
    ),
    size,
  );
}
