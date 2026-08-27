export const MAX_AUTH_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 2 * 60_000;
export const INACTIVITY_TIMEOUT_MS = 5 * 60_000;

export const DEFAULT_ADMIN_USERNAME = "Admin";
export const DEFAULT_ADMIN_PASSWORD = "Watchdog";

export function authenticateCredentials(username: string, password: string): boolean {
  return username.trim() === DEFAULT_ADMIN_USERNAME && password === DEFAULT_ADMIN_PASSWORD;
}
