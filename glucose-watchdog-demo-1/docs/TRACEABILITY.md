# Jama Project 69 implementation traceability

This implementation is constrained to the documented scope in Jama project `GWD1` (69).

| Jama artifacts | Implemented behavior |
|---|---|
| `GWD1-UN-22`–`GWD1-UN-25` | Glucose tracking, warnings, insulin recording, and combined glucose/insulin plotting |
| `GWD1-SR-15`, `GWD1-SOFTW-10` | Persistent upper-left “Glucose Watchdog” title with English bulldog icon |
| `GWD1-SR-16`, `GWD1-SOFTW-11`–`14`, `31`–`34`, `39`–`41` | Accessible 24-hour SVG chart, specified range colors, black connected glucose points, independent insulin axis, hover and keyboard details |
| `GWD1-SR-17`, `GWD1-SAD-3` | UI components, business rules in `lib/business.ts`, and browser-storage database layer in `lib/storage.ts` |
| `GWD1-SR-18`, `GWD1-SOFTW-18`–`28`, `38`, `GWD1-SDD-2` | Basal/Bolus entry, 0.1–200.0 unit validation, date/time, current-time option, and 1–720 minute Basal duration |
| `GWD1-SR-19`, `GWD1-SOFTW-42`, `43`, `45`, `GWD1-SDD-3` | Centered hypoglycemia/hyperglycemia warning with required wording and five-minute redisplay after acknowledgment |
| `GWD1-SR-20`, `GWD1-SOFTW-15`–`17`, `38`, `GWD1-SDD-3` | Glucose entry with mg/dL and local date/time, validated from 20 through 500 mg/dL |
| `GWD1-SOFTW-19`–`24`, `GWD1-SDD-4` | Teal Basal duration line aligned to delivery start, end, and dosage; Bolus diamond marker |
| `GWD1-SOFTW-29`, `30` | Long-form dates and 24-hour `HH:mm` time display |
| `GWD1-SOFTW-32` | Day navigation limited to the last seven days |
| `GWD1-SOFTW-35`–`37` | Reading detail pop-up, delete option, confirmation, and removal from chart |
| `GWD1-SOFTW-44` | `.xlsx` glucose import using Date, Time, and Glucose (mg/dL) worksheet columns |
| `GWD1-SOFTW-46`–`54`, `GWD1-SDD-5` | Deduplicated read-only audit records, separate `/audit-trail` view, seven-day paging, 12-month retention, and return control |
| `GWD1-SOFTW-55`–`63` | Mandatory deployment controls documented in `docs/SECURITY-OPERATIONS.md` |
| `GWD1-SOFTW-64`–`72` | React Server DOM 19.2.8, exact dependency pins, lockfile verification, advisory build gate, weekly review workflow, empty approved server-function inventory, and operational remediation policy |
| `GWD1-SDD-1` | Main client screen, summary cards, day navigation, chart, recent lists, and accessible entry dialogs driven by typed client state |

No application capability outside these artifacts is intentionally included.
