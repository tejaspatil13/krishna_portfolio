"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "../actions";
import { Monogram } from "@/components/site/icons";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="relative w-full max-w-[400px] rounded-[28px] border border-line bg-ink-2/90 p-7 backdrop-blur-xl sm:p-9">
      <Monogram className="mb-6 h-12 w-auto" gradientId="kp-login" />
      <h1 className="text-2xl font-semibold text-cream">Studio admin</h1>
      <p className="mt-1 text-sm text-cream-dim">Manage reels, packages and website content.</p>
      <label className="mt-7 flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-cream/85">Password</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="min-h-[48px] rounded-xl border border-line bg-ink px-4 text-cream outline-none focus:border-pink"
        />
      </label>
      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-[#ff8099]">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 min-h-[48px] w-full rounded-full bg-sun font-semibold text-ink transition-colors hover:bg-cream disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <Link href="/" className="mt-5 block text-center text-sm text-lavender hover:text-sun">
        ← Back to website
      </Link>
    </form>
  );
}
