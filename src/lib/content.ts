import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { readContent } from "./store";

export const CONTENT_TAG = "site-content";

/** Cached public read. Admin saves call updateTag(CONTENT_TAG). */
export async function getSiteContent() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  return readContent();
}

export async function getPublicContent() {
  const c = await getSiteContent();
  return {
    ...c,
    reels: c.reels.filter((r) => r.published),
    packages: c.packages.filter((p) => p.visible),
  };
}
