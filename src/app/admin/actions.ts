"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import {
  adminConfigured,
  checkPassword,
  clearLogin,
  isAdmin,
  loginThrottled,
  recordFailedLogin,
} from "@/lib/auth";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/session";
import { CONTENT_TAG } from "@/lib/content";
import { getStore, mutateContent, type UploadTarget } from "@/lib/store";
import { parseVideoUrl } from "@/lib/video";
import type { Package, ProcessStep, Reel, SiteContent } from "@/lib/types";
import { LIMITS, POSTER_TYPES, VIDEO_TYPES } from "@/lib/limits";

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function guard() {
  if (!(await isAdmin())) throw new Error("Not authorised");
}

function done() {
  updateTag(CONTENT_TAG);
}

function str(v: unknown, max: number, field: string, { required = false } = {}): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw new ValidationError(`${field} is required.`);
  if (s.length > max) throw new ValidationError(`${field} must be ${max} characters or fewer.`);
  return s;
}

class ValidationError extends Error {}

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    await guard();
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ValidationError) return { ok: false, error: e.message };
    if (e instanceof Error && e.message === "Not authorised")
      return { ok: false, error: "Your session has expired. Please log in again." };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/* ---------------------------------- auth ---------------------------------- */

export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  if (!adminConfigured()) {
    return { error: "Admin login isn't configured. Set ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) and SESSION_SECRET." };
  }
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  if (loginThrottled(ip)) return { error: "Too many attempts. Try again in 15 minutes." };

  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  if (!password || password.length > 200 || !(await checkPassword(password))) {
    recordFailedLogin(ip);
    return { error: "Incorrect password." };
  }
  clearLogin(ip);
  (await cookies()).set(SESSION_COOKIE, await signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* ---------------------------------- reels --------------------------------- */

const EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function prepareReelUpload(input: {
  videoType: string;
  videoSize: number;
  posterType?: string;
  posterSize?: number;
}): Promise<Result<{ video: UploadTarget; poster?: UploadTarget }>> {
  return run(async () => {
    if (!VIDEO_TYPES.includes(input.videoType))
      throw new ValidationError("Please upload an MP4, WebM or MOV video.");
    if (!(input.videoSize > 0) || input.videoSize > LIMITS.videoBytes)
      throw new ValidationError(`Videos must be under ${LIMITS.videoMb} MB.`);
    const id = randomUUID();
    const store = getStore();
    const video = await store.createUpload(`reels/${id}.${EXT[input.videoType]}`, input.videoType);
    let poster: UploadTarget | undefined;
    if (input.posterType) {
      if (!POSTER_TYPES.includes(input.posterType)) throw new ValidationError("Cover must be JPG, PNG or WebP.");
      if (!(input.posterSize! > 0) || input.posterSize! > LIMITS.posterBytes)
        throw new ValidationError("Cover image is too large.");
      poster = await store.createUpload(`reels/${id}-poster.${EXT[input.posterType]}`, input.posterType);
    }
    return { video, poster };
  });
}

const dim = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 && n < 10000 ? Math.round(n) : undefined);

export async function addUploadedReel(input: { videoPath: string; posterPath?: string; width?: number; height?: number }): Promise<Result> {
  return run(async () => {
    const store = getStore();
    const url = await store.confirm(input.videoPath);
    if (!url) throw new ValidationError("The upload didn't complete. Please try again.");
    const poster = input.posterPath ? await store.confirm(input.posterPath) : null;
    const reel: Reel = {
      id: randomUUID(),
      source: "upload",
      url,
      poster: poster ?? undefined,
      storagePath: input.videoPath,
      posterPath: poster ? input.posterPath : undefined,
      width: dim(input.width),
      height: dim(input.height),
      published: true,
      createdAt: new Date().toISOString(),
    };
    await mutateContent((c) => {
      c.reels.unshift(reel);
    });
    done();
  });
}

export async function preparePosterUpload(input: { type: string; size: number }): Promise<Result<UploadTarget>> {
  return run(async () => {
    if (!POSTER_TYPES.includes(input.type)) throw new ValidationError("Cover must be JPG, PNG or WebP.");
    if (!(input.size > 0) || input.size > LIMITS.posterBytes) throw new ValidationError("Cover image must be under 5 MB.");
    return getStore().createUpload(`reels/${randomUUID()}-poster.${EXT[input.type]}`, input.type);
  });
}

export async function setReelPoster(id: string, posterPath: string): Promise<Result> {
  return run(async () => {
    const url = await getStore().confirm(posterPath);
    if (!url || !posterPath.includes("-poster.")) throw new ValidationError("The cover upload didn't complete.");
    let old: string | undefined;
    await mutateContent((c) => {
      const r = c.reels.find((x) => x.id === id);
      if (!r) throw new ValidationError("Reel not found.");
      old = r.posterPath;
      r.poster = url;
      r.posterPath = posterPath;
    });
    done();
    if (old && old !== posterPath) await getStore().remove([old]).catch((e) => console.error(e));
  });
}

export async function addLinkedReel(link: string, posterPath?: string): Promise<Result> {
  return run(async () => {
    const parsed = parseVideoUrl(typeof link === "string" ? link : "");
    if ("error" in parsed) throw new ValidationError(parsed.error);
    const customPoster = posterPath ? await getStore().confirm(posterPath) : null;
    if (posterPath && (!customPoster || !posterPath.includes("-poster."))) throw new ValidationError("The cover upload didn't complete.");
    await mutateContent((c) => {
      if (c.reels.some((r) => r.url === parsed.url)) throw new ValidationError("This video is already in the gallery.");
      c.reels.unshift({
        id: randomUUID(),
        source: parsed.source,
        url: parsed.url,
        embedId: parsed.embedId,
        poster: customPoster ?? parsed.poster,
        posterPath: customPoster ? posterPath : undefined,
        published: true,
        createdAt: new Date().toISOString(),
      });
    });
    done();
  });
}

export async function setReelPublished(id: string, published: boolean): Promise<Result> {
  return run(async () => {
    await mutateContent((c) => {
      const r = c.reels.find((x) => x.id === id);
      if (!r) throw new ValidationError("Reel not found.");
      r.published = Boolean(published);
    });
    done();
  });
}

/** Marks one reel as the "best reel" (featured first + intro finale). Passing the current one clears it. */
export async function setReelFeatured(id: string, featured: boolean): Promise<Result> {
  return run(async () => {
    await mutateContent((c) => {
      if (!c.reels.some((r) => r.id === id)) throw new ValidationError("Reel not found.");
      for (const r of c.reels) r.featured = featured && r.id === id;
    });
    done();
  });
}

export async function moveReel(id: string, dir: -1 | 1): Promise<Result> {
  return run(async () => {
    await mutateContent((c) => {
      const i = c.reels.findIndex((x) => x.id === id);
      const j = i + (dir === -1 ? -1 : 1);
      if (i < 0 || j < 0 || j >= c.reels.length) return;
      [c.reels[i], c.reels[j]] = [c.reels[j], c.reels[i]];
    });
    done();
  });
}

export async function deleteReel(id: string): Promise<Result> {
  return run(async () => {
    let removed: Reel | undefined;
    await mutateContent((c) => {
      const i = c.reels.findIndex((x) => x.id === id);
      if (i < 0) throw new ValidationError("Reel not found.");
      [removed] = c.reels.splice(i, 1);
    });
    done();
    // Only files this app uploaded (tracked storage paths) are deleted.
    const paths = [removed?.storagePath, removed?.posterPath].filter(Boolean) as string[];
    if (paths.length) {
      try {
        await getStore().remove(paths);
      } catch (e) {
        console.error("Media cleanup failed", e);
      }
    }
  });
}

/* -------------------------------- packages -------------------------------- */

export async function savePackages(input: Package[]): Promise<Result> {
  return run(async () => {
    if (!Array.isArray(input) || input.length > 12) throw new ValidationError("Too many packages.");
    const clean: Package[] = input.map((p, i) => {
      const label = `Package ${i + 1}`;
      const features = (Array.isArray(p.features) ? p.features : [])
        .map((f) => str(f, 120, `${label} feature`))
        .filter(Boolean)
        .slice(0, 12);
      return {
        id: /^[a-z0-9-]{1,64}$/i.test(p.id) ? p.id : `pkg-${randomUUID()}`,
        name: str(p.name, 60, `${label} name`, { required: true }),
        currency: str(p.currency, 6, `${label} currency`),
        price: str(p.price, 24, `${label} price`, { required: true }),
        priceNote: str(p.priceNote, 40, `${label} price note`),
        description: str(p.description, 400, `${label} description`),
        videoQuantity: str(p.videoQuantity, 80, `${label} video quantity`),
        revisions: str(p.revisions, 80, `${label} revisions`),
        delivery: str(p.delivery, 80, `${label} delivery`),
        features,
        ctaLabel: str(p.ctaLabel, 40, `${label} button label`) || "Book now",
        visible: Boolean(p.visible),
        featured: Boolean(p.featured),
      };
    });
    // At most one featured package keeps the layout intentional.
    let seen = false;
    for (const p of clean) {
      if (p.featured && !seen) seen = true;
      else p.featured = false;
    }
    await mutateContent((c) => {
      c.packages = clean;
      c.settings.pricesReviewed = true;
    });
    done();
  });
}

/* --------------------------------- content -------------------------------- */

export type ContentInput = Pick<SiteContent, "hero" | "work" | "packagesSection" | "process"> & {
  contact: Pick<SiteContent["contact"], "headline" | "description">;
};

export async function saveContent(input: ContentInput): Promise<Result> {
  return run(async () => {
    const hero = {
      eyebrow: str(input.hero?.eyebrow, 60, "Hero eyebrow"),
      headline: str(input.hero?.headline, 80, "Hero headline", { required: true }),
      description: str(input.hero?.description, 400, "Hero description"),
      designation: str(input.hero?.designation, 120, "Designation"),
      tagline: str(input.hero?.tagline, 160, "Tagline"),
      primaryCta: str(input.hero?.primaryCta, 40, "Primary button") || "Explore the work",
      secondaryCta: str(input.hero?.secondaryCta, 40, "Secondary button") || "Start a project",
    };
    const work = {
      eyebrow: str(input.work?.eyebrow, 40, "Work eyebrow"),
      headline: str(input.work?.headline, 60, "Work headline", { required: true }),
    };
    const packagesSection = {
      eyebrow: str(input.packagesSection?.eyebrow, 40, "Packages eyebrow"),
      headline: str(input.packagesSection?.headline, 80, "Packages headline", { required: true }),
      intro: str(input.packagesSection?.intro, 400, "Packages intro"),
    };
    const steps: ProcessStep[] = (Array.isArray(input.process?.steps) ? input.process.steps : [])
      .slice(0, 10)
      .map((s, i) => ({
        id: /^[a-z0-9-]{1,64}$/i.test(s.id) ? s.id : `step-${randomUUID()}`,
        title: str(s.title, 80, `Step ${i + 1} title`, { required: true }),
        description: str(s.description, 400, `Step ${i + 1} description`),
      }));
    if (!steps.length) throw new ValidationError("Add at least one process step.");
    const process = {
      eyebrow: str(input.process?.eyebrow, 40, "Process eyebrow"),
      headline: str(input.process?.headline, 100, "Process headline", { required: true }),
      intro: str(input.process?.intro, 600, "Process introduction"),
      steps,
    };
    const contactCopy = {
      headline: str(input.contact?.headline, 80, "Contact headline", { required: true }),
      description: str(input.contact?.description, 400, "Contact description"),
    };
    await mutateContent((c) => {
      c.hero = hero;
      c.work = work;
      c.packagesSection = packagesSection;
      c.process = process;
      c.contact = { ...c.contact, ...contactCopy };
    });
    done();
  });
}

export async function saveContactDetails(input: {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  whatsappMessage: string;
  instagram: string;
}): Promise<Result> {
  return run(async () => {
    const email = str(input.email, 120, "Email", { required: true });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("Enter a valid email address.");
    const phone = str(input.phone, 30, "Mobile number", { required: true });
    const whatsapp = str(input.whatsapp, 30, "WhatsApp number", { required: true });
    for (const [label, n] of [["Mobile number", phone], ["WhatsApp number", whatsapp]] as const) {
      const digits = n.replace(/\D/g, "");
      if (!/^[+\d\s()-]+$/.test(n) || digits.length < 8 || digits.length > 15)
        throw new ValidationError(`${label} should include the country code, e.g. +91 98765 43210.`);
    }
    const instagram = str(input.instagram, 200, "Instagram link");
    if (instagram && !/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]{1,40}\/?$/.test(instagram))
      throw new ValidationError("Instagram link should look like https://www.instagram.com/yourname");
    const details = {
      instagram,
      name: str(input.name, 80, "Name", { required: true }),
      email,
      phone,
      whatsapp,
      whatsappMessage: str(input.whatsappMessage, 300, "WhatsApp message"),
    };
    await mutateContent((c) => {
      c.contact = { ...c.contact, ...details };
    });
    done();
  });
}

export async function saveSettings(input: { siteTitle: string; metaDescription: string }): Promise<Result> {
  return run(async () => {
    const siteTitle = str(input.siteTitle, 90, "Page title", { required: true });
    const metaDescription = str(input.metaDescription, 300, "Meta description", { required: true });
    await mutateContent((c) => {
      c.settings = { ...c.settings, siteTitle, metaDescription };
    });
    done();
  });
}
