## Detection
Monitor p99 query latency, DB CPU, and connection pool saturation for payments-service.

## Immediate Response
1. Confirm elevated query latency in dashboards and correlate with recent migrations.
2. Shift read-heavy traffic to a replica or enable degraded checkout mode.
3. Roll back the migration or restore the missing index if safe.

## Root Cause Investigation
Check query plans for the orders table and validate whether a missing composite index changed execution paths.

## Prevention
Require query-plan validation in CI and alert on query latency p99 above 500ms.