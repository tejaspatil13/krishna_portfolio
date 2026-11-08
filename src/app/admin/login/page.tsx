import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-ink px-5">
      <div
        aria-hidden="true"
        className="absolute -bottom-1/3 left-1/2 h-[70vh] w-[120vw] -translate-x-1/2 rounded-[50%] opacity-50 blur-[100px]"
        style={{ background: "radial-gradient(closest-side,#e0559a,#5e3aa8 60%,transparent)" }}
      />
      <LoginForm />
    </main>
  );
}
