# Krishna Patil — Video Editor Portfolio

Cinematic single-page portfolio with a built-in admin dashboard. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, GSAP + ScrollTrigger and Lenis.

## Quick start (local)

```bash
npm install
cp .env.example .env.local     # then fill in the values (see below)
npm run dev                    # http://localhost:3000  ·  admin: /admin
```

Admin password setup:

```bash
npm run hash-password -- "choose-a-strong-password"
# paste the printed ADMIN_PASSWORD_HASH and SESSION_SECRET into .env.local
```

Without Supabase keys, content is stored in `./data/content.json` and uploads in `./data/uploads/` (git-ignored). Delete `./data` to reset to the default content.

## Site sections (reference image → section)

| Ref | Section | Component |
| --- | --- | --- |
| Image 1 | Hero / Welcome | `src/components/site/Hero.tsx` |
| Image 2 | Reels gallery | `src/components/site/Work.tsx`, `gallery/*` |
| Image 3 | Packages | `src/components/site/Packages.tsx` |
| Image 4 | How We Work | `src/components/site/Process.tsx` |
| Image 5 | Contact | `src/components/site/Contact.tsx` |

The colour tokens live in `src/app/globals.css` (`:root`). All text, prices, reels and contact details come from the content store and are edited at `/admin`; nothing is hard-coded in components.

## Reel gallery behaviour

- **Uploaded / direct MP4 / Cloudinary** reels: lazy-loaded (no download until near the viewport), autoplay muted when they are the most visible card, pause when they leave (position kept), only one plays at a time, tap to play/pause, explicit sound toggle.
- **Instagram** reels: Instagram doesn't allow custom playback control, so they show as a 9:16 cover card that opens the official embed in a lightbox (with an "Open on Instagram" fallback). For the full autoplay experience, upload the MP4 of each reel from the admin. A cover image can be added to any reel.
- **YouTube / Vimeo** links autoplay muted via their official embed players.

## Production deployment (Vercel or any Node host)

1. Create a Supabase project, open the SQL editor and run `supabase/schema.sql` (creates the content table and the `portfolio-media` bucket with type/size limits).
2. Set environment variables on the host:
   - `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (from `npm run hash-password`)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to the browser)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://krishnapatil.in`) for canonical/OG URLs
   - optional `NEXT_PUBLIC_MAX_VIDEO_MB` (default 200; keep ≤ your Supabase plan's per-file upload limit — the free plan allows 50 MB)
3. Deploy. On first save in the admin, the default content is written to Supabase.

With Supabase configured, videos upload straight from the browser to a signed Storage URL (no server body-size limits). Without it, a single self-hosted Node server with a persistent disk also works (`npm run build && npm start`).

## Security notes

- Admin pages are gated in `src/proxy.ts`, and every page, server action and the upload route re-verifies the signed, httpOnly session cookie on the server.
- Login is throttled (6 attempts / 15 min per IP, per instance).
- Uploads: MIME allow-list, size limits, magic-byte sniffing (local mode) and Storage bucket rules (Supabase). Object paths are generated server-side; deleting a reel only removes files this app uploaded for it.
- Links are https-only and must match a supported provider.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` / `npm run typecheck` | Quality checks |
| `npm run hash-password -- "pw"` | Generate admin password hash + session secret |
