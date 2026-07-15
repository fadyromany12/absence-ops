/* Mock authentication and role-based access control.

   ⚠ THIS IS DEMO AUTH, NOT SECURITY. Users, salted hashes and sessions all
   live in the browser's localStorage; the hash is a toy (djb2) and the "JWT"
   is decorative. Anyone with the devtools open owns this app — which is fine,
   because it guards a single-browser demo with no server and no real data.
   Never copy this pattern into anything that authenticates against a backend. */

import { uid } from "./format.js";

export const ROLES = ["SuperAdmin", "WFM", "ProjectManager", "OperationsLead", "HRBusinessPartner"];

export const ROLE_LABEL = {
  SuperAdmin: "Super Admin",
  WFM: "WFM",
  ProjectManager: "Project Manager",
  OperationsLead: "Operations Lead",
  HRBusinessPartner: "HR Business Partner",
};

/** Every seeded or admin-reset account starts here, and must change it on first login. */
export const DEFAULT_PASSWORD = "Welcome@123";
export const MIN_PASSWORD = 8;

export function hashPassword(password, salt) {
  const s = `${salt}::${password}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export function makeUser({ name, email, role }) {
  const salt = uid();
  return {
    id: uid(),
    name,
    email: email.trim().toLowerCase(),
    role,
    salt,
    passHash: hashPassword(DEFAULT_PASSWORD, salt),
    mustChange: true,
    createdAt: Date.now(),
  };
}

export const verifyPassword = (user, password) => hashPassword(password, user.salt) === user.passHash;

export function setPassword(user, password) {
  const salt = uid();
  return { ...user, salt, passHash: hashPassword(password, salt), mustChange: false };
}

export function resetPassword(user) {
  const salt = uid();
  return { ...user, salt, passHash: hashPassword(DEFAULT_PASSWORD, salt), mustChange: true };
}

/** Cosmetic JWT-shaped token so the session looks like the real flow it mocks. */
export function makeToken(user) {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "");
  return [
    b64({ alg: "none", typ: "JWT" }),
    b64({ sub: user.id, name: user.name, role: user.role, iat: Date.now() }),
    hashPassword(user.id, "session"),
  ].join(".");
}

export const seedUsers = () => [
  makeUser({ name: "Fady Bekhet", email: "fady.bekhet@konecta.com", role: "SuperAdmin" }),
  makeUser({ name: "Salma Elhadad", email: "salma.elhadad@konecta.com", role: "WFM" }),
  makeUser({ name: "Ibrahim Kamel", email: "ibrahim.kamel@konecta.com", role: "ProjectManager" }),
  makeUser({ name: "Mohamed Rashad", email: "mohamed.rashad@konecta.com", role: "OperationsLead" }),
  makeUser({ name: "Abdallah Ismail", email: "abdallah.ismail@konecta.com", role: "HRBusinessPartner" }),
];

/* ── What each role may see and do ─────────────────────────────────────────
   WFM is deliberately narrow: their job in this process is delivering the RTA
   data, nothing downstream of it. */

export const TABS_FOR = {
  SuperAdmin: ["dashboard", "log", "rta", "triage", "approvals", "agents", "dcm", "users", "settings"],
  WFM: ["rta"],
  ProjectManager: ["dashboard", "log", "triage", "agents"],
  OperationsLead: ["dashboard", "approvals", "agents"],
  HRBusinessPartner: ["dashboard", "approvals", "agents"],
};

const PERMS = {
  log: ["SuperAdmin", "ProjectManager"],
  upload: ["SuperAdmin", "WFM"],
  triage: ["SuperAdmin", "ProjectManager"], // escalate / dismiss / notify / assign
  ops: ["SuperAdmin", "OperationsLead"],
  hr: ["SuperAdmin", "HRBusinessPartner"],
  admin: ["SuperAdmin"], // DCM, users, settings, hard reset
  delete: ["SuperAdmin"], // destroying a case erases evidence — admin only
};

export const can = (user, action) => !!user && (PERMS[action] || []).includes(user.role);
