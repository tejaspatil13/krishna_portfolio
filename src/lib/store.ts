import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CONTENT } from "./defaults";
import type { SiteContent } from "./types";

/**
 * Persistence adapter.
 *  - Supabase (Postgres row + Storage bucket) when SUPABASE_URL and
 *    SUPABASE_SERVICE_ROLE_KEY are set — use this in production.
 *  - Local JSON file + local uploads folder otherwise (development / a
 *    single self-hosted server with a persistent disk).
 */
export interface UploadTarget {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  path: string;
  publicUrl: string;
}

interface Store {
  kind: "local" | "supabase";
  read(): Promise<SiteContent | null>;
  write(content: SiteContent): Promise<void>;
  createUpload(objectPath: string, contentType: string): Promise<UploadTarget>;
  /** Confirms an uploaded object exists and returns its public URL. */
  confirm(objectPath: string): Promise<string | null>;
  remove(paths: string[]): Promise<void>;
}

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");

/** Object paths are always generated server-side in this exact shape. */
export const OBJECT_PATH_RE = /^reels\/[a-f0-9-]{36}(-poster)?\.(mp4|webm|mov|jpg|png|webp)$/;

let writeChain: Promise<unknown> = Promise.resolve();

const localStore: Store = {
  kind: "local",
  async read() {
    try {
      return JSON.parse(await fs.readFile(CONTENT_FILE, "utf8")) as SiteContent;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  },
  async write(content) {
    const run = async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${CONTENT_FILE}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(content, null, 2));
      await fs.rename(tmp, CONTENT_FILE);
    };
    writeChain = writeChain.then(run, run);
    await writeChain;
  },
  async createUpload(objectPath, contentType) {
    return {
      url: `/api/admin/upload?path=${encodeURIComponent(objectPath)}`,
      method: "PUT",
      headers: { "content-type": contentType },
      path: objectPath,
      publicUrl: `/media/${objectPath}`,
    };
  },
  async confirm(objectPath) {
    if (!OBJECT_PATH_RE.test(objectPath)) return null;
    try {
      const st = await fs.stat(path.join(UPLOAD_DIR, objectPath));
      return st.isFile() && st.size > 0 ? `/media/${objectPath}` : null;
    } catch {
      return null;
    }
  },
  async remove(paths) {
    for (const p of paths) {
      if (!OBJECT_PATH_RE.test(p)) continue;
      await fs.rm(path.join(UPLOAD_DIR, p), { force: true });
    }
  },
};

const BUCKET = process.env.SUPABASE_BUCKET || "portfolio-media";
const TABLE = "site_content";

let supabase: SupabaseClient | null = null;
function sb() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

const supabaseStore: Store = {
  kind: "supabase",
  async read() {
    const { data, error } = await sb().from(TABLE).select("data").eq("id", "main").maybeSingle();
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    return (data?.data as SiteContent) ?? null;
  },
  async write(content) {
    const { error } = await sb()
      .from(TABLE)
      .upsert({ id: "main", data: content, updated_at: new Date().toISOString() });
    if (error) throw new Error(`Supabase write failed: ${error.message}`);
  },
  async createUpload(objectPath, contentType) {
    const { data, error } = await sb().storage.from(BUCKET).createSignedUploadUrl(objectPath);
    if (error || !data) throw new Error(`Could not prepare upload: ${error?.message}`);
    const { data: pub } = sb().storage.from(BUCKET).getPublicUrl(objectPath);
    return {
      url: data.signedUrl,
      method: "PUT",
      headers: { "content-type": contentType, "x-upsert": "false" },
      path: objectPath,
      publicUrl: pub.publicUrl,
    };
  },
  async confirm(objectPath) {
    if (!OBJECT_PATH_RE.test(objectPath)) return null;
    const dir = objectPath.slice(0, objectPath.lastIndexOf("/"));
    const name = objectPath.slice(objectPath.lastIndexOf("/") + 1);
    const { data, error } = await sb().storage.from(BUCKET).list(dir, { search: name, limit: 1 });
    if (error || !data?.some((f) => f.name === name)) return null;
    return sb().storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
  },
  async remove(paths) {
    const safe = paths.filter((p) => OBJECT_PATH_RE.test(p));
    if (!safe.length) return;
    const { error } = await sb().storage.from(BUCKET).remove(safe);
    if (error) throw new Error(`Could not delete media: ${error.message}`);
  },
};

export function getStore(): Store {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseStore : localStore;
}

/** Stored content merged over defaults so newly added fields always exist. */
export async function readContent(): Promise<SiteContent> {
  const stored = await getStore().read();
  if (!stored) return structuredClone(DEFAULT_CONTENT);
  const d = DEFAULT_CONTENT;
  return {
    ...d,
    ...stored,
    settings: { ...d.settings, ...stored.settings },
    hero: { ...d.hero, ...stored.hero },
    work: { ...d.work, ...stored.work },
    packagesSection: { ...d.packagesSection, ...stored.packagesSection },
    process: { ...d.process, ...stored.process },
    contact: { ...d.contact, ...stored.contact },
    reels: stored.reels ?? d.reels,
    packages: stored.packages ?? d.packages,
  };
}

let mutateChain: Promise<unknown> = Promise.resolve();

/** Serialised read-modify-write of the whole content document. */
export async function mutateContent(fn: (c: SiteContent) => void | Promise<void>): Promise<SiteContent> {
  const run = async () => {
    const content = await readContent();
    await fn(content);
    content.updatedAt = new Date().toISOString();
    await getStore().write(content);
    return content;
  };
  const p = mutateChain.then(run, run);
  mutateChain = p.catch(() => undefined);
  return p;
}
