/* The front door. Mock JWT-style auth over localStorage — see lib/auth.js for
   the loud disclaimer. Seeded accounts land in the ChangePassword screen on
   first login; nothing renders behind these views until a session exists. */

import { useState } from "react";
import { LogIn, KeyRound, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Field, TInput, BtnPrimary, Muted } from "./ui/index.jsx";
import { P } from "../lib/tokens.js";
import { ROLE_LABEL, DEFAULT_PASSWORD, MIN_PASSWORD, verifyPassword } from "../lib/auth.js";

function Shell({ children }) {
  return (
    <div className="ao-body flex items-center justify-center px-4" style={{ minHeight: "100vh", background: P.paper }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="flex items-center gap-3 justify-center mb-5">
          <div style={{ width: 34, height: 34, background: P.petrol, borderRadius: 8, position: "relative" }}>
            <div style={{ position: "absolute", right: 4, top: 4, width: 9, height: 9, background: P.amber, borderRadius: 2 }} />
          </div>
          <div>
            <div className="ao-disp font-bold uppercase" style={{ fontSize: 20, letterSpacing: 2, color: P.ink, lineHeight: 1 }}>
              Absence Ops
            </div>
            <div style={{ fontSize: 11.5, color: P.sub }}>Konecta GDC · workforce &amp; compliance</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <TInput
        type={show ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={onChange}
        style={{ paddingRight: 36 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: P.sub, display: "flex" }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export function LoginView({ users, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const user = users.find((u) => u.email === email.trim().toLowerCase());
    if (!user || !verifyPassword(user, password)) {
      setError("Invalid email or password.");
      return;
    }
    onLogin(user);
  };

  const fresh = users.filter((u) => u.mustChange);

  return (
    <Shell>
      <form
        onSubmit={submit}
        className="p-5"
        style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 12 }}
      >
        <div className="ao-disp font-bold uppercase tracking-wide flex items-center gap-2" style={{ fontSize: 15, color: P.ink }}>
          <LogIn size={16} color={P.petrol} />
          Sign in
        </div>
        <div className="grid gap-3 mt-4">
          <Field label="Email">
            <TInput
              type="email"
              value={email}
              placeholder="name@konecta.com"
              autoFocus
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
            />
          </Field>
          <Field label="Password">
            <PasswordInput
              value={password}
              placeholder="••••••••"
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
            />
          </Field>
          {error && (
            <div style={{ fontSize: 12.5, color: P.brick }} role="alert">
              {error}
            </div>
          )}
          <BtnPrimary onClick={submit}>Sign in</BtnPrimary>
        </div>
      </form>

      {fresh.length > 0 && (
        <div className="p-4 mt-3" style={{ background: P.mist, border: `1px solid ${P.line}`, borderRadius: 10 }}>
          <div className="ao-disp uppercase tracking-wider font-semibold" style={{ fontSize: 10.5, color: P.sub }}>
            Demo accounts (first login uses {DEFAULT_PASSWORD})
          </div>
          <div className="grid gap-1 mt-2">
            {fresh.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setEmail(u.email);
                  setPassword(DEFAULT_PASSWORD);
                  setError("");
                }}
                className="text-left flex items-center gap-2"
                style={{ border: "none", background: "none", cursor: "pointer", padding: "2px 0" }}
              >
                <span className="ao-mono truncate" style={{ fontSize: 11.5, color: P.petrol }}>
                  {u.email}
                </span>
                <span style={{ fontSize: 10.5, color: P.sub }}>{ROLE_LABEL[u.role]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

export function ChangePasswordView({ user, onSave, onCancel }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const next = pw.trim();
    if (next.length < MIN_PASSWORD) return setError(`At least ${MIN_PASSWORD} characters.`);
    if (next === DEFAULT_PASSWORD) return setError("Pick something other than the default password.");
    if (next !== confirm.trim()) return setError("The two entries don't match.");
    onSave(next);
  };

  return (
    <Shell>
      <form onSubmit={submit} className="p-5" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 12 }}>
        <div className="ao-disp font-bold uppercase tracking-wide flex items-center gap-2" style={{ fontSize: 15, color: P.ink }}>
          <KeyRound size={16} color={P.amber} />
          Set a new password
        </div>
        <div className="mt-1" style={{ fontSize: 12.5, color: P.sub }}>
          Welcome, <b>{user.name}</b>. You're signed in with the default password — choose your own before continuing.
        </div>
        <div className="grid gap-3 mt-4">
          <Field label={`New password (min ${MIN_PASSWORD} characters)`}>
            <PasswordInput value={pw} autoFocus onChange={(e) => { setPw(e.target.value); setError(""); }} />
          </Field>
          <Field label="Repeat it">
            <PasswordInput value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }} />
          </Field>
          {error && (
            <div style={{ fontSize: 12.5, color: P.brick }} role="alert">
              {error}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12.5, color: P.sub }}>
              Sign out
            </button>
            <BtnPrimary onClick={submit} icon={ShieldCheck}>
              Save &amp; continue
            </BtnPrimary>
          </div>
        </div>
      </form>
    </Shell>
  );
}
