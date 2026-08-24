# Glucose Watchdog

Glucose Watchdog is a specification-driven web application for recording and visualizing blood glucose readings and Basal/Bolus insulin deliveries. The implementation is scoped to Jama Project 69 (`GWD1`).

## Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm test
npm run lint
npm run build
npm run verify:dependencies
```

The Excel importer reads the first worksheet of an `.xlsx` file. Its header row must contain `Date`, `Time`, and `Glucose (mg/dL)` columns.

See [docs/TRACEABILITY.md](docs/TRACEABILITY.md) for requirements coverage and [docs/SECURITY-OPERATIONS.md](docs/SECURITY-OPERATIONS.md) for deployment controls.
