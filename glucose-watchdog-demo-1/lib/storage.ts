import { glucoseAudit, insulinAudit, pruneAudit, sortNewestFirst } from "./business";
import { seedGlucose, seedInsulin } from "./seed";
import { DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME } from "./auth";
import type { AuditRecord, StoredApplicationData, UserAccount } from "./types";

const DATA_KEY = "glucose-watchdog.application-data.v1";
const USERS_KEY = "glucose-watchdog.users.v1";
export const AUDIT_KEY = "glucose-watchdog.audit-trail.v1";

export const defaultAdministrator: UserAccount = {
  id: "default-administrator",
  username: DEFAULT_ADMIN_USERNAME,
  password: DEFAULT_ADMIN_PASSWORD,
  firstName: "Default",
  lastName: "Administrator",
  userType: "Administrator",
  lastLoginAt: null
};

function hasAdministrator(users: UserAccount[]): boolean {
  return users.some(user => user.userType === "Administrator");
}

export function loadUsers(): UserAccount[] {
  if (typeof window === "undefined") return [defaultAdministrator];
  try {
    const stored = JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as UserAccount[];
    const users = Array.isArray(stored) ? stored : [];
    if (users.length > 0 && hasAdministrator(users)) return users;
  } catch {
    // Restore the required default administrator below.
  }
  saveUsers([defaultAdministrator]);
  return [defaultAdministrator];
}

export function saveUsers(users: UserAccount[]): void {
  if (!users.length || !hasAdministrator(users)) throw new Error("At least one administrator account is required.");
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function authenticateUser(users: UserAccount[], username: string, password: string): UserAccount | null {
  const normalizedUsername = username.trim();
  return users.find(user => user.username === normalizedUsername && user.password === password) ?? null;
}

export function recordUserLogin(userId: string, timestamp = new Date().toISOString()): UserAccount | null {
  const users = loadUsers();
  let authenticatedUser: UserAccount | null = null;
  const updated = users.map(user => {
    if (user.id !== userId) return user;
    authenticatedUser = { ...user, lastLoginAt: timestamp };
    return authenticatedUser;
  });
  saveUsers(updated);
  return authenticatedUser;
}

export function loadApplicationData(): StoredApplicationData {
  if (typeof window === "undefined") return { glucose: seedGlucose, insulin: seedInsulin };
  try {
    const stored = JSON.parse(localStorage.getItem(DATA_KEY) ?? "null") as StoredApplicationData | null;
    if (stored) return { glucose: sortNewestFirst(stored.glucose), insulin: sortNewestFirst(stored.insulin) };
    return { glucose: seedGlucose, insulin: seedInsulin };
  } catch {
    return { glucose: seedGlucose, insulin: seedInsulin };
  }
}

export function saveApplicationData(data: StoredApplicationData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function loadAuditTrail(): AuditRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return pruneAudit(JSON.parse(localStorage.getItem(AUDIT_KEY) ?? "[]") as AuditRecord[]);
  } catch {
    return [];
  }
}

export function initializeAudit(data: StoredApplicationData): AuditRecord[] {
  return saveAuditTrail([
    ...loadAuditTrail(),
    ...data.glucose.map(glucoseAudit),
    ...data.insulin.map(insulinAudit)
  ]);
}

export function saveAuditTrail(records: AuditRecord[]): AuditRecord[] {
  const retained = pruneAudit(records);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(retained));
  return retained;
}

export function appendAudit(record: AuditRecord): AuditRecord[] {
  return saveAuditTrail([record, ...loadAuditTrail()]);
}
