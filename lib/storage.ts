import { glucoseAudit, insulinAudit, pruneAudit, sortNewestFirst } from "./business";
import { seedGlucose, seedInsulin } from "./seed";
import type { AuditRecord, StoredApplicationData } from "./types";

const DATA_KEY = "glucose-watchdog.application-data.v1";
export const AUDIT_KEY = "glucose-watchdog.audit-trail.v1";

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
