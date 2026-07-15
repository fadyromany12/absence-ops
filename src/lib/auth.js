/* Role-based access control — pure maps, safe to import from client and
   server alike. Password hashing lives in passwords.ts (server-only); the
   NextAuth wiring lives in src/auth.ts. */

export const ROLES = ["SuperAdmin", "HRBusinessPartner", "OperationsLead", "ProjectManager", "WFM", "Agent"];

export const ROLE_LABEL = {
  SuperAdmin: "Super Admin",
  HRBusinessPartner: "HR Business Partner",
  OperationsLead: "Operations Lead",
  ProjectManager: "Project Manager",
  WFM: "WFM",
  Agent: "Agent",
};

/** Every seeded or admin-reset account starts here, and must change it on first login. */
export const DEFAULT_PASSWORD = "Welcome@123";
export const MIN_PASSWORD = 8;

/* What each staff role may see. Agents never reach the workspace at all —
   they live in /agent-portal, enforced by the route-group layouts. */
export const TABS_FOR = {
  SuperAdmin: ["dashboard", "log", "rta", "triage", "approvals", "agents", "dcm", "users", "settings"],
  WFM: ["rta"],
  ProjectManager: ["dashboard", "log", "triage", "agents"],
  OperationsLead: ["dashboard", "approvals", "agents"],
  HRBusinessPartner: ["dashboard", "approvals", "agents"],
  Agent: [],
};

const PERMS = {
  // Any pipeline participant may write case fields; which *controls* they see
  // is still gated per-step below. WFM and Agent never edit cases directly.
  caseWrite: ["SuperAdmin", "ProjectManager", "OperationsLead", "HRBusinessPartner"],
  log: ["SuperAdmin", "ProjectManager"],
  upload: ["SuperAdmin", "WFM"],
  triage: ["SuperAdmin", "ProjectManager"], // escalate / dismiss / notify / assign
  ops: ["SuperAdmin", "OperationsLead"],
  hr: ["SuperAdmin", "HRBusinessPartner"],
  admin: ["SuperAdmin"], // DCM, users, settings, factory reset
  delete: ["SuperAdmin"], // destroying a case erases evidence — admin only
  acknowledge: ["Agent"], // digital signature on finalized cases
};

export const can = (user, action) => !!user && (PERMS[action] || []).includes(user.role);
