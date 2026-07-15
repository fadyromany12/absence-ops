"use client";

/* Glass login over the aurora. Signs in via NextAuth credentials; "/" then
   routes by role (agent portal vs staff workspace vs forced password change). */

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { GlassCard, GlassButton, GlassInput, GlassLabel } from "@/components/glass";

function Logo() {
  return (
    <div className="mb-6 flex items-center justify-center gap-3">
      <div className="relative h-9 w-9 rounded-lg bg-emerald-500/80 shadow-[0_0_28px_rgba(16,185,129,0.55)]">
        <div className="absolute right-1 top-1 h-2 w-2 rounded-sm bg-amber-400" />
      </div>
      <div>
        <div className="text-xl font-bold uppercase tracking-[0.2em] text-slate-100" style={{ fontFamily: "Barlow Semi Condensed" }}>
          Absence Ops
        </div>
        <div className="text-[11px] text-slate-400">Konecta GDC · workforce &amp; compliance</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid email or password.");
      setBusy(false);
      return;
    }
    // Full navigation so the server layouts see the fresh session cookie.
    window.location.href = "/";
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Logo />
        <GlassCard glow="emerald">
          <form onSubmit={submit} className="grid gap-4">
            <h1 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-slate-200">
              <LogIn size={15} className="text-emerald-300" />
              Sign in
            </h1>
            <div>
              <GlassLabel>Email</GlassLabel>
              <GlassInput
                type="email"
                autoFocus
                autoComplete="username"
                placeholder="name@konecta.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
              />
            </div>
            <div>
              <GlassLabel>Password</GlassLabel>
              <div className="relative">
                <GlassInput
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-11"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="text-[12.5px] text-rose-300">
                {error}
              </p>
            )}
            <GlassButton type="submit" loading={busy}>
              Sign in
            </GlassButton>
          </form>
        </GlassCard>
        <p className="mt-4 text-center text-[11.5px] text-slate-500">
          Accounts are provisioned by the Super Admin. First login uses the issued default password.
        </p>
      </div>
    </main>
  );
}
