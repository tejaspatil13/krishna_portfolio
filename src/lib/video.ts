import type { Reel, ReelSource } from "./types";

export interface ParsedVideoUrl {
  source: Exclude<ReelSource, "upload">;
  url: string;
  embedId?: string;
  poster?: string;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

/**
 * Validates a pasted video link and classifies it. Only https links to
 * recognised providers or direct video files are accepted.
 */
export function parseVideoUrl(input: string): ParsedVideoUrl | { error: string } {
  const raw = input.trim();
  if (!raw) return { error: "Paste a video link." };
  if (raw.length > 2048) return { error: "That link is too long." };

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { error: "That doesn't look like a valid link." };
  }
  if (u.protocol !== "https:") return { error: "Only secure (https) links are supported." };
  if (u.username || u.password) return { error: "Links with credentials aren't allowed." };

  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "instagram.com" || host === "m.instagram.com") {
    const kind = parts[0];
    const id = parts[1];
    if ((kind === "reel" || kind === "reels" || kind === "p" || kind === "tv") && id && /^[A-Za-z0-9_-]{5,40}$/.test(id)) {
      return {
        source: "instagram",
        embedId: id,
        url: `https://www.instagram.com/${kind === "p" ? "p" : "reel"}/${id}/`,
      };
    }
    return { error: "Use a link to a specific Instagram reel or post." };
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    let id: string | null = null;
    if (host === "youtu.be") id = parts[0] ?? null;
    else if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") id = parts[1] ?? null;
    else id = u.searchParams.get("v");
    if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) {
      return {
        source: "youtube",
        embedId: id,
        url: `https://www.youtube.com/watch?v=${id}`,
        poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
    return { error: "Couldn't find the YouTube video id in that link." };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts.find((p) => /^\d{5,12}$/.test(p));
    if (id) return { source: "vimeo", embedId: id, url: `https://vimeo.com/${id}` };
    return { error: "Couldn't find the Vimeo video id in that link." };
  }

  if (host === "res.cloudinary.com") {
    if (parts[1] !== "video") return { error: "That Cloudinary link isn't a video." };
    const uploadIdx = parts.indexOf("upload");
    let poster: string | undefined;
    if (uploadIdx > 0) {
      // Generate a cover frame from the first second of the video.
      const posterParts = [...parts];
      posterParts.splice(uploadIdx + 1, 0, "so_1,c_fill,w_720,h_1280,q_auto");
      const last = posterParts.length - 1;
      posterParts[last] = posterParts[last].replace(/\.[a-z0-9]+$/i, "") + ".jpg";
      poster = `https://res.cloudinary.com/${posterParts.join("/")}`;
    }
    return { source: "cloudinary", url: u.toString(), poster };
  }

  if (VIDEO_EXT.test(u.pathname)) {
    return { source: "mp4", url: u.toString() };
  }

  return {
    error:
      "Unsupported link. Use an Instagram reel, YouTube, Vimeo, Cloudinary, or a direct .mp4 / .webm link.",
  };
}

export function isFileSource(source: ReelSource) {
  return source === "upload" || source === "mp4" || source === "cloudinary";
}

export function whatsappLink(number: string, message?: string) {
  const digits = number.replace(/\D/g, "");
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${q}`;
}

export function telLink(number: string) {
  return `tel:+${number.replace(/\D/g, "")}`;
}

/** The reel used for the intro finale: the one marked best, else the first published one. */
export function bestReel(reels: Reel[]): Reel | undefined {
  const live = reels.filter((r) => r.published);
  return live.find((r) => r.featured) ?? live[0];
}

export function isLandscape(r: Pick<Reel, "width" | "height">) {
  return !!r.width && !!r.height && r.width > r.height * 1.05;
}
