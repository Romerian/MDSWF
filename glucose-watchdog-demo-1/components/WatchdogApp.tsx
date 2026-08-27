"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  addLocalDays,
  formatLongDate,
  formatTime,
  glucoseAudit,
  insulinAudit,
  isAcceptable,
  isValidBasalDuration,
  isValidGlucose,
  isValidInsulinQuantity,
  localPartsToIso,
  sameLocalDay,
  sortNewestFirst,
  startOfLocalDay,
  toLocalInputParts,
  warningAudit,
  warningFor
} from "@/lib/business";
import { appendAudit, initializeAudit, loadApplicationData, saveApplicationData } from "@/lib/storage";
import { INACTIVITY_TIMEOUT_MS } from "@/lib/auth";
import type { GlucoseReading, InsulinDose, InsulinType, StoredApplicationData, UserAccount } from "@/lib/types";
import { BulldogIcon } from "./BulldogIcon";
import { LoginGate } from "./LoginGate";
import { TrendChart } from "./TrendChart";
import { UserManagementScreen } from "./UserManagementScreen";

type SelectedEntry = { kind: "glucose"; value: GlucoseReading } | { kind: "insulin"; value: InsulinDose };
type DialogName = "reading" | "insulin" | null;

const WARNING_REPEAT_MS = 5 * 60 * 1000;

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function DialogFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="modal-heading"><h2 id="dialog-title">{title}</h2><button ref={closeRef} className="close-button" onClick={onClose} aria-label="Close dialog">×</button></div>
        {children}
      </section>
    </div>
  );
}

export function WatchdogApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [screen, setScreen] = useState<"dashboard" | "user-management">("dashboard");
  const [authenticationMessage, setAuthenticationMessage] = useState<string | null>(null);
  const [data, setData] = useState<StoredApplicationData>({ glucose: [], insulin: [] });
  const [loaded, setLoaded] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => new Date(2000, 0, 1));
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [snoozedWarning, setSnoozedWarning] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setTimeout(() => {
      const initial = loadApplicationData();
      setData(initial);
      initializeAudit(initial);
      setSelectedDay(startOfLocalDay(new Date()));
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    let inactivityTimer: number;
    const resetInactivityTimer = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        setAuthenticated(false);
        setCurrentUser(null);
        setScreen("dashboard");
        setAuthenticationMessage("You were logged off after 5 minutes of inactivity.");
        setDialog(null);
        setSelectedEntry(null);
      }, INACTIVITY_TIMEOUT_MS);
    };
    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach(eventName => window.addEventListener(eventName, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();
    return () => {
      window.clearTimeout(inactivityTimer);
      activityEvents.forEach(eventName => window.removeEventListener(eventName, resetInactivityTimer));
    };
  }, [authenticated]);

  useEffect(() => {
    if (loaded) saveApplicationData(data);
  }, [data, loaded]);

  useEffect(() => {
    if (!snoozedWarning) return;
    const timer = window.setTimeout(() => {
      const latest = sortNewestFirst(data.glucose)[0];
      if (latest && !isAcceptable(latest.value)) {
        setWarning(snoozedWarning);
        appendAudit(warningAudit(snoozedWarning, new Date().toISOString(), newId("audit-warning")));
      }
      setSnoozedWarning(null);
    }, WARNING_REPEAT_MS);
    return () => window.clearTimeout(timer);
  }, [snoozedWarning, data.glucose]);

  const dayReadings = useMemo(() => data.glucose.filter(reading => sameLocalDay(reading.timestamp, selectedDay)), [data.glucose, selectedDay]);
  const dayDoses = useMemo(() => data.insulin.filter(dose => sameLocalDay(dose.timestamp, selectedDay)), [data.insulin, selectedDay]);
  const current = sortNewestFirst(data.glucose)[0];
  const average = dayReadings.length ? Math.round(dayReadings.reduce((sum, reading) => sum + reading.value, 0) / dayReadings.length) : null;
  const today = startOfLocalDay(new Date());
  const earliestDay = addLocalDays(today, -6);

  function displayWarningFor(reading: GlucoseReading) {
    if (isAcceptable(reading.value)) {
      setWarning(null);
      setSnoozedWarning(null);
      return;
    }
    const message = warningFor(reading.value);
    if (message) {
      setWarning(message);
      setSnoozedWarning(null);
      appendAudit(warningAudit(message, new Date().toISOString(), newId("audit-warning")));
    }
  }

  function addReading(reading: GlucoseReading) {
    setData(previous => ({ ...previous, glucose: sortNewestFirst([reading, ...previous.glucose]) }));
    appendAudit(glucoseAudit(reading));
    displayWarningFor(reading);
    setSelectedDay(startOfLocalDay(new Date(reading.timestamp)));
  }

  function addDose(dose: InsulinDose) {
    setData(previous => ({ ...previous, insulin: sortNewestFirst([dose, ...previous.insulin]) }));
    appendAudit(insulinAudit(dose));
    setSelectedDay(startOfLocalDay(new Date(dose.timestamp)));
  }

  function deleteSelected() {
    if (!selectedEntry || !window.confirm("Delete this reading? This action removes it from the glucose chart.")) return;
    if (selectedEntry.kind === "glucose") {
      setData(previous => ({ ...previous, glucose: previous.glucose.filter(item => item.id !== selectedEntry.value.id) }));
    } else {
      setData(previous => ({ ...previous, insulin: previous.insulin.filter(item => item.id !== selectedEntry.value.id) }));
    }
    setSelectedEntry(null);
  }

  if (!authenticated) {
    return <LoginGate message={authenticationMessage} onAuthenticated={user => { setAuthenticationMessage(null); setCurrentUser(user); setScreen("dashboard"); setAuthenticated(true); }} />;
  }

  if (screen === "user-management" && currentUser?.userType === "Administrator") {
    return <UserManagementScreen
      currentUserId={currentUser.id}
      onReturn={() => setScreen("dashboard")}
      onCurrentUserChanged={user => {
        setCurrentUser(user);
        setScreen("dashboard");
        if (!user) setAuthenticated(false);
      }}
    />;
  }

  async function importExcel(file: File) {
    setImportMessage(null);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const rows = await readSheet(file);
      if (!rows.length) throw new Error("The workbook does not contain a worksheet.");
      const headers = new Map<string, number>();
      rows[0].forEach((cell, column) => headers.set(String(cell ?? "").trim().toLowerCase(), column));
      const dateColumn = headers.get("date");
      const timeColumn = headers.get("time");
      const glucoseColumn = headers.get("glucose (mg/dl)") ?? headers.get("glucose");
      if (dateColumn === undefined || timeColumn === undefined || glucoseColumn === undefined) throw new Error("Expected Date, Time, and Glucose (mg/dL) columns.");

      const imported: GlucoseReading[] = [];
      rows.slice(1).forEach((row, index) => {
        const rowNumber = index + 2;
        const value = Number(row[glucoseColumn]);
        const dateCell = row[dateColumn];
        const timeCell = row[timeColumn];
        const timestamp = excelTimestamp(dateCell, timeCell);
        if (!isValidGlucose(value) || !timestamp) throw new Error(`Row ${rowNumber} contains an invalid glucose value, date, or time.`);
        imported.push({ id: newId("excel-glucose"), timestamp, value });
      });
      if (!imported.length) throw new Error("The worksheet does not contain glucose data.");
      setData(previous => ({ ...previous, glucose: sortNewestFirst([...imported, ...previous.glucose]) }));
      imported.forEach(reading => appendAudit(glucoseAudit(reading)));
      displayWarningFor(sortNewestFirst(imported)[0]);
      setSelectedDay(startOfLocalDay(new Date(sortNewestFirst(imported)[0].timestamp)));
      setImportMessage(`${imported.length} glucose reading${imported.length === 1 ? "" : "s"} loaded.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "The workbook could not be loaded.");
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Glucose Watchdog main page"><BulldogIcon /><span>Glucose Watchdog</span></Link>
        <nav className="header-actions" aria-label="Application actions">
          {currentUser?.userType === "Administrator" && <button className="button secondary" onClick={() => setScreen("user-management")}>User Management</button>}
          <Link className="button secondary" href="/audit-trail" target="_blank" rel="opener">Audit Trail</Link>
          <label className="button secondary file-button">Load Excel data<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => { const file = event.target.files?.[0]; if (file) void importExcel(file); event.target.value = ""; }} /></label>
          <button className="button secondary" onClick={() => setDialog("insulin")}>Add insulin</button>
          <button className="button primary" onClick={() => setDialog("reading")}>Add reading</button>
        </nav>
      </header>

      {warning && (
        <aside className="warning-banner" role="alert">
          <strong>Glucose warning</strong><span>{warning}</span>
          <button onClick={() => { setSnoozedWarning(warning); setWarning(null); }} aria-label="Acknowledge warning">Acknowledge</button>
        </aside>
      )}

      <section className="dashboard-intro">
        <div><p className="eyebrow">24-hour overview</p><h1>Your glucose at a glance</h1><p>Review glucose and insulin together across the last seven days.</p></div>
        {importMessage && <p className="import-message" role="status">{importMessage}</p>}
      </section>

      <section className="summary-grid" aria-label="Glucose summary">
        <article className="summary-card current"><span>Current glucose</span><strong>{loaded && current ? current.value : "—"}<small>{loaded && current ? " mg/dL" : ""}</small></strong><p>{loaded && current ? `${formatLongDate(current.timestamp)} · ${formatTime(current.timestamp)}` : "No reading"}</p></article>
        <article className="summary-card"><span>Daily average</span><strong>{average ?? "—"}<small>{average !== null ? " mg/dL" : ""}</small></strong><p>{dayReadings.length} reading{dayReadings.length === 1 ? "" : "s"} this day</p></article>
        <article className="summary-card"><span>Insulin delivered</span><strong>{dayDoses.reduce((sum, dose) => sum + dose.quantity, 0).toFixed(1)}<small> units</small></strong><p>{dayDoses.length} deliver{dayDoses.length === 1 ? "y" : "ies"} this day</p></article>
      </section>

      <section className="panel chart-panel" aria-labelledby="trend-heading">
        <div className="panel-heading">
          <div><p className="eyebrow">Daily trend</p><h2 id="trend-heading">Glucose & insulin</h2></div>
          <div className="day-nav">
            <button className="icon-button" disabled={selectedDay <= earliestDay} onClick={() => setSelectedDay(addLocalDays(selectedDay, -1))} aria-label="Previous day">←</button>
            <div><strong>{formatLongDate(selectedDay)}</strong><small>Full 24-hour day</small></div>
            <button className="icon-button" disabled={selectedDay >= today} onClick={() => setSelectedDay(addLocalDays(selectedDay, 1))} aria-label="Next day">→</button>
          </div>
        </div>
        <TrendChart day={selectedDay} readings={dayReadings} doses={dayDoses} onSelectReading={value => setSelectedEntry({ kind: "glucose", value })} onSelectDose={value => setSelectedEntry({ kind: "insulin", value })} />
      </section>

      <section className="history-grid">
        <article className="panel history-panel"><div className="panel-heading compact"><h2>Recent glucose</h2><span>{dayReadings.length}</span></div><div className="reading-list">
          {sortNewestFirst(dayReadings).map(reading => <button key={reading.id} onClick={() => setSelectedEntry({ kind: "glucose", value: reading })}><span className="reading-dot" /><span><strong>{reading.value} mg/dL</strong><small>{formatLongDate(reading.timestamp)} · {formatTime(reading.timestamp)}</small></span><b>›</b></button>)}
          {!dayReadings.length && <p className="empty">No glucose readings this day.</p>}
        </div></article>
        <article className="panel history-panel"><div className="panel-heading compact"><h2>Recent insulin</h2><span>{dayDoses.length}</span></div><div className="reading-list">
          {sortNewestFirst(dayDoses).map(dose => <button key={dose.id} onClick={() => setSelectedEntry({ kind: "insulin", value: dose })}><span className={`dose-mark ${dose.type.toLowerCase()}`} /><span><strong>{dose.type} · {dose.quantity.toFixed(1)} units</strong><small>{formatLongDate(dose.timestamp)} · {formatTime(dose.timestamp)}{dose.durationMinutes ? ` · ${dose.durationMinutes} min` : ""}</small></span><b>›</b></button>)}
          {!dayDoses.length && <p className="empty">No insulin deliveries this day.</p>}
        </div></article>
      </section>

      {dialog === "reading" && <ReadingDialog onClose={() => setDialog(null)} onSave={reading => { addReading(reading); setDialog(null); }} />}
      {dialog === "insulin" && <InsulinDialog onClose={() => setDialog(null)} onSave={dose => { addDose(dose); setDialog(null); }} />}
      {selectedEntry && <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} onDelete={deleteSelected} />}
    </main>
  );
}

function ReadingDialog({ onClose, onSave }: { onClose: () => void; onSave: (reading: GlucoseReading) => void }) {
  const now = toLocalInputParts();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(now.date);
  const [time, setTime] = useState(now.time);
  const [currentTime, setCurrentTime] = useState(true);
  const [error, setError] = useState<string | null>(null);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const actual = currentTime ? toLocalInputParts() : { date, time };
    const numeric = Number(value);
    const timestamp = localPartsToIso(actual.date, actual.time);
    if (!isValidGlucose(numeric) || !timestamp) return setError("Enter a glucose value from 20 through 500 mg/dL and a valid date and time.");
    onSave({ id: newId("glucose"), value: numeric, timestamp });
  }
  return <DialogFrame title="Add glucose reading" onClose={onClose}><form className="entry-form" onSubmit={submit}>
    <label>Glucose level <span>mg/dL</span><input autoFocus type="number" min="20" max="500" step="1" value={value} onChange={event => setValue(event.target.value)} required /></label>
    <label className="check-row"><input type="checkbox" checked={currentTime} onChange={event => setCurrentTime(event.target.checked)} />Use current date and time</label>
    <div className="field-row"><label>Date<input type="date" value={date} disabled={currentTime} onChange={event => setDate(event.target.value)} required /></label><label>Time<input type="time" value={time} disabled={currentTime} onChange={event => setTime(event.target.value)} required /></label></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Save reading</button></div>
  </form></DialogFrame>;
}

function InsulinDialog({ onClose, onSave }: { onClose: () => void; onSave: (dose: InsulinDose) => void }) {
  const now = toLocalInputParts();
  const [type, setType] = useState<InsulinType>("Basal");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(now.date);
  const [time, setTime] = useState(now.time);
  const [currentTime, setCurrentTime] = useState(true);
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("minutes");
  const [error, setError] = useState<string | null>(null);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const actual = currentTime ? toLocalInputParts() : { date, time };
    const timestamp = localPartsToIso(actual.date, actual.time);
    const numericQuantity = Number(quantity);
    const durationMinutes = Math.round(Number(duration) * (durationUnit === "hours" ? 60 : 1));
    if (!timestamp || !isValidInsulinQuantity(numericQuantity) || (type === "Basal" && !isValidBasalDuration(durationMinutes))) {
      return setError("Enter 0.1–200.0 units in 0.1-unit increments, a valid date and time, and a Basal duration of 1–720 minutes.");
    }
    onSave({ id: newId("insulin"), timestamp, type, quantity: numericQuantity, ...(type === "Basal" ? { durationMinutes } : {}) });
  }
  return <DialogFrame title="Add insulin delivery" onClose={onClose}><form className="entry-form" onSubmit={submit}>
    <fieldset><legend>Insulin type</legend><div className="segmented"><label><input type="radio" name="type" checked={type === "Basal"} onChange={() => setType("Basal")} />Basal</label><label><input type="radio" name="type" checked={type === "Bolus"} onChange={() => setType("Bolus")} />Bolus</label></div></fieldset>
    <label>Quantity <span>units</span><input autoFocus type="number" min="0.1" max="200" step="0.1" value={quantity} onChange={event => setQuantity(event.target.value)} required /></label>
    {type === "Basal" && <div className="field-row"><label>Duration<input type="number" min={durationUnit === "minutes" ? 1 : 0.01} max={durationUnit === "minutes" ? 720 : 12} step={durationUnit === "minutes" ? 1 : 0.01} value={duration} onChange={event => setDuration(event.target.value)} required /></label><label>Duration unit<select value={durationUnit} onChange={event => setDurationUnit(event.target.value as "minutes" | "hours")}><option value="minutes">Minutes</option><option value="hours">Hours</option></select></label></div>}
    <label className="check-row"><input type="checkbox" checked={currentTime} onChange={event => setCurrentTime(event.target.checked)} />Use current date and time</label>
    <div className="field-row"><label>Date<input type="date" value={date} disabled={currentTime} onChange={event => setDate(event.target.value)} required /></label><label>Time<input type="time" value={time} disabled={currentTime} onChange={event => setTime(event.target.value)} required /></label></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Save delivery</button></div>
  </form></DialogFrame>;
}

function EntryDetail({ entry, onClose, onDelete }: { entry: SelectedEntry; onClose: () => void; onDelete: () => void }) {
  const timestamp = entry.value.timestamp;
  const value = entry.kind === "glucose" ? `${entry.value.value} mg/dL` : `${entry.value.type} · ${entry.value.quantity.toFixed(1)} units${entry.value.durationMinutes ? ` · ${entry.value.durationMinutes} minutes` : ""}`;
  return <DialogFrame title={entry.kind === "glucose" ? "Glucose reading" : "Insulin delivery"} onClose={onClose}><dl className="entry-details"><div><dt>Date</dt><dd>{formatLongDate(timestamp)}</dd></div><div><dt>Time</dt><dd>{formatTime(timestamp)}</dd></div><div><dt>Value</dt><dd>{value}</dd></div></dl><div className="form-actions"><button className="button danger" onClick={onDelete}>Delete</button><button className="button secondary" onClick={onClose}>Close</button></div></DialogFrame>;
}

function excelTimestamp(dateValue: unknown, timeValue: unknown): string | null {
  const date = dateValue instanceof Date ? dateValue : typeof dateValue === "number" ? excelSerialToDate(dateValue) : new Date(String(dateValue));
  if (!Number.isFinite(date.getTime())) return null;
  let hours = 0;
  let minutes = 0;
  if (timeValue instanceof Date) {
    hours = timeValue.getHours(); minutes = timeValue.getMinutes();
  } else if (typeof timeValue === "number") {
    const total = Math.round((timeValue % 1) * 24 * 60); hours = Math.floor(total / 60); minutes = total % 60;
  } else {
    const match = String(timeValue).match(/^(\d{1,2}):(\d{2})/); if (!match) return null; hours = Number(match[1]); minutes = Number(match[2]);
  }
  const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
  return Number.isFinite(combined.getTime()) ? combined.toISOString() : null;
}

function excelSerialToDate(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
}
