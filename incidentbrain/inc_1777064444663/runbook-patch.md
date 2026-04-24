## Detection
Monitor catalog-api for signals tied to cache_stampede. Specifically validate: No alert on cache miss storm or fallback saturation.

## Immediate Response
1. Confirm the failing symptom in dashboards, logs, and recent deploy or infrastructure changes.
2. Reduce blast radius by shifting traffic, rolling back risky changes, or enabling degraded mode.
3. Escalate to the owning service team and verify user-facing impact is stabilizing.

## Root Cause Investigation
Inspect recent changes to catalog-api, redis-cache and confirm whether cache_stampede aligns with the first failing metric, query path, or dependency.

## Prevention
Implement a architecture fix for catalog-api, add explicit detection for the missed signal, and update service ownership expectations so recurrence is less likely within the next 7 days.