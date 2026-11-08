"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveContactDetails } from "@/app/admin/actions";
import { telLink, whatsappLink } from "@/lib/video";
import { Area, Card, Field, SaveBar, useDirty, useUnsavedWarning, type Status } from "./ui";

type Contact = { name: string; email: string; phone: string; whatsapp: string; whatsappMessage: string; instagram: string };

export function ContactEditor({ initial }: { initial: Contact }) {
  const router = useRouter();
  const { value: c, setValue: setC, dirty, markSaved } = useDirty(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  useUnsavedWarning(dirty);
  const set = (patch: Partial<Contact>) => setC((p) => ({ ...p, ...patch }));

  const save = async () => {
    setStatus({ kind: "saving" });
    const r = await saveContactDetails(c);
    if (r.ok) {
      markSaved();
      setStatus({ kind: "saved" });
      router.refresh();
    } else setStatus({ kind: "error", message: r.error });
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-5xl text-sun sm:text-6xl">Contact details</h1>
        <p className="mt-2 text-sm text-cream-dim">Used by every WhatsApp, call and email button on the site.</p>
      </header>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={c.name} maxLength={80} autoComplete="name" onChange={(e) => set({ name: e.target.value })} />
          <Field label="Email" type="email" value={c.email} maxLength={120} autoComplete="email" onChange={(e) => set({ email: e.target.value })} />
          <Field label="Mobile number" type="tel" value={c.phone} maxLength={30} hint="Include country code, e.g. +91 84858 91427" onChange={(e) => set({ phone: e.target.value })} />
          <Field label="WhatsApp number" type="tel" value={c.whatsapp} maxLength={30} hint="Include country code" onChange={(e) => set({ whatsapp: e.target.value })} />
          <div className="sm:col-span-2">
            <Area label="WhatsApp pre-filled message" value={c.whatsappMessage} maxLength={300} onChange={(e) => set({ whatsappMessage: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Instagram profile (optional)"
              type="url"
              value={c.instagram}
              maxLength={200}
              placeholder="https://www.instagram.com/yourname"
              hint="Leave empty to hide the Instagram icon."
              onChange={(e) => set({ instagram: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="text-cream/50">Test:</span>
          <a className="text-lavender hover:text-sun" href={whatsappLink(c.whatsapp, c.whatsappMessage)} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
          <a className="text-lavender hover:text-sun" href={telLink(c.phone)}>Call</a>
          <a className="text-lavender hover:text-sun" href={`mailto:${c.email}`}>Email</a>
        </div>
      </Card>
      <SaveBar dirty={dirty} status={status} onSave={save} />
    </div>
  );
}
