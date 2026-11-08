import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { getStore, OBJECT_PATH_RE, UPLOAD_DIR } from "@/lib/store";
import { LIMITS } from "@/lib/limits";

/**
 * Local-storage upload endpoint (development / self-hosted). In Supabase mode
 * the browser uploads straight to a signed Storage URL instead.
 */
const TYPE_BY_EXT: Record<string, string[]> = {
  mp4: ["video/mp4"],
  webm: ["video/webm"],
  mov: ["video/quicktime"],
  jpg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
};

function magicOk(ext: string, head: Buffer) {
  const hex = head.subarray(0, 12).toString("hex");
  switch (ext) {
    case "mp4":
    case "mov":
      return head.subarray(4, 8).toString("latin1") === "ftyp" || ["moov", "mdat", "wide", "free"].includes(head.subarray(4, 8).toString("latin1"));
    case "webm":
      return hex.startsWith("1a45dfa3");
    case "jpg":
      return hex.startsWith("ffd8ff");
    case "png":
      return hex.startsWith("89504e47");
    case "webp":
      return head.subarray(0, 4).toString("latin1") === "RIFF" && head.subarray(8, 12).toString("latin1") === "WEBP";
  }
  return false;
}

export async function PUT(request: Request) {
  if (!(await verifySession((await cookies()).get(SESSION_COOKIE)?.value))) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }
  if (getStore().kind !== "local") {
    return Response.json({ error: "Direct uploads are handled by cloud storage." }, { status: 400 });
  }
  const objectPath = new URL(request.url).searchParams.get("path") ?? "";
  if (!OBJECT_PATH_RE.test(objectPath)) return Response.json({ error: "Invalid upload path" }, { status: 400 });

  const ext = objectPath.split(".").pop()!;
  const isPoster = objectPath.includes("-poster.");
  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!TYPE_BY_EXT[ext]?.includes(contentType)) {
    return Response.json({ error: "File type doesn't match" }, { status: 415 });
  }
  const max = isPoster ? LIMITS.posterBytes : LIMITS.videoBytes;
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > max) return Response.json({ error: "File too large" }, { status: 413 });
  if (!request.body) return Response.json({ error: "Empty upload" }, { status: 400 });

  const dest = path.join(UPLOAD_DIR, objectPath);
  try {
    await fs.access(dest);
    return Response.json({ error: "Already exists" }, { status: 409 });
  } catch {}
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;

  let received = 0;
  let head = Buffer.alloc(0);
  const reader = request.body.getReader();
  const fh = await fs.open(tmp, "w");

  try {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > max) throw new Error("TOO_LARGE");
        if (head.length < 16) {
          head = Buffer.concat([head, Buffer.from(value)]).subarray(0, 16);
          if (head.length >= 12 && !magicOk(ext, head)) throw new Error("BAD_TYPE");
        }
        await fh.write(value);
      }
    } catch (e) {
      await reader.cancel().catch(() => {});
      throw e;
    } finally {
      await fh.close();
    }
    if (received === 0 || head.length < 12) throw new Error("BAD_TYPE");
    await fs.rename(tmp, dest);
    return Response.json({ ok: true });
  } catch (e) {
    await fs.rm(tmp, { force: true });
    const msg = (e as Error).message;
    if (msg === "TOO_LARGE") return Response.json({ error: "File too large" }, { status: 413 });
    if (msg === "BAD_TYPE") return Response.json({ error: "That file isn't a valid video/image" }, { status: 415 });
    console.error("Upload failed", e);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
