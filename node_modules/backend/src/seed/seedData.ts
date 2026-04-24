export const seededIncidents = [
  {
    id: "inc_1001",
    source_text:
      "Checkout latency spiked after an index was removed from the orders table during a schema migration. No alert existed for query latency p99 and the on-call team relied on customer reports.",
    status: "open",
    pr_status: "unresolved",
    pr_url: null,
    created_at: "2026-03-20T14:10:00.000Z",
    resolved_at: null,
    dna: {
      title: "Payments latency after dropped DB index",
      trigger: "db_saturation",
      detection_gap: "No alert on query latency p99 or connection pool pressure",
      blast_radius: "critical",
      fix_category: "alert_rule",
      affected_services: ["payments-service", "checkout-api"],
      summary:
        "A migration removed a critical index and caused database latency to spike under ordinary traffic. The team detected the outage late because query latency alerts were missing.",
      recurrence_days: 12
    },
    artifacts: {
      alert_yaml: `groups:
  - name: payments-db-latency
    rules:
      - alert: PaymentsQueryLatencyP99High
        expr: histogram_quantile(0.99, sum(rate(db_query_duration_seconds_bucket{service="payments-service"}[5m])) by (le)) > 0.5
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: Payments query latency p99 is elevated
          description: Checkout queries are exceeding 500ms at p99 for 10 minutes.
          runbook_url: https://runbooks.internal/payments/db-latency`,
      runbook_md: `## Detection
Monitor p99 query latency, DB CPU, and connection pool saturation for payments-service.

## Immediate Response
1. Confirm elevated query latency in dashboards and correlate with recent migrations.
2. Shift read-heavy traffic to a replica or enable degraded checkout mode.
3. Roll back the migration or restore the missing index if safe.

## Root Cause Investigation
Check query plans for the orders table and validate whether a missing composite index changed execution paths.

## Prevention
Require query-plan validation in CI and alert on query latency p99 above 500ms.`,
      terraform_tf: `locals {
  minimum_payments_db_instance_class = "db.r6g.large"
}

resource "aws_db_instance" "payments" {
  identifier = "payments-primary"

  lifecycle {
    precondition {
      condition     = contains(["db.r6g.large", "db.r6g.xlarge", "db.r6g.2xlarge"], var.payments_db_instance_class)
      error_message = "payments DB instance class must meet minimum sizing requirements."
    }
  }
}`
    }
  },
  {
    id: "inc_1002",
    source_text:
      "A stale feature flag configuration re-enabled deprecated traffic routing and caused intermittent 502s across the edge API.",
    status: "resolved",
    pr_status: "merged",
    pr_url: "https://github.com/example/platform/pull/142",
    created_at: "2026-03-13T09:00:00.000Z",
    resolved_at: "2026-03-15T16:00:00.000Z",
    dna: {
      title: "Edge API 502s from config drift",
      trigger: "config_drift",
      detection_gap: "No config drift alert or deployment diff validation",
      blast_radius: "high",
      fix_category: "terraform_guard",
      affected_services: ["edge-api", "traffic-router"],
      summary:
        "A deprecated route config was unintentionally restored and sent traffic to an unsupported backend path. Missing drift detection allowed the issue to persist until user errors accumulated.",
      recurrence_days: 28
    },
    artifacts: {
      alert_yaml: `groups:
  - name: edge-config-drift
    rules:
      - alert: EdgeApi502RateHigh
        expr: sum(rate(http_requests_total{service="edge-api",status=~"5.."}[5m])) / sum(rate(http_requests_total{service="edge-api"}[5m])) > 0.03
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: Edge API 5xx ratio elevated
          description: 5xx responses exceed 3% for edge-api, investigate recent config drift.
          runbook_url: https://runbooks.internal/edge/config-drift`,
      runbook_md: `## Detection
Validate config checksum drift after each deploy and monitor 5xx ratio by route.

## Immediate Response
1. Freeze configuration rollouts and compare live config with the approved revision.
2. Revert the stale flag or route policy to the last known good state.
3. Confirm 5xx recovery before reopening traffic changes.

## Root Cause Investigation
Review config history and identify the source of the stale restore event.

## Prevention
Enforce Terraform preconditions and diff checks for protected routing configuration.`,
      terraform_tf: `locals {
  protected_routes = ["checkout", "payments", "login"]
}

resource "aws_ssm_parameter" "edge_routing_config" {
  name  = "/platform/edge/routing"
  type  = "String"
  value = var.edge_routing_config_json

  lifecycle {
    precondition {
      condition     = alltrue([for route in local.protected_routes : contains(var.approved_routes, route)])
      error_message = "Protected routes must exist in the approved routing configuration."
    }
  }
}`
    }
  },
  {
    id: "inc_1003",
    source_text:
      "The notifications worker leaked memory after a third-party SDK update and restarted repeatedly, delaying outbound messages for 47 minutes.",
    status: "open",
    pr_status: "open",
    pr_url: "https://github.com/example/platform/pull/188",
    created_at: "2026-03-30T18:30:00.000Z",
    resolved_at: null,
    dna: {
      title: "Notification worker memory leak",
      trigger: "memory_leak",
      detection_gap: "No resident memory growth alert on worker pods",
      blast_radius: "medium",
      fix_category: "alert_rule",
      affected_services: ["notifications-worker"],
      summary:
        "A dependency upgrade caused steady memory growth in the notifications worker until pods were OOM-killed. Message delivery lag accumulated because there was no memory growth alert.",
      recurrence_days: 9
    },
    artifacts: {
      alert_yaml: `groups:
  - name: notifications-memory
    rules:
      - alert: NotificationsWorkerMemoryGrowth
        expr: increase(container_memory_working_set_bytes{pod=~"notifications-worker.*"}[20m]) > 250000000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Notifications worker memory growth detected
          description: Worker memory usage increased by more than 250MB within 20 minutes.
          runbook_url: https://runbooks.internal/notifications/memory`,
      runbook_md: `## Detection
Track pod memory working set and restart count for the notifications worker deployment.

## Immediate Response
1. Pause the latest rollout and identify whether a dependency update preceded the spike.
2. Scale out workers to reduce queue lag while limiting concurrency.
3. Roll back the worker image if memory continues to rise.

## Root Cause Investigation
Capture heap snapshots or compare dependency versions introduced in the last release.

## Prevention
Add canary memory burn-in checks before promoting notification worker releases.`,
      terraform_tf: `locals {
  notifications_memory_limit_mb = 768
}

resource "kubernetes_deployment" "notifications_worker" {
  metadata {
    name = "notifications-worker"
  }

  lifecycle {
    precondition {
      condition     = var.notifications_memory_limit_mb >= local.notifications_memory_limit_mb
      error_message = "Notifications worker memory limit must be at least 768MB."
    }
  }
}`
    }
  },
  {
    id: "inc_1004",
    source_text:
      "A deploy introduced a serialization regression in the session service that caused login failures for mobile clients only.",
    status: "resolved",
    pr_status: "merged",
    pr_url: "https://github.com/example/platform/pull/175",
    created_at: "2026-04-02T11:15:00.000Z",
    resolved_at: "2026-04-03T10:45:00.000Z",
    dna: {
      title: "Mobile login failures after session deploy",
      trigger: "deploy_regression",
      detection_gap: "No synthetic mobile login check post-deploy",
      blast_radius: "high",
      fix_category: "runbook",
      affected_services: ["session-service", "mobile-auth-gateway"],
      summary:
        "A release changed response serialization and broke mobile session validation. The team lacked a synthetic mobile login check and discovered the problem through support tickets.",
      recurrence_days: 21
    },
    artifacts: {
      alert_yaml: `groups:
  - name: mobile-login-regression
    rules:
      - alert: MobileLoginFailureRateHigh
        expr: sum(rate(login_failures_total{client="mobile"}[5m])) / sum(rate(login_attempts_total{client="mobile"}[5m])) > 0.05
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: Mobile login failures elevated
          description: Mobile login failure ratio exceeds 5% after a session-service deploy.
          runbook_url: https://runbooks.internal/auth/mobile-login`,
      runbook_md: `## Detection
Run a synthetic mobile login probe after every session-service deployment and alert on failure ratio.

## Immediate Response
1. Compare deploy versions for session-service and inspect response serialization changes.
2. Roll back the latest release or route mobile clients to the previous stable build.
3. Verify login recovery with real synthetic probes before closing the incident.

## Root Cause Investigation
Diff the auth response contract and confirm whether mobile clients reject the new payload.

## Prevention
Add post-deploy synthetic login validation for mobile-specific auth flows.`,
      terraform_tf: `locals {
  required_synthetic_checks = ["mobile-login", "session-refresh"]
}

resource "null_resource" "auth_release_guard" {
  lifecycle {
    precondition {
      condition     = alltrue([for check in local.required_synthetic_checks : contains(var.enabled_synthetic_checks, check)])
      error_message = "Required synthetic auth checks must be enabled before release."
    }
  }
}`
    }
  },
  {
    id: "inc_1005",
    source_text:
      "A cache stampede overwhelmed product detail rendering after a popular product launch invalidated millions of keys at once.",
    status: "open",
    pr_status: "unresolved",
    pr_url: null,
    created_at: "2026-04-10T07:40:00.000Z",
    resolved_at: null,
    dna: {
      title: "Catalog cache stampede during launch",
      trigger: "cache_stampede",
      detection_gap: "No alert on cache miss storm or render fallback saturation",
      blast_radius: "critical",
      fix_category: "architecture",
      affected_services: ["catalog-api", "product-renderer", "redis-cache"],
      summary:
        "A large-scale invalidation caused request amplification and overwhelmed downstream renderers. The platform lacked protections for coordinated cache refill behavior during launch spikes.",
      recurrence_days: 6
    },
    artifacts: {
      alert_yaml: `groups:
  - name: catalog-cache-stampede
    rules:
      - alert: CatalogCacheMissStorm
        expr: sum(rate(cache_miss_total{service="catalog-api"}[5m])) > 800
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Catalog cache miss storm detected
          description: Cache misses exceed safe refill thresholds and may trigger render saturation.
          runbook_url: https://runbooks.internal/catalog/cache-stampede`,
      runbook_md: `## Detection
Monitor cache miss volume, render queue depth, and fallback latency during launches.

## Immediate Response
1. Enable request coalescing or stale-while-revalidate mode for affected catalog keys.
2. Throttle invalidation fan-out and shift traffic to cached fallback responses.
3. Scale renderer capacity while cache warm-up stabilizes.

## Root Cause Investigation
Trace the invalidation event and inspect whether key refill behavior lacked backpressure.

## Prevention
Adopt staggered invalidation, request coalescing, and warm-cache workflows for launch events.`,
      terraform_tf: `locals {
  cache_refill_guard_enabled = true
}

resource "null_resource" "catalog_cache_guard" {
  lifecycle {
    precondition {
      condition     = var.enable_request_coalescing == local.cache_refill_guard_enabled
      error_message = "Catalog launches must enable request coalescing to avoid cache stampedes."
    }
  }
}`
    }
  }
] as const;
