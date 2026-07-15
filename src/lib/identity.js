/* Agent identity.

   Manual log entries key agents by email; RTA imports arrive with an Employee
   ID and a display name but usually no email. Two records belong to the same
   agent when they share either identifier — so every occurrence chain, quota
   and deduction cap matches on empId OR email, never just one. */

const norm = (s) => String(s || "").trim().toLowerCase();

/** Accepts a bare email string (the original API) or a {email, empId} ref. */
export const toAgentRef = (ref) => (typeof ref === "string" ? { email: ref } : ref || {});

export function agentMatches(entry, ref) {
  const r = toAgentRef(ref);
  const id = norm(r.empId);
  const em = norm(r.email);
  return (id !== "" && norm(entry.empId) === id) || (em !== "" && norm(entry.email) === em);
}

/** Stable grouping key: prefer the employee ID, fall back to the email. */
export const agentKeyOf = (x) => norm(x.empId) || norm(x.email);

/** Best displayable handle for an entry's agent. */
export const agentLabel = (e) => e.email || e.agentName || e.empId || "—";
