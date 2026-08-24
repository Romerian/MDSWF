# Security and deployment controls

The following controls are mandatory deployment conditions derived from `GWD1-SOFTW-55` through `GWD1-SOFTW-72`. They are intentionally not simulated as end-user application features.

## Administrative access

- Require multifactor authentication before every administrative or deployment function is granted.
- Give administrative and deployment identities only permissions required for their assigned roles.
- Accept administrative-interface connections only from approved management-network endpoints.
- Record administrative authentication attempts and privilege changes with event time, initiating identity when available, and outcome.
- Alert within five minutes after repeated failed administrative authentication.

## Data protection and recovery

- Place the application runtime and data store in separate security zones. Do not permit direct inbound access from an untrusted network to the data store.
- Create an offline, immutable backup of application data and audit records at least every 24 hours.
- Complete and document a restoration test at least every three months.
- Record backup failures and anomalous bulk-data activity. Alert within five minutes after anomalous bulk modification is detected.

## Dependency and server-function policy

- `package.json` and `package-lock.json` pin every production dependency to an exact resolved version.
- CI runs `npm ci`, validates the deployable dependency tree against the lockfile, and fails on any production dependency advisory reported by npm.
- The CI schedule runs weekly to review current vendor advisories. The deployment owner must additionally compare applicable CVEs against the current CISA Known Exploited Vulnerabilities catalog and remediate no later than the catalog due date.
- The application defines no React Server Function or API endpoints. The approved exposed server-function inventory is therefore empty. Any future endpoint requires documented approval, argument type/size/format validation, authorization-context validation, and monitoring before deployment.

## Incident response

For a ransomware or server-compromise event:

1. Contain: isolate affected runtime and data zones, revoke affected identities, and preserve immutable backups.
2. Preserve evidence: retain relevant application, identity-provider, deployment, network, and security-event logs without alteration.
3. Notify: follow the organization’s security escalation and regulatory notification process.
4. Recover: rebuild from approved artifacts, restore from a verified immutable backup, rotate credentials, and validate data and audit-record integrity.
5. Document: record the incident timeline, decisions, recovery evidence, and follow-up actions.

Deployment approval must include evidence for every control above. The repository cannot itself configure identity-provider MFA, network segmentation, immutable storage, or external alert routing.
