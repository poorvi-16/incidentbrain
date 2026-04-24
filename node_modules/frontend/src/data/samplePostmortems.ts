export const samplePostmortems = [
  {
    id: "payments-db",
    title: "Payments Service Outage",
    description: "Database saturation after a migration removed a critical index.",
    text: `Title: Payments Service Outage — 2024-11-14

Duration: 2h 14m
Severity: P1
Affected: checkout flow, 34% of users

Timeline:
14:03 — Spike in checkout errors detected by customer reports
14:11 — On-call engineer paged via PagerDuty
14:19 — RDS CPU identified at 99%, connection pool exhausted
14:34 — Read replica promoted, traffic shifted
15:47 — Root cause identified: missing index on orders table after migration
16:17 — Full recovery confirmed

Root Cause:
A database migration deployed at 13:45 removed a composite index on the orders table. Query times for checkout increased 40x under normal load. No alert existed for RDS query latency p99. The runbook had no step for database performance degradation.`
  },
  {
    id: "memory-worker",
    title: "Notifications Worker Memory Leak",
    description: "A dependency update caused steady memory growth and restart storms.",
    text: `Title: Notifications Delay Incident — 2025-01-18

Duration: 47m
Severity: P2
Affected: outbound notifications

Timeline:
09:02 — Queue lag began rising
09:11 — Worker restarts observed
09:19 — Memory usage reached critical threshold
09:31 — Rollback initiated
09:49 — Delivery recovered

Root Cause:
A third-party SDK update introduced a memory leak in the notifications worker. No alert existed for sustained memory growth before OOM conditions.`
  },
  {
    id: "config-drift",
    title: "Edge API Config Drift",
    description: "A stale routing config caused 502s across the edge layer.",
    text: `Title: Edge API Instability — 2025-02-07

Duration: 1h 05m
Severity: P1
Affected: public API traffic

Timeline:
17:05 — Elevated 502s detected
17:16 — On-call investigated routing behavior
17:24 — Stale config revision discovered
17:41 — Config reverted
18:10 — Error rate normalized

Root Cause:
A stale feature flag configuration restored deprecated routing behavior. No config drift guard or protected deployment check prevented the change.`
  }
];
