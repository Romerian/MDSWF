"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addLocalDays, formatLongDate, formatTime, startOfLocalDay } from "@/lib/business";
import { loadAuditTrail } from "@/lib/storage";
import type { AuditRecord } from "@/lib/types";
import { BulldogIcon } from "./BulldogIcon";

export function AuditTrailView() {
  const router = useRouter();
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [intervalEnd, setIntervalEnd] = useState(() => new Date(2000, 0, 1));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecords(loadAuditTrail());
      setIntervalEnd(startOfLocalDay(new Date()));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const intervalStart = addLocalDays(intervalEnd, -6);
  const visible = useMemo(() => records.filter(record => {
    const value = new Date(record.timestamp);
    const upper = addLocalDays(intervalEnd, 1);
    return value >= intervalStart && value < upper;
  }), [records, intervalEnd, intervalStart]);
  const earliest = new Date();
  earliest.setMonth(earliest.getMonth() - 12);
  const canPrevious = intervalStart > earliest;
  const canNext = intervalEnd < startOfLocalDay(new Date());

  function returnToMainScreen() {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }
    router.push("/");
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Glucose Watchdog main page"><BulldogIcon /><span>Glucose Watchdog</span></Link>
        <button className="button secondary" onClick={returnToMainScreen}>Return to Main Screen</button>
      </header>
      <section className="page-heading">
        <p className="eyebrow">Read-only history</p>
        <h1>Audit Trail</h1>
        <p>Glucose readings, insulin deliveries, and displayed warnings retained for the last 12 months.</p>
      </section>
      <section className="panel audit-panel" aria-labelledby="audit-period">
        <div className="period-nav">
          <button className="icon-button" disabled={!canPrevious} onClick={() => setIntervalEnd(addLocalDays(intervalEnd, -7))} aria-label="Previous seven days">←</button>
          <div><span id="audit-period">{formatLongDate(intervalStart)} – {formatLongDate(intervalEnd)}</span><small>Seven-day interval</small></div>
          <button className="icon-button" disabled={!canNext} onClick={() => setIntervalEnd(addLocalDays(intervalEnd, 7) > new Date() ? startOfLocalDay(new Date()) : addLocalDays(intervalEnd, 7))} aria-label="Next seven days">→</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Time</th><th>Activity</th><th>Description</th></tr></thead>
            <tbody>
              {visible.map(record => (
                <tr key={record.id}><td>{formatLongDate(record.timestamp)}</td><td>{formatTime(record.timestamp)}</td><td><span className={`activity ${record.activity}`}>{record.activity}</span></td><td>{record.description}</td></tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={4} className="empty">No audit records in this interval.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
