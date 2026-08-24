"use client";

import { useMemo, useState } from "react";
import { formatLongDate, formatTime } from "@/lib/business";
import type { GlucoseReading, InsulinDose } from "@/lib/types";

interface Tooltip {
  x: number;
  y: number;
  lines: string[];
}

interface TrendChartProps {
  day: Date;
  readings: GlucoseReading[];
  doses: InsulinDose[];
  onSelectReading: (reading: GlucoseReading) => void;
  onSelectDose: (dose: InsulinDose) => void;
}

const WIDTH = 1000;
const HEIGHT = 430;
const LEFT = 68;
const RIGHT = 78;
const TOP = 28;
const BOTTOM = 66;
const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;

function hourOf(timestamp: string): number {
  const date = new Date(timestamp);
  return date.getHours() + date.getMinutes() / 60;
}

function xFor(timestamp: string): number {
  return LEFT + (Math.min(23, Math.max(0, hourOf(timestamp))) / 23) * PLOT_WIDTH;
}

function glucoseY(value: number): number {
  return TOP + ((220 - Math.min(220, Math.max(40, value))) / 180) * PLOT_HEIGHT;
}

export function TrendChart({ day, readings, doses, onSelectReading, onSelectDose }: TrendChartProps) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const insulinMax = useMemo(() => Math.max(10, Math.ceil(Math.max(0, ...doses.map(dose => dose.quantity)) * 1.2)), [doses]);
  const insulinY = (value: number) => TOP + ((insulinMax - value) / insulinMax) * PLOT_HEIGHT;
  const orderedReadings = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const points = orderedReadings.map(reading => `${xFor(reading.timestamp)},${glucoseY(reading.value)}`).join(" ");
  const show = (x: number, y: number, lines: string[]) => setTooltip({ x: Math.min(WIDTH - 240, Math.max(LEFT, x)), y: Math.max(TOP + 12, y - 12), lines });
  const dateLabel = formatLongDate(day);

  return (
    <div className="chart-wrap">
      <svg className="trend-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`24-hour glucose and insulin chart for ${dateLabel}`} aria-describedby="chart-desc">
        <desc id="chart-desc">Glucose uses the left axis in milligrams per deciliter. Insulin uses the right axis in units.</desc>

        <rect x={LEFT} y={glucoseY(220)} width={PLOT_WIDTH} height={glucoseY(180) - glucoseY(220)} className="zone-high" />
        <rect x={LEFT} y={glucoseY(115)} width={PLOT_WIDTH} height={glucoseY(80) - glucoseY(115)} className="zone-normal" />
        <rect x={LEFT} y={glucoseY(70)} width={PLOT_WIDTH} height={glucoseY(40) - glucoseY(70)} className="zone-low" />

        {[40, 70, 80, 115, 180, 220].map(value => (
          <g key={value}>
            <line x1={LEFT} y1={glucoseY(value)} x2={WIDTH - RIGHT} y2={glucoseY(value)} className="grid-line" />
            <text x={LEFT - 12} y={glucoseY(value) + 5} textAnchor="end" className="axis-label">{value}</text>
          </g>
        ))}
        {[0, 4, 8, 12, 16, 20, 23].map(hour => {
          const x = LEFT + (hour / 23) * PLOT_WIDTH;
          return (
            <g key={hour}>
              <line x1={x} y1={TOP} x2={x} y2={HEIGHT - BOTTOM} className="grid-line vertical" />
              <text x={x} y={HEIGHT - BOTTOM + 27} textAnchor="middle" className="axis-label">{String(hour).padStart(2, "0")}:00</text>
            </g>
          );
        })}

        <text x={18} y={TOP + PLOT_HEIGHT / 2} transform={`rotate(-90 18 ${TOP + PLOT_HEIGHT / 2})`} textAnchor="middle" className="axis-title">Glucose (mg/dL)</text>
        <text x={WIDTH - 18} y={TOP + PLOT_HEIGHT / 2} transform={`rotate(90 ${WIDTH - 18} ${TOP + PLOT_HEIGHT / 2})`} textAnchor="middle" className="axis-title">Insulin (units)</text>
        <text x={LEFT + PLOT_WIDTH / 2} y={HEIGHT - 10} textAnchor="middle" className="axis-title">Time</text>
        {[0, insulinMax / 2, insulinMax].map(value => (
          <text key={value} x={WIDTH - RIGHT + 12} y={insulinY(value) + 5} className="axis-label">{value.toFixed(value % 1 ? 1 : 0)}</text>
        ))}

        {orderedReadings.length > 1 && <polyline points={points} className="glucose-line" />}
        {orderedReadings.map(reading => {
          const x = xFor(reading.timestamp);
          const y = glucoseY(reading.value);
          const lines = [`${reading.value} mg/dL`, formatLongDate(reading.timestamp), formatTime(reading.timestamp)];
          return (
            <circle key={reading.id} cx={x} cy={y} r="6" className="glucose-point interactive-mark" tabIndex={0} role="button"
              aria-label={`Glucose ${reading.value} milligrams per deciliter, ${lines[1]} at ${lines[2]}`}
              onMouseEnter={() => show(x, y, lines)} onMouseLeave={() => setTooltip(null)}
              onFocus={() => show(x, y, lines)} onBlur={() => setTooltip(null)} onClick={() => onSelectReading(reading)} />
          );
        })}

        {doses.map(dose => {
          const startX = xFor(dose.timestamp);
          const y = insulinY(dose.quantity);
          const lines = [
            `${dose.type}: ${dose.quantity.toFixed(1)} units`,
            ...(dose.durationMinutes ? [`Duration: ${dose.durationMinutes} minutes`] : []),
            formatLongDate(dose.timestamp),
            formatTime(dose.timestamp)
          ];
          if (dose.type === "Basal") {
            const endHour = Math.min(23, hourOf(dose.timestamp) + (dose.durationMinutes ?? 0) / 60);
            const endX = LEFT + (endHour / 23) * PLOT_WIDTH;
            return (
              <line key={dose.id} x1={startX} y1={y} x2={Math.max(startX + 2, endX)} y2={y} className="basal-line interactive-mark"
                tabIndex={0} role="button" aria-label={`${lines.join(", ")}`}
                onMouseEnter={() => show(startX, y, lines)} onMouseLeave={() => setTooltip(null)}
                onFocus={() => show(startX, y, lines)} onBlur={() => setTooltip(null)} onClick={() => onSelectDose(dose)} />
            );
          }
          const diamond = `${startX},${y - 8} ${startX + 8},${y} ${startX},${y + 8} ${startX - 8},${y}`;
          return (
            <polygon key={dose.id} points={diamond} className="bolus-mark interactive-mark" tabIndex={0} role="button"
              aria-label={`${lines.join(", ")}`}
              onMouseEnter={() => show(startX, y, lines)} onMouseLeave={() => setTooltip(null)}
              onFocus={() => show(startX, y, lines)} onBlur={() => setTooltip(null)} onClick={() => onSelectDose(dose)} />
          );
        })}

        {tooltip && (
          <g className="chart-tooltip" pointerEvents="none">
            <rect x={tooltip.x + 10} y={tooltip.y - 24} width="220" height={tooltip.lines.length * 21 + 16} rx="8" />
            {tooltip.lines.map((line, index) => <text key={line} x={tooltip.x + 22} y={tooltip.y + index * 21}>{line}</text>)}
          </g>
        )}
      </svg>
      <div className="legend" aria-label="Chart legend">
        <span><i className="legend-glucose" />Glucose · left axis</span>
        <span><i className="legend-basal" />Basal duration · right axis</span>
        <span><i className="legend-bolus" />Bolus · right axis</span>
      </div>
    </div>
  );
}
