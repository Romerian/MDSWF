"use client";

import { useEffect, useRef, useState } from "react";
import {
  LOCKOUT_DURATION_MS,
  MAX_AUTH_ATTEMPTS
} from "@/lib/auth";
import { authenticateUser, loadUsers, recordUserLogin } from "@/lib/storage";
import type { UserAccount } from "@/lib/types";
import { BulldogIcon } from "./BulldogIcon";

export function LoginGate({ onAuthenticated, message }: { onAuthenticated: (user: UserAccount) => void; message?: string | null }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_AUTH_ATTEMPTS);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  const locked = lockedUntil !== null && lockedUntil > now;
  const countdownSeconds = lockedUntil === null ? 0 : Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const countdownMinutes = Math.floor(countdownSeconds / 60);
  const countdownRemainder = countdownSeconds % 60;

  useEffect(() => usernameRef.current?.focus(), []);

  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) {
        window.clearInterval(timer);
        setLockedUntil(null);
        setAttemptsRemaining(MAX_AUTH_ATTEMPTS);
        setError(null);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (locked || !username.trim() || !password) return;

    const matchedUser = authenticateUser(loadUsers(), username, password);
    if (matchedUser) {
      setAttemptsRemaining(MAX_AUTH_ATTEMPTS);
      setError(null);
      onAuthenticated(recordUserLogin(matchedUser.id) ?? matchedUser);
      return;
    }

    const remaining = attemptsRemaining - 1;
    setPassword("");
    setAttemptsRemaining(Math.max(0, remaining));
    if (remaining <= 0) {
      const until = Date.now() + LOCKOUT_DURATION_MS;
      setNow(Date.now());
      setLockedUntil(until);
      setError("Authentication failed. Login is locked for 2 minutes.");
    } else {
      setError("Authentication failed. Check the username and password.");
    }
  }

  return (
    <main className="login-shell">
      <section className="login-popup" role="dialog" aria-modal="true" aria-labelledby="login-heading">
        <div className="login-brand"><BulldogIcon /><span>Glucose Watchdog</span></div>
        <div className="login-heading"><p className="eyebrow">User authentication</p><h1 id="login-heading">Log in</h1><p>Enter your username and password to view or manage glucose data.</p></div>
        {message && <p className="login-status" role="status">{message}</p>}
        <form className="entry-form" onSubmit={submit}>
          <label>Username<input ref={usernameRef} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} disabled={locked} required /></label>
          <label>Password
            <span className="password-control">
              <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={locked} required />
              <button type="button" onClick={() => setShowPassword(value => !value)} disabled={locked}>{showPassword ? "Hide" : "Show"} password</button>
            </span>
          </label>
          <p className="attempt-count" aria-live="polite">{attemptsRemaining} of {MAX_AUTH_ATTEMPTS} attempts remaining</p>
          {locked && <p className="lockout-countdown" role="timer">Lockout lifts in {countdownMinutes}:{String(countdownRemainder).padStart(2, "0")}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary login-submit" type="submit" disabled={locked || !username.trim() || !password}>Submit</button>
        </form>
      </section>
    </main>
  );
}
