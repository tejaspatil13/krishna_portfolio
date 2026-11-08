import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getStore, readContent } from "@/lib/store";

export default async function Dashboard() {
  await requireAdmin();
  const c = await readContent();
  const storage = getStore().kind;
  const published = c.reels.filter((r) => r.published).length;
  const igOnly = c.reels.filter((r) => r.published && r.source === "instagram").length;
  const visiblePkgs = c.packages.filter((p) => p.visible).length;

  const todo = [
    !c.settings.pricesReviewed && {
      text: "Package prices are placeholders — review and save them.",
      href: "/admin/packages",
      cta: "Review prices",
    },
    igOnly > 0 && {
      text: `${igOnly} reel${igOnly > 1 ? "s are" : " is"} Instagram embeds. Upload the MP4 versions for silent autoplay-on-scroll in the gallery.`,
      href: "/admin/reels",
      cta: "Upload MP4",
    },
    storage === "local" &&
      process.env.NODE_ENV === "production" && {
        text: "Running on local file storage. Connect Supabase so uploads and edits survive redeploys.",
        href: "/admin/settings",
        cta: "See settings",
      },
  ].filter(Boolean) as { text: string; href: string; cta: string }[];

  const stats = [
    { label: "Reels live", value: `${published}`, sub: `${c.reels.length} total` },
    { label: "Packages live", value: `${visiblePkgs}`, sub: `${c.packages.length} total` },
    { label: "Process steps", value: `${c.process.steps.length}`, sub: "How We Work" },
    {
      label: "Last update",
      value: new Date(c.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
      sub: new Date(c.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-cream-dim">Welcome back</p>
        <h1 className="font-display mt-1 text-5xl text-sun sm:text-6xl">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl border border-line bg-ink-2 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cream/55">{s.label}</p>
            <p className="font-display mt-3 text-4xl text-cream">{s.value}</p>
            <p className="mt-1 text-xs text-cream/45">{s.sub}</p>
          </div>
        ))}
      </div>

      {todo.length > 0 && (
        <section className="rounded-3xl border border-sun/30 bg-sun/[0.06] p-5 sm:p-7">
          <h2 className="font-semibold text-sun">To do</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {todo.map((t) => (
              <li key={t.href + t.cta} className="flex flex-col gap-3 rounded-2xl bg-ink/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-cream/85">{t.text}</span>
                <Link href={t.href} className="shrink-0 self-start rounded-full bg-sun px-4 py-2 text-sm font-semibold text-ink sm:self-auto">
                  {t.cta}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/admin/reels", t: "Add a reel", d: "Upload an MP4 or paste a link — two steps, no titles needed." },
          { href: "/admin/packages", t: "Update pricing", d: "Change prices, services and which packages are shown." },
          { href: "/admin/content", t: "Edit website text", d: "Hero, process and contact headlines and descriptions." },
          { href: "/admin/contact", t: "Contact details", d: "Email, phone and WhatsApp used across the site." },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-3xl border border-line bg-ink-2 p-6 transition-colors hover:border-pink/50"
          >
            <p className="text-lg font-semibold text-cream group-hover:text-sun">{a.t} →</p>
            <p className="mt-1 text-sm text-cream-dim">{a.d}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
