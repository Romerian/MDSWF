import assert from "node:assert/strict";
import test from "node:test";
import {
  isAcceptable,
  isValidBasalDuration,
  isValidGlucose,
  isValidInsulinQuantity,
  pruneAudit,
  warningFor
} from "../lib/business.ts";
import {
  authenticateCredentials,
  INACTIVITY_TIMEOUT_MS,
  LOCKOUT_DURATION_MS,
  MAX_AUTH_ATTEMPTS
} from "../lib/auth.ts";

test("demo user credentials are authenticated exactly", () => {
  assert.equal(authenticateCredentials("demo", "watchdog"), true);
  assert.equal(authenticateCredentials(" demo ", "watchdog"), true);
  assert.equal(authenticateCredentials("demo", "Watchdog"), false);
  assert.equal(authenticateCredentials("unknown", "watchdog"), false);
});

test("authentication timing and retry limits match the linked requirements", () => {
  assert.equal(MAX_AUTH_ATTEMPTS, 5);
  assert.equal(LOCKOUT_DURATION_MS, 120_000);
  assert.equal(INACTIVITY_TIMEOUT_MS, 60_000);
});

test("glucose validation enforces the detailed-design range", () => {
  assert.equal(isValidGlucose(20), true);
  assert.equal(isValidGlucose(500), true);
  assert.equal(isValidGlucose(19), false);
  assert.equal(isValidGlucose(501), false);
  assert.equal(isValidGlucose(Number.NaN), false);
});

test("insulin quantity uses the required inclusive range and increments", () => {
  assert.equal(isValidInsulinQuantity(0.1), true);
  assert.equal(isValidInsulinQuantity(200), true);
  assert.equal(isValidInsulinQuantity(1.25), false);
  assert.equal(isValidInsulinQuantity(0), false);
});

test("Basal duration accepts only whole minutes from 1 through 720", () => {
  assert.equal(isValidBasalDuration(1), true);
  assert.equal(isValidBasalDuration(720), true);
  assert.equal(isValidBasalDuration(0), false);
  assert.equal(isValidBasalDuration(721), false);
  assert.equal(isValidBasalDuration(1.5), false);
});

test("warning thresholds and acceptable range remain distinct", () => {
  assert.match(warningFor(69) ?? "", /Hypoglycemia/);
  assert.equal(warningFor(70), null);
  assert.equal(warningFor(180), null);
  assert.match(warningFor(181) ?? "", /Hyperglycemia/);
  assert.equal(isAcceptable(80), true);
  assert.equal(isAcceptable(115), true);
  assert.equal(isAcceptable(116), false);
});

test("audit trail is deduplicated, ordered, and pruned to 12 months", () => {
  const now = new Date("2026-08-24T12:00:00Z");
  const retained = { id: "1", timestamp: "2026-08-01T12:00:00Z", activity: "glucose" as const, description: "Glucose reading: 100 mg/dL" };
  const old = { id: "2", timestamp: "2025-07-01T12:00:00Z", activity: "glucose" as const, description: "Glucose reading: 90 mg/dL" };
  const duplicate = { ...retained, id: "3" };
  assert.deepEqual(pruneAudit([old, retained, duplicate], now), [duplicate]);
});
