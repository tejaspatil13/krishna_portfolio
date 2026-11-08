"use client";

import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

export function Card({ title, description, children, actions }: { title?: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-7">
      {(title || actions) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold text-cream">{title}</h2>}
            {description && <p className="mt-1 text-sm text-cream-dim">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-cream/85">{label}</label>
      <input
        {...props}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="min-h-[46px] rounded-xl border border-line bg-ink px-3.5 text-[15px] text-cream outline-none transition-colors placeholder:text-cream/30 focus:border-pink"
      />
      {hint && <span id={`${id}-hint`} className="text-xs text-cream/45">{hint}</span>}
    </div>
  );
}

export function Area({ label, hint, ...props }: { label: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-cream/85">{label}</label>
      <textarea
        rows={3}
        {...props}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="rounded-xl border border-line bg-ink px-3.5 py-3 text-[15px] leading-relaxed text-cream outline-none transition-colors placeholder:text-cream/30 focus:border-pink"
      />
      {hint && <span id={`${id}-hint`} className="text-xs text-cream/45">{hint}</span>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-[40px] items-center gap-2.5 text-sm text-cream/85"
    >
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-pink" : "bg-ink-3 ring-1 ring-line"}`}>
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-cream shadow transition-[left] duration-200"
          style={{ left: checked ? 22 : 2 }}
        />
      </span>
      {label}
    </button>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: { variant?: "primary" | "ghost" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-sun text-ink hover:bg-cream disabled:opacity-50",
    ghost: "border border-line text-cream hover:border-cream/40 disabled:opacity-50",
    danger: "bg-[#ff4d6d] text-white hover:bg-[#ff2e55] disabled:opacity-50",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export function StatusText({ status }: { status: Status }) {
  if (status.kind === "idle") return null;
  if (status.kind === "saving") return <span className="text-sm text-cream/60" role="status">Saving…</span>;
  if (status.kind === "saved") return <span className="text-sm text-[#7be0a5]" role="status">Saved — live on the site.</span>;
  return <span className="text-sm text-[#ff8099]" role="alert">{status.message}</span>;
}

/** Sticky save bar shown at the bottom of editors. */
export function SaveBar({ dirty, status, onSave }: { dirty: boolean; status: Status; onSave: () => void }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-4 border-t border-line bg-ink/90 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
      <StatusText status={status} />
      {dirty && status.kind !== "saving" && <span className="hidden text-sm text-cream/50 sm:inline">Unsaved changes</span>}
      <Button onClick={onSave} disabled={!dirty || status.kind === "saving"}>
        Save changes
      </Button>
    </div>
  );
}

/** Warn before leaving with unsaved edits. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}

export function useDirty<T>(initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(value) !== baseline;
  return { value, setValue, dirty, markSaved: () => setBaseline(JSON.stringify(value)) };
}
