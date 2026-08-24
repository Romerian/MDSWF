import type { AuditRecord, GlucoseReading, InsulinDose } from "./types.ts";

export const GLUCOSE_MIN = 20;
export const GLUCOSE_MAX = 500;
export const WARNING_LOW = 70;
export const WARNING_HIGH = 180;
export const NORMAL_LOW = 80;
export const NORMAL_HIGH = 115;
export const INSULIN_MIN = 0.1;
export const INSULIN_MAX = 200;
export const BASAL_DURATION_MIN = 1;
export const BASAL_DURATION_MAX = 720;
export const AUDIT_RETENTION_MONTHS = 12;

export function isValidGlucose(value: number): boolean {
  return Number.isFinite(value) && value >= GLUCOSE_MIN && value <= GLUCOSE_MAX;
}

export function isValidInsulinQuantity(value: number): boolean {
  return Number.isFinite(value) && value >= INSULIN_MIN && value <= INSULIN_MAX && Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
}

export function isValidBasalDuration(value: number): boolean {
  return Number.isInteger(value) && value >= BASAL_DURATION_MIN && value <= BASAL_DURATION_MAX;
}

export function isValidTimestamp(timestamp: string): boolean {
  return timestamp.length > 0 && Number.isFinite(new Date(timestamp).getTime());
}

export function warningFor(value: number): string | null {
  if (value < WARNING_LOW) {
    return "Hypoglycemia. Eat or drink fast acting sugar right away. Then allow 15 minutes before checking blood sugar levels.";
  }
  if (value > WARNING_HIGH) return "Alert Hyperglycemia! Take appropriate action.";
  return null;
}

export function isAcceptable(value: number): boolean {
  return value >= NORMAL_LOW && value <= NORMAL_HIGH;
}

export function sameLocalDay(timestamp: string, day: Date): boolean {
  const date = new Date(timestamp);
  return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatLongDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export function toLocalInputParts(date = new Date()): { date: string; time: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}

export function localPartsToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export function sortNewestFirst<T extends { timestamp: string }>(values: T[]): T[] {
  return [...values].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function glucoseAudit(reading: GlucoseReading): AuditRecord {
  return {
    id: `audit-glucose-${reading.id}`,
    timestamp: reading.timestamp,
    activity: "glucose",
    description: `Glucose reading: ${reading.value} mg/dL`
  };
}

export function insulinAudit(dose: InsulinDose): AuditRecord {
  const duration = dose.type === "Basal" ? `, duration ${dose.durationMinutes} minutes` : "";
  return {
    id: `audit-insulin-${dose.id}`,
    timestamp: dose.timestamp,
    activity: "insulin",
    description: `${dose.type} insulin: ${dose.quantity.toFixed(1)} units${duration}`
  };
}

export function warningAudit(message: string, timestamp: string, id: string): AuditRecord {
  return { id, timestamp, activity: "warning", description: message };
}

export function pruneAudit(records: AuditRecord[], now = new Date()): AuditRecord[] {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - AUDIT_RETENTION_MONTHS);
  const unique = new Map<string, AuditRecord>();
  for (const record of records) {
    if (new Date(record.timestamp) >= cutoff) {
      unique.set(`${record.activity}|${record.timestamp}|${record.description}`, record);
    }
  }
  return sortNewestFirst([...unique.values()]);
}
