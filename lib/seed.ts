import type { GlucoseReading, InsulinDose } from "./types";

function isoAt(dayOffset: number, hour: number, minute = 0): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute).toISOString();
}

export const seedGlucose: GlucoseReading[] = [
  { id: "seed-g-1", timestamp: isoAt(0, 7, 15), value: 102 },
  { id: "seed-g-2", timestamp: isoAt(0, 10, 30), value: 128 },
  { id: "seed-g-3", timestamp: isoAt(0, 13, 10), value: 94 },
  { id: "seed-g-4", timestamp: isoAt(0, 17, 45), value: 164 },
  { id: "seed-g-5", timestamp: isoAt(0, 21, 5), value: 112 },
  { id: "seed-g-6", timestamp: isoAt(-1, 8, 0), value: 89 },
  { id: "seed-g-7", timestamp: isoAt(-1, 12, 25), value: 121 },
  { id: "seed-g-8", timestamp: isoAt(-1, 18, 35), value: 174 },
  { id: "seed-g-9", timestamp: isoAt(-2, 7, 40), value: 67 },
  { id: "seed-g-10", timestamp: isoAt(-2, 13, 20), value: 108 },
  { id: "seed-g-11", timestamp: isoAt(-3, 9, 10), value: 116 },
  { id: "seed-g-12", timestamp: isoAt(-4, 16, 0), value: 186 },
  { id: "seed-g-13", timestamp: isoAt(-5, 11, 30), value: 97 },
  { id: "seed-g-14", timestamp: isoAt(-6, 19, 20), value: 143 }
];

export const seedInsulin: InsulinDose[] = [
  { id: "seed-i-1", timestamp: isoAt(0, 7, 30), type: "Basal", quantity: 12, durationMinutes: 600 },
  { id: "seed-i-2", timestamp: isoAt(0, 12, 45), type: "Bolus", quantity: 4.5 },
  { id: "seed-i-3", timestamp: isoAt(0, 18, 15), type: "Bolus", quantity: 5 },
  { id: "seed-i-4", timestamp: isoAt(-1, 7, 20), type: "Basal", quantity: 11.5, durationMinutes: 600 },
  { id: "seed-i-5", timestamp: isoAt(-1, 18, 5), type: "Bolus", quantity: 4 },
  { id: "seed-i-6", timestamp: isoAt(-2, 8, 10), type: "Basal", quantity: 12, durationMinutes: 540 }
];
