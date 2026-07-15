import { DEFAULT_DCM } from "./dcm.js";

export const DEFAULT_ACCOUNTS = ["Hertz", "Lenovo", "Beko"];

export const DEFAULT_TLS = [
  "Salma Elhadad",
  "Ibrahim Kamel",
  "Mohamed Rashad",
  "Abdallah Ismail",
  "Ahmed Nagi",
  "Fady Bekhet",
  "Kirolos Nagi",
];

export const LEAVE_TYPES = ["Sick Leave", "Emergency Leave", "Annual Leave", "Work From Home", "Exam Leave", "Other"];

/** Warnings expire this many days after the previous occurrence of the same violation. */
export const RESET_DAYS = 90;

/** Emergency leave: 6 days a year, no more than 2 consecutive days in a month. */
export const EMERGENCY_QUOTA = 6;
export const EMERGENCY_MAX_CONSECUTIVE = 2;

/** Egyptian Labour Law No. 12 of 2003 (as amended by No. 14 of 2025). */
export const PER_INCIDENT_CAP = 5;
export const PER_MONTH_CAP = 5;
export const LAW_CITATION = "Egyptian Labour Law No. 12/2003 (am. 14/2025)";

export const STORAGE_KEY = "absence-ops:v1";
export const DATA_VERSION = 3;

export const DEFAULTS = {
  version: DATA_VERSION,
  accounts: DEFAULT_ACCOUNTS,
  tls: DEFAULT_TLS,
  dcm: DEFAULT_DCM,
  entries: [],
};
