import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { OBJECT_PATH_RE, UPLOAD_DIR } from "@/lib/store";

/** Serves locally stored uploads with HTTP Range support (needed for video seeking / Safari). */
const MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Cancel-safe file → web stream with backpressure (Readable.toWeb throws if the client aborts). */
function fileStream(file: string, start?: number, end?: number): ReadableStream<Uint8Array> {
  const node = createReadStream(file, { start, end });
  let done = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      node.on("data", (chunk) => {
        if (done) return;
        controller.enqueue(new Uint8Array(chunk as Buffer));
        if ((controller.desiredSize ?? 1) <= 0) node.pause();
      });
      node.on("end", () => {
        if (done) return;
        done = true;
        controller.close();
      });
      node.on("error", (err) => {
        if (done) return;
        done = true;
        controller.error(err);
      });
    },
    pull() {
      node.resume();
    },
    cancel() {
      done = true;
      node.destroy();
    },
  });
}

export async function GET(request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path: segments } = await ctx.params;
  const objectPath = segments.join("/");
  if (!OBJECT_PATH_RE.test(objectPath)) return new Response("Not found", { status: 404 });

  const file = path.join(UPLOAD_DIR, objectPath);
  let size: number;
  try {
    const st = await fs.stat(file);
    if (!st.isFile()) throw new Error();
    size = st.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const type = MIME[objectPath.split(".").pop()!] ?? "application/octet-stream";
  const base = {
    "content-type": type,
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
  };

  const range = request.headers.get("range");
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : size - Number(m[2]);
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    const stream = fileStream(file, start, end);
    return new Response(stream, {
      status: 206,
      headers: { ...base, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
    });
  }

  const stream = fileStream(file);
  return new Response(stream, { headers: { ...base, "content-length": String(size) } });
}
