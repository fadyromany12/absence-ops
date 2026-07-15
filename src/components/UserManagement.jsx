/* User provisioning — SuperAdmin only, server-backed.

   Creating a user issues the shared default password and flags the account to
   change it at first login; resetting does the same. Server-side guards keep
   the last SuperAdmin undeletable and un-demotable; errors from those guards
   surface inline here. Agent accounts need an employee ID so the portal can
   find their case history. */

import { useState } from "react";
import { UserPlus, KeyRound, Trash2, ShieldCheck } from "lucide-react";
import { Card, Field, TInput, TSelect, BtnPrimary, Muted, Pill } from "./ui/index.jsx";
import { P } from "../lib/tokens.js";
import { fmtStamp } from "../lib/format.js";
import { ROLES, ROLE_LABEL, DEFAULT_PASSWORD } from "../lib/auth.js";

export default function UserManagement({ users, me, onCreate, onReset, onRole, onDelete }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ProjectManager");
  const [empId, setEmpId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const say = (fn) => async (...args) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn(...args);
    } catch (err) {
      setError(err.message || "The server rejected that.");
    } finally {
      setBusy(false);
    }
  };

  const add = say(async () => {
    await onCreate({ name: name.trim(), email: email.trim(), role, empId: empId.trim() });
    setNotice(`${name.trim()} created — first login is ${email.trim().toLowerCase()} / ${DEFAULT_PASSWORD}.`);
    setName("");
    setEmail("");
    setEmpId("");
  });

  const reset = say(async (u) => {
    if (!window.confirm(`Reset ${u.name}'s password to the default? They'll be forced to change it at next login.`)) return;
    await onReset(u.id);
    setNotice(`${u.name}'s password reset to ${DEFAULT_PASSWORD}.`);
  });

  const changeRole = say(async (u, nextRole) => {
    await onRole(u.id, nextRole);
    setNotice(`${u.name} is now ${ROLE_LABEL[nextRole]}.`);
  });

  const remove = say(async (u) => {
    if (u.id === me.id) throw new Error("You can't delete the account you're signed in with.");
    if (!window.confirm(`Delete ${u.name} (${u.email})? Their past actions stay in the audit log.`)) return;
    await onDelete(u.id);
    setNotice(`${u.name} deleted.`);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <Card title="Provision a user">
        <div className="grid gap-3">
          <Field label="Full name">
            <TInput value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Sara Adly" />
          </Field>
          <Field label="Email">
            <TInput value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="sara.adly@konecta.com" />
          </Field>
          <Field label="Role">
            <TSelect value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </TSelect>
          </Field>
          <Field label={role === "Agent" ? "Employee ID (required for agents)" : "Employee ID (optional)"}>
            <TInput value={empId} onChange={(e) => { setEmpId(e.target.value); setError(""); }} placeholder="EG0000" />
          </Field>
          {error && (
            <div style={{ fontSize: 12.5, color: P.brick }} role="alert">
              {error}
            </div>
          )}
          {notice && !error && <div style={{ fontSize: 12.5, color: P.green }}>{notice}</div>}
          <BtnPrimary icon={UserPlus} onClick={add} disabled={busy}>
            Create user
          </BtnPrimary>
          <Muted>
            New accounts start with the default password <span className="ao-mono">{DEFAULT_PASSWORD}</span> and must
            change it on first login. Agents sign into the self-service portal; staff roles into this workspace.
          </Muted>
        </div>
      </Card>

      <div className="lg:col-span-2">
        <Card title={`Users (${users.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["User", "Role", "Emp ID", "Status", "Created", ""].map((h) => (
                    <th key={h} className="ao-disp uppercase tracking-wider text-left" style={{ fontSize: 10, color: P.sub, padding: "6px 8px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderTop: `1px solid ${P.mist}` }}>
                    <td style={{ padding: "8px" }}>
                      <div className="flex items-center gap-2">
                        {u.role === "SuperAdmin" && <ShieldCheck size={13} color={P.petrol} />}
                        <div className="min-w-0">
                          <div style={{ color: P.ink, fontWeight: 500 }}>
                            {u.name}
                            {u.id === me.id && <span style={{ color: P.sub, fontWeight: 400 }}> (you)</span>}
                          </div>
                          <div className="ao-mono truncate" style={{ fontSize: 11, color: P.sub }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <TSelect
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        disabled={busy}
                        style={{ fontSize: 12, padding: "4px 6px", width: 170 }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </TSelect>
                    </td>
                    <td className="ao-mono" style={{ padding: "8px", fontSize: 12, color: P.inkSoft }}>{u.empId || "—"}</td>
                    <td style={{ padding: "8px" }}>
                      {u.mustChange ? <Pill color={P.amber}>Default password</Pill> : <Pill color={P.green}>Active</Pill>}
                    </td>
                    <td className="ao-mono" style={{ padding: "8px", fontSize: 11, color: P.sub, whiteSpace: "nowrap" }}>
                      {fmtStamp(u.createdAt)}
                    </td>
                    <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => reset(u)}
                        disabled={busy}
                        title="Reset password to default"
                        className="inline-flex items-center gap-1"
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: P.petrol, marginRight: 10 }}
                      >
                        <KeyRound size={12} />
                        Reset
                      </button>
                      <button
                        onClick={() => remove(u)}
                        disabled={busy}
                        title="Delete user"
                        className="inline-flex items-center gap-1"
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: P.sub }}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
