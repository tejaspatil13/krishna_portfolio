import { requireAdmin } from "@/lib/auth";
import { getStore, readContent } from "@/lib/store";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
import { logout } from "../../actions";
import { LIMITS } from "@/lib/limits";

export default async function SettingsPage() {
  await requireAdmin();
  const c = await readContent();
  const storage = getStore().kind;
  return (
    <div className="flex flex-col gap-6">
      <SettingsEditor initial={{ siteTitle: c.settings.siteTitle, metaDescription: c.settings.metaDescription }} />

      <section className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Storage</h2>
        <p className="mt-2 text-sm text-cream-dim">
          {storage === "supabase"
            ? "Connected to Supabase — content is stored in the database and uploads in cloud storage."
            : "Using local storage (./data). Fine for development or a single server with a persistent disk. For hosting on Vercel or similar, connect Supabase (see README)."}
        </p>
        <p className="mt-2 text-sm text-cream-dim">Maximum video upload: {LIMITS.videoMb} MB.</p>
      </section>

      <section className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="mt-2 text-sm text-cream-dim">
          The admin password is set in the server environment (ADMIN_PASSWORD_HASH). To change it, generate a new hash with{" "}
          <code className="rounded bg-ink px-1.5 py-0.5 text-cream">npm run hash-password</code> and update it in your hosting settings.
        </p>
        <form action={logout} className="mt-4">
          <button type="submit" className="min-h-[44px] rounded-full border border-line px-5 text-sm font-semibold text-[#ff8099] hover:border-[#ff8099]">
            Log out
          </button>
        </form>
      </section>
    </div>
  );
}
