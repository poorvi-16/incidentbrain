## Detection
Monitor payments-service for signals tied to db_saturation. Specifically validate: No alert on RDS query latency p99 or connection pool saturation.

## Immediate Response
1. Confirm the failing symptom in dashboards, logs, and recent deploy or infrastructure changes.
2. Reduce blast radius by shifting traffic, rolling back risky changes, or enabling degraded mode.
3. Escalate to the owning service team and verify user-facing impact is stabilizing.

## Root Cause Investigation
Inspect recent changes to payments-service, checkout-api and confirm whether db_saturation aligns with the first failing metric, query path, or dependency.

## Prevention
Implement a alert_rule fix for payments-service, add explicit detection for the missed signal, and update service ownership expectations so recurrence is less likely within the next 14 days.