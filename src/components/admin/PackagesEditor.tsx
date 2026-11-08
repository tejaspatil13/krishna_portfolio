"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Package } from "@/lib/types";
import { savePackages } from "@/app/admin/actions";
import { Area, Button, Card, Field, SaveBar, Toggle, useDirty, useUnsavedWarning, type Status } from "./ui";

const blank = (): Package => ({
  id: `pkg-${Math.random().toString(36).slice(2, 10)}`,
  name: "New package",
  currency: "₹",
  price: "0",
  priceNote: "per project",
  description: "",
  videoQuantity: "",
  revisions: "",
  delivery: "",
  features: [],
  ctaLabel: "Book now",
  visible: false,
  featured: false,
});

export function PackagesEditor({ initial, reviewed }: { initial: Package[]; reviewed: boolean }) {
  const router = useRouter();
  const { value: pkgs, setValue: setPkgs, dirty, markSaved } = useDirty(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  useUnsavedWarning(dirty);

  const update = (id: string, patch: Partial<Package>) =>
    setPkgs((list) =>
      list.map((p) => {
        if (p.id === id) return { ...p, ...patch };
        // Only one package can be featured.
        if (patch.featured) return { ...p, featured: false };
        return p;
      }),
    );

  const move = (i: number, d: -1 | 1) =>
    setPkgs((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    setStatus({ kind: "saving" });
    const r = await savePackages(pkgs);
    if (r.ok) {
      markSaved();
      setStatus({ kind: "saved" });
      router.refresh();
    } else setStatus({ kind: "error", message: r.error });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl text-sun sm:text-6xl">Packages</h1>
          <p className="mt-2 text-sm text-cream-dim">Edit prices and what&apos;s included. Changes go live as soon as you save.</p>
        </div>
        <Button variant="ghost" onClick={() => setPkgs((l) => [...l, blank()])} disabled={pkgs.length >= 12}>
          + Add package
        </Button>
      </header>

      {!reviewed && (
        <p className="rounded-2xl border border-sun/30 bg-sun/[0.06] px-4 py-3 text-sm text-sun">
          These starting prices are placeholders. Update them to your real rates and save.
        </p>
      )}

      {pkgs.map((p, i) => (
        <Card
          key={p.id}
          title={p.name || "Untitled package"}
          description={`${p.currency}${p.price} ${p.priceNote}`.trim()}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="grid h-10 w-10 place-items-center rounded-full border border-line disabled:opacity-30">
                ↑
              </button>
              <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === pkgs.length - 1} className="grid h-10 w-10 place-items-center rounded-full border border-line disabled:opacity-30">
                ↓
              </button>
            </div>
          }
        >
          <div className="mb-5 flex flex-wrap gap-x-6 gap-y-1">
            <Toggle checked={p.visible} onChange={(v) => update(p.id, { visible: v })} label="Show on website" />
            <Toggle checked={p.featured} onChange={(v) => update(p.id, { featured: v })} label="Featured (large panel)" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Package name" value={p.name} maxLength={60} onChange={(e) => update(p.id, { name: e.target.value })} />
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <Field label="Currency" value={p.currency} maxLength={6} onChange={(e) => update(p.id, { currency: e.target.value })} />
              <Field label="Price" value={p.price} maxLength={24} inputMode="decimal" hint="e.g. 9,999 or On request" onChange={(e) => update(p.id, { price: e.target.value })} />
            </div>
            <Field label="Price note" value={p.priceNote} maxLength={40} placeholder="per reel / per month" onChange={(e) => update(p.id, { priceNote: e.target.value })} />
            <Field label="Button label" value={p.ctaLabel} maxLength={40} onChange={(e) => update(p.id, { ctaLabel: e.target.value })} />
            <div className="sm:col-span-2">
              <Area label="Short description" value={p.description} maxLength={400} onChange={(e) => update(p.id, { description: e.target.value })} />
            </div>
            <Field label="Number of videos" value={p.videoQuantity} maxLength={80} placeholder="4 reels (up to 90 sec)" onChange={(e) => update(p.id, { videoQuantity: e.target.value })} />
            <Field label="Revisions" value={p.revisions} maxLength={80} placeholder="2 revisions" onChange={(e) => update(p.id, { revisions: e.target.value })} />
            <Field label="Delivery time" value={p.delivery} maxLength={80} placeholder="3 days" onChange={(e) => update(p.id, { delivery: e.target.value })} />
            <div className="sm:col-span-2">
              <Area
                label="Included services"
                hint="One per line."
                rows={5}
                value={p.features.join("\n")}
                onChange={(e) => update(p.id, { features: e.target.value.split("\n") })}
              />
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            {confirmRemove === p.id ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-cream">Remove this package?</span>
                <Button
                  variant="danger"
                  onClick={() => {
                    setPkgs((l) => l.filter((x) => x.id !== p.id));
                    setConfirmRemove(null);
                  }}
                >
                  Remove
                </Button>
                <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
                  Cancel
                </Button>
                <span className="text-xs text-cream/50">(takes effect when you save)</span>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(p.id)} className="text-sm text-[#ff8099] hover:underline">
                Remove package
              </button>
            )}
          </div>
        </Card>
      ))}

      <SaveBar dirty={dirty} status={status} onSave={save} />
    </div>
  );
}
