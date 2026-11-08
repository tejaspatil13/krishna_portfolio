"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveContent, type ContentInput } from "@/app/admin/actions";
import { Area, Button, Card, Field, SaveBar, useDirty, useUnsavedWarning, type Status } from "./ui";

export function ContentEditor({ initial }: { initial: ContentInput }) {
  const router = useRouter();
  const { value: c, setValue: setC, dirty, markSaved } = useDirty(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  useUnsavedWarning(dirty);

  const set = <K extends keyof ContentInput>(section: K, patch: Partial<ContentInput[K]>) =>
    setC((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));

  const setStep = (i: number, patch: Partial<ContentInput["process"]["steps"][number]>) =>
    setC((prev) => ({
      ...prev,
      process: { ...prev.process, steps: prev.process.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) },
    }));

  const moveStep = (i: number, d: -1 | 1) =>
    setC((prev) => {
      const steps = [...prev.process.steps];
      const j = i + d;
      if (j < 0 || j >= steps.length) return prev;
      [steps[i], steps[j]] = [steps[j], steps[i]];
      return { ...prev, process: { ...prev.process, steps } };
    });

  const save = async () => {
    setStatus({ kind: "saving" });
    const r = await saveContent(c);
    if (r.ok) {
      markSaved();
      setStatus({ kind: "saved" });
      router.refresh();
    } else setStatus({ kind: "error", message: r.error });
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-5xl text-sun sm:text-6xl">Website content</h1>
        <p className="mt-2 text-sm text-cream-dim">Edit the words on each section. Prices live under Packages, phone and email under Contact Details.</p>
      </header>

      <Card title="1 · Hero / Welcome" description="The first screen visitors see.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small label above headline" value={c.hero.eyebrow} maxLength={60} onChange={(e) => set("hero", { eyebrow: e.target.value })} />
          <Field label="Designation" value={c.hero.designation} maxLength={120} onChange={(e) => set("hero", { designation: e.target.value })} />
          <div className="sm:col-span-2">
            <Field label="Headline" value={c.hero.headline} maxLength={80} onChange={(e) => set("hero", { headline: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Area label="Description" value={c.hero.description} maxLength={400} onChange={(e) => set("hero", { description: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Field label="Tagline (used in sharing previews)" value={c.hero.tagline} maxLength={160} onChange={(e) => set("hero", { tagline: e.target.value })} />
          </div>
          <Field label="Main button" value={c.hero.primaryCta} maxLength={40} onChange={(e) => set("hero", { primaryCta: e.target.value })} />
          <Field label="Second button" value={c.hero.secondaryCta} maxLength={40} onChange={(e) => set("hero", { secondaryCta: e.target.value })} />
        </div>
      </Card>

      <Card title="2 · Work gallery heading">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small label" value={c.work.eyebrow} maxLength={40} onChange={(e) => set("work", { eyebrow: e.target.value })} />
          <Field label="Heading" value={c.work.headline} maxLength={60} onChange={(e) => set("work", { headline: e.target.value })} />
        </div>
      </Card>

      <Card title="3 · Packages heading">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small label" value={c.packagesSection.eyebrow} maxLength={40} onChange={(e) => set("packagesSection", { eyebrow: e.target.value })} />
          <Field label="Heading" value={c.packagesSection.headline} maxLength={80} onChange={(e) => set("packagesSection", { headline: e.target.value })} />
          <div className="sm:col-span-2">
            <Area label="Introduction" value={c.packagesSection.intro} maxLength={400} onChange={(e) => set("packagesSection", { intro: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card title="4 · How We Work" description="Headline, introduction and each step of your process.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small label" value={c.process.eyebrow} maxLength={40} onChange={(e) => set("process", { eyebrow: e.target.value })} />
          <Field label="Headline" value={c.process.headline} maxLength={100} onChange={(e) => set("process", { headline: e.target.value })} />
          <div className="sm:col-span-2">
            <Area label="Introduction" rows={4} value={c.process.intro} maxLength={600} onChange={(e) => set("process", { intro: e.target.value })} />
          </div>
        </div>
        <ol className="mt-6 flex flex-col gap-4">
          {c.process.steps.map((s, i) => (
            <li key={s.id} className="rounded-2xl border border-line bg-ink p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-display text-2xl text-pink">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex gap-1.5">
                  <button type="button" aria-label="Move step up" disabled={i === 0} onClick={() => moveStep(i, -1)} className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-30">↑</button>
                  <button type="button" aria-label="Move step down" disabled={i === c.process.steps.length - 1} onClick={() => moveStep(i, 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-30">↓</button>
                  <button
                    type="button"
                    aria-label="Remove step"
                    disabled={c.process.steps.length <= 1}
                    onClick={() => set("process", { steps: c.process.steps.filter((_, j) => j !== i) })}
                    className="grid h-9 w-9 place-items-center rounded-full border border-line text-[#ff8099] disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="grid gap-3">
                <Field label="Step title" value={s.title} maxLength={80} onChange={(e) => setStep(i, { title: e.target.value })} />
                <Area label="Step description" rows={2} value={s.description} maxLength={400} onChange={(e) => setStep(i, { description: e.target.value })} />
              </div>
            </li>
          ))}
        </ol>
        <Button
          variant="ghost"
          className="mt-4"
          disabled={c.process.steps.length >= 10}
          onClick={() =>
            set("process", {
              steps: [...c.process.steps, { id: `step-${Math.random().toString(36).slice(2, 10)}`, title: "New step", description: "" }],
            })
          }
        >
          + Add step
        </Button>
      </Card>

      <Card title="5 · Contact section text" description="Contact numbers and email are under Contact Details.">
        <div className="grid gap-4">
          <Field label="Headline" value={c.contact.headline} maxLength={80} onChange={(e) => set("contact", { headline: e.target.value })} />
          <Area label="Description" value={c.contact.description} maxLength={400} onChange={(e) => set("contact", { description: e.target.value })} />
        </div>
      </Card>

      <SaveBar dirty={dirty} status={status} onSave={save} />
    </div>
  );
}
