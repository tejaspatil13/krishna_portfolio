"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/app/admin/actions";
import { Area, Card, Field, SaveBar, useDirty, useUnsavedWarning, type Status } from "./ui";

type S = { siteTitle: string; metaDescription: string };

export function SettingsEditor({ initial }: { initial: S }) {
  const router = useRouter();
  const { value: s, setValue, dirty, markSaved } = useDirty(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  useUnsavedWarning(dirty);

  const save = async () => {
    setStatus({ kind: "saving" });
    const r = await saveSettings(s);
    if (r.ok) {
      markSaved();
      setStatus({ kind: "saved" });
      router.refresh();
    } else setStatus({ kind: "error", message: r.error });
  };

  return (
    <>
      <header>
        <h1 className="font-display text-5xl text-sun sm:text-6xl">Settings</h1>
        <p className="mt-2 text-sm text-cream-dim">How the site appears in Google and in link previews on WhatsApp / Instagram.</p>
      </header>
      <Card title="Search & sharing">
        <div className="grid gap-4">
          <Field label="Page title" value={s.siteTitle} maxLength={90} hint={`${s.siteTitle.length}/90 · ~60 characters shows fully in Google`} onChange={(e) => setValue({ ...s, siteTitle: e.target.value })} />
          <Area label="Meta description" value={s.metaDescription} maxLength={300} hint={`${s.metaDescription.length}/300 · ~155 characters shows fully in Google`} onChange={(e) => setValue({ ...s, metaDescription: e.target.value })} />
        </div>
        <SaveBar dirty={dirty} status={status} onSave={save} />
      </Card>
    </>
  );
}
