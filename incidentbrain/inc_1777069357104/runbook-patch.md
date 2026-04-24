## Detection
Monitor edge-api for signals tied to config_drift. Specifically validate: No config drift validation or protected deployment guard.

## Immediate Response
1. Confirm the failing symptom in dashboards, logs, and recent deploy or infrastructure changes.
2. Reduce blast radius by shifting traffic, rolling back risky changes, or enabling degraded mode.
3. Escalate to the owning service team and verify user-facing impact is stabilizing.

## Root Cause Investigation
Inspect recent changes to edge-api, traffic-router and confirm whether config_drift aligns with the first failing metric, query path, or dependency.

## Prevention
Implement a terraform_guard fix for edge-api, add explicit detection for the missed signal, and update service ownership expectations so recurrence is less likely within the next 20 days.