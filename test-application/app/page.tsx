"use client";

import { useState } from "react";

export default function Home() {
  const [started, setStarted] = useState(false);

  return (
    <main className="app-shell">
      <section className="card" aria-live="polite">
        <p className="eyebrow">Ready when you are</p>
        <h1>{started ? "Hello World" : "Welcome"}</h1>
        <p className="supporting-copy">
          {started
            ? "Your app has started successfully."
            : "Press the button below to begin."}
        </p>
        <div className="button-group">
          <button
            className="start-button"
            type="button"
            onClick={() => setStarted(true)}
          >
            Start
          </button>
          {started && (
            <button
              className="reset-button"
              type="button"
              onClick={() => setStarted(false)}
            >
              Reset
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
