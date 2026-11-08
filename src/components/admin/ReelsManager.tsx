"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Reel } from "@/lib/types";
import { isFileSource, parseVideoUrl } from "@/lib/video";
import { LIMITS, POSTER_TYPES, VIDEO_TYPES } from "@/lib/limits";
import {
  addLinkedReel,
  addUploadedReel,
  deleteReel,
  moveReel,
  preparePosterUpload,
  prepareReelUpload,
  setReelFeatured,
  setReelPoster,
  setReelPublished,
} from "@/app/admin/actions";
import type { UploadTarget } from "@/lib/store";
import { Button, Card, Toggle } from "./ui";
import { InstagramIcon, PlayIcon } from "@/components/site/icons";

/* ------------------------------ upload helpers ----------------------------- */

function putFile(target: UploadTarget, file: Blob, onProgress?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url);
    for (const [k, v] of Object.entries(target.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          msg = JSON.parse(xhr.responseText).error ?? JSON.parse(xhr.responseText).message ?? msg;
        } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
}

/** Resolves once the video has a decoded frame at the current position (or after a timeout). */
function frameReady(video: HTMLVideoElement, timeout = 4000) {
  return new Promise<boolean>((resolve) => {
    const ok = () => video.readyState >= 2 && !video.seeking && video.videoWidth > 0;
    if (ok()) return resolve(true);
    if (video.error) return resolve(false);
    const t = setTimeout(() => finish(), timeout);
    const finish = () => {
      clearTimeout(t);
      video.removeEventListener("seeked", check);
      video.removeEventListener("loadeddata", check);
      resolve(ok());
    };
    const check = () => ok() && finish();
    video.addEventListener("seeked", check);
    video.addEventListener("loadeddata", check);
  });
}

/** Grabs the current frame of a <video> as a JPEG (max 720px wide). */
function captureFrame(video: HTMLVideoElement): Promise<Blob | null> {
  const w = Math.min(720, video.videoWidth || 720);
  const h = Math.round((w / (video.videoWidth || 9)) * (video.videoHeight || 16));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((r) => canvas.toBlob((b) => r(b), "image/jpeg", 0.85));
}

async function uploadPoster(file: Blob): Promise<string> {
  const prep = await preparePosterUpload({ type: file.type, size: file.size });
  if (!prep.ok) throw new Error(prep.error);
  await putFile(prep.data!, file);
  return prep.data!.path;
}

const SOURCE_LABEL: Record<Reel["source"], string> = {
  upload: "Uploaded",
  mp4: "Video file",
  cloudinary: "Cloudinary",
  instagram: "Instagram",
  youtube: "YouTube",
  vimeo: "Vimeo",
};

/* --------------------------------- add reel -------------------------------- */

function AddReel({ onAdded }: { onAdded: () => void }) {
  const [tab, setTab] = useState<"upload" | "link">("upload");
  return (
    <Card title="Add a reel" description="No titles or captions needed — the video speaks for itself.">
      <div role="tablist" className="mb-5 inline-flex rounded-full border border-line p-1">
        {(["upload", "link"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-[40px] rounded-full px-5 text-sm font-medium transition-colors ${tab === t ? "bg-cream text-ink" : "text-cream/70 hover:text-cream"}`}
          >
            {t === "upload" ? "Upload video" : "Paste a link"}
          </button>
        ))}
      </div>
      {tab === "upload" ? <UploadForm onAdded={onAdded} /> : <LinkForm onAdded={onAdded} />}
    </Card>
  );
}

function UploadForm({ onAdded }: { onAdded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [frameAt, setFrameAt] = useState(1);
  const [drag, setDrag] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const pick = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!VIDEO_TYPES.includes(f.type)) return setError("Please choose an MP4, WebM or MOV video file.");
    if (f.size > LIMITS.videoBytes) return setError(`That file is ${(f.size / 1048576).toFixed(0)} MB — the limit is ${LIMITS.videoMb} MB.`);
    setPreviewFailed(false);
    setFile(f);
  };

  const submit = async () => {
    if (!file || !video.current) return;
    setError(null);
    setProgress(0);
    try {
      // Only capture a cover if the browser could decode the video.
      const cover = (await frameReady(video.current)) ? await captureFrame(video.current) : null;
      const prep = await prepareReelUpload({
        videoType: file.type,
        videoSize: file.size,
        posterType: cover ? "image/jpeg" : undefined,
        posterSize: cover?.size,
      });
      if (!prep.ok) throw new Error(prep.error);
      await putFile(prep.data!.video, file, (p) => setProgress(p * 0.95));
      if (cover && prep.data!.poster) await putFile(prep.data!.poster, cover);
      setProgress(1);
      const res = await addUploadedReel({
        videoPath: prep.data!.video.path,
        posterPath: prep.data!.poster?.path,
        width: video.current.videoWidth || undefined,
        height: video.current.videoHeight || undefined,
      });
      if (!res.ok) throw new Error(res.error);
      setFile(null);
      setProgress(null);
      onAdded();
    } catch (e) {
      setProgress(null);
      setError((e as Error).message);
    }
  };

  if (!file) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files[0]);
          }}
          className={`flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
            drag ? "border-pink bg-pink/10" : "border-line hover:border-cream/40"
          }`}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-sun text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 16V4m-5 5 5-5 5 5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-medium text-cream">Tap to choose a video, or drop it here</span>
          <span className="text-xs text-cream/50">MP4, WebM or MOV · up to {LIMITS.videoMb} MB · vertical 9:16 looks best</span>
        </button>
        <input ref={input} type="file" accept={VIDEO_TYPES.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        {error && <p role="alert" className="text-sm text-[#ff8099]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
      <div className="relative mx-auto aspect-[9/16] w-[200px] overflow-hidden rounded-2xl bg-black sm:w-full">
        <video
          ref={video}
          src={url ?? undefined}
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
          onError={() => setPreviewFailed(true)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration || 0;
            setDuration(d);
            const t = Math.min(1, d / 2);
            setFrameAt(t);
            e.currentTarget.currentTime = t;
          }}
        />
      </div>
      <div className="flex flex-col gap-5">
        <div>
          <p className="truncate text-sm font-medium text-cream">{file.name}</p>
          <p className="text-xs text-cream/50">{(file.size / 1048576).toFixed(1)} MB</p>
        </div>
        {duration > 0 && (
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-cream/85">Cover frame — slide to pick the thumbnail</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.05}
              value={frameAt}
              onChange={(e) => {
                const t = Number(e.target.value);
                setFrameAt(t);
                if (video.current) video.current.currentTime = t;
              }}
              className="accent-[#f7a3d0]"
            />
          </label>
        )}
        {previewFailed && (
          <p className="rounded-xl bg-sun/10 px-3 py-2 text-xs text-sun">
            This browser can&apos;t preview the file, so no cover frame can be picked. If it doesn&apos;t play on the site, export it as MP4 (H.264).
          </p>
        )}
        {progress !== null && (
          <div className="flex flex-col gap-1.5" role="status">
            <div className="h-2 overflow-hidden rounded-full bg-ink-3">
              <div className="h-full rounded-full bg-gradient-to-r from-pink to-sun transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span className="text-xs text-cream/60">Uploading… {Math.round(progress * 100)}%</span>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-[#ff8099]">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button onClick={submit} disabled={progress !== null}>
            {progress !== null ? "Uploading…" : "Add to portfolio"}
          </Button>
          <Button variant="ghost" onClick={() => setFile(null)} disabled={progress !== null}>
            Choose another
          </Button>
        </div>
      </div>
    </div>
  );
}

function LinkForm({ onAdded }: { onAdded: () => void }) {
  const [link, setLink] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = link.trim() ? parseVideoUrl(link) : null;
  const detected = parsed && !("error" in parsed) ? parsed : null;

  const submit = async () => {
    setError(null);
    if (!detected) return setError(parsed && "error" in parsed ? parsed.error : "Paste a video link.");
    setBusy(true);
    try {
      const posterPath = cover ? await uploadPoster(cover) : undefined;
      const res = await addLinkedReel(link, posterPath);
      if (!res.ok) throw new Error(res.error);
      setLink("");
      setCover(null);
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-cream/85">Video link</span>
        <input
          type="url"
          inputMode="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="https://www.instagram.com/reel/… or a .mp4 / Cloudinary / YouTube link"
          className="min-h-[48px] rounded-xl border border-line bg-ink px-4 text-[15px] text-cream outline-none placeholder:text-cream/30 focus:border-pink"
        />
        <span className="text-xs text-cream/50">
          {detected ? (
            <span className="text-[#7be0a5]">✓ {SOURCE_LABEL[detected.source]} link detected</span>
          ) : parsed && "error" in parsed ? (
            <span className="text-[#ff8099]">{parsed.error}</span>
          ) : (
            "Direct MP4 / Cloudinary links autoplay in the gallery. Instagram reels open in a player."
          )}
        </span>
      </label>
      {detected && detected.source !== "cloudinary" && detected.source !== "youtube" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-cream/85">Cover image (optional)</span>
          <input
            type="file"
            accept={POSTER_TYPES.join(",")}
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            className="text-sm text-cream/70 file:mr-3 file:min-h-[40px] file:rounded-full file:border-0 file:bg-cream/10 file:px-4 file:text-cream"
          />
          <span className="text-xs text-cream/45">A screenshot from the reel makes the gallery card look its best.</span>
        </label>
      )}
      {error && <p role="alert" className="text-sm text-[#ff8099]">{error}</p>}
      <div>
        <Button onClick={submit} disabled={busy || !link.trim()}>
          {busy ? "Adding…" : "Add to portfolio"}
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------- reel list ------------------------------- */

function Preview({ reel }: { reel: Reel }) {
  const v = useRef<HTMLVideoElement>(null);
  if (isFileSource(reel.source)) {
    return (
      <video
        ref={v}
        src={reel.poster ? reel.url : `${reel.url}#t=0.1`}
        poster={reel.poster}
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        onMouseEnter={() => v.current?.play().catch(() => {})}
        onMouseLeave={() => v.current?.pause()}
      />
    );
  }
  if (reel.poster) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={reel.poster} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <div className="grid h-full w-full place-items-center" style={{ background: "var(--sunset-diag)" }}>
      {reel.source === "instagram" ? <InstagramIcon className="h-8 w-8 text-cream" /> : <PlayIcon className="h-8 w-8 text-cream" />}
    </div>
  );
}

function ReelItem({ reel, index, total, onChange }: { reel: Reel; index: number; total: number; onChange: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      onChange();
    });

  return (
    <li className={`flex flex-col overflow-hidden rounded-3xl border border-line bg-ink-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="relative bg-black" style={{ aspectRatio: reel.width && reel.height ? `${reel.width} / ${reel.height}` : "9 / 16" }}>
        <Preview reel={reel} />
        {!reel.published && (
          <span className="absolute inset-0 grid place-items-center bg-ink/70 text-xs font-semibold uppercase tracking-[0.2em] text-cream/80">Hidden</span>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-cream backdrop-blur">
          {SOURCE_LABEL[reel.source]}
        </span>
        {reel.featured && (
          <span className="absolute right-2 top-2 rounded-full bg-sun px-2.5 py-1 text-[11px] font-bold text-ink">★ Best</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <p className="text-xs text-cream/50">
          Added {new Date(reel.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <Toggle checked={reel.published} onChange={(v) => act(() => setReelPublished(reel.id, v))} label={reel.published ? "Published" : "Hidden"} />
        <Toggle checked={!!reel.featured} onChange={(v) => act(() => setReelFeatured(reel.id, v))} label="Best reel (intro finale)" />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Move earlier"
            disabled={index === 0 || pending}
            onClick={() => act(() => moveReel(reel.id, -1))}
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-cream/80 disabled:opacity-30"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Move later"
            disabled={index === total - 1 || pending}
            onClick={() => act(() => moveReel(reel.id, 1))}
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-cream/80 disabled:opacity-30"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            className="ml-auto min-h-[40px] rounded-full border border-line px-3 text-xs text-cream/80 hover:border-cream/40"
          >
            Cover
          </button>
          <input
            ref={coverInput}
            type="file"
            accept={POSTER_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              act(async () => {
                try {
                  const path = await uploadPoster(f);
                  return setReelPoster(reel.id, path);
                } catch (err) {
                  return { ok: false, error: (err as Error).message };
                }
              });
            }}
          />
        </div>
        {confirming ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-[#ff4d6d]/10 p-3">
            <p className="text-sm text-cream">Delete this reel? This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <Button variant="danger" className="flex-1" onClick={() => act(() => deleteReel(reel.id))} disabled={pending}>
                Delete
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-auto min-h-[40px] rounded-full text-sm text-[#ff8099] hover:bg-[#ff4d6d]/10"
          >
            Delete
          </button>
        )}
        {error && <p role="alert" className="text-xs text-[#ff8099]">{error}</p>}
      </div>
    </li>
  );
}

export function ReelsManager({ reels }: { reels: Reel[] }) {
  const router = useRouter();
  const [flash, setFlash] = useState<string | null>(null);
  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-5xl text-sun sm:text-6xl">Reels</h1>
        <p className="mt-2 text-sm text-cream-dim">Shown in the &ldquo;The Work&rdquo; gallery in this order. Newest additions appear first.</p>
      </header>

      <AddReel
        onAdded={() => {
          setFlash("Reel added — it's live in the gallery.");
          setTimeout(() => setFlash(null), 4000);
          refresh();
        }}
      />
      {flash && (
        <p role="status" className="rounded-2xl bg-[#7be0a5]/10 px-4 py-3 text-sm text-[#7be0a5]">
          {flash}
        </p>
      )}

      <Card title={`Your reels (${reels.length})`}>
        {reels.length === 0 ? (
          <p className="text-sm text-cream-dim">No reels yet — add your first one above.</p>
        ) : (
          <ul className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reels.map((r, i) => (
              <ReelItem key={r.id} reel={r} index={i} total={reels.length} onChange={refresh} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
