export const MAX_AUTH_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 2 * 60_000;
export const INACTIVITY_TIMEOUT_MS = 60_000;

const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "watchdog";

export function authenticateCredentials(username: string, password: string): boolean {
  return username.trim() === DEMO_USERNAME && password === DEMO_PASSWORD;
}
