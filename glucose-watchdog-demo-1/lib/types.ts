export type InsulinType = "Basal" | "Bolus";

export interface GlucoseReading {
  id: string;
  timestamp: string;
  value: number;
}

export interface InsulinDose {
  id: string;
  timestamp: string;
  type: InsulinType;
  quantity: number;
  durationMinutes?: number;
}

export type AuditActivity = "glucose" | "insulin" | "warning";

export interface AuditRecord {
  id: string;
  timestamp: string;
  activity: AuditActivity;
  description: string;
}

export interface StoredApplicationData {
  glucose: GlucoseReading[];
  insulin: InsulinDose[];
}

export type UserType = "Administrator" | "User";

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  lastLoginAt: string | null;
}
