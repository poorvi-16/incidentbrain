import { randomUUID } from "crypto";
import { db } from "../db/database";

type BlastRadius = "low" | "medium" | "high" | "critical";
type FixCategory = "alert_rule" | "runbook" | "terraform_guard" | "architecture";

type FailureDnaRecord = {
  incident_id: string;
  title: string;
  trigger: string;
  detection_gap: string;
  blast_radius: BlastRadius;
  fix_category: FixCategory;
  affected_services: string;
  summary: string;
  recurrence_days: number;
};

function toAlertSeverity(blastRadius: BlastRadius) {
  if (blastRadius === "critical") return "critical";
  if (blastRadius === "high") return "warning";
  return "warning";
}

function buildAlertName(title: string) {
  return title
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function inferPromQl(trigger: string, primaryService: string) {
  if (trigger === "db_saturation") {
    return `histogram_quantile(0.99, sum(rate(db_query_duration_seconds_bucket{service="${primaryService}"}[5m])) by (le)) > 0.5`;
  }

  if (trigger === "memory_leak") {
    return `increase(container_memory_working_set_bytes{pod=~"${primaryService}.*"}[20m]) > 250000000`;
  }

  if (trigger === "config_drift") {
    return `sum(rate(http_requests_total{service="${primaryService}",status=~"5.."}[5m])) / sum(rate(http_requests_total{service="${primaryService}"}[5m])) > 0.03`;
  }

  if (trigger === "cache_stampede") {
    return `sum(rate(cache_miss_total{service="${primaryService}"}[5m])) > 800`;
  }

  if (trigger === "deploy_regression") {
    return `sum(rate(http_requests_total{service="${primaryService}",status=~"5.."}[5m])) / sum(rate(http_requests_total{service="${primaryService}"}[5m])) > 0.05`;
  }

  return `sum(rate(http_requests_total{service="${primaryService}",status=~"5.."}[5m])) > 10`;
}

function inferTerraformGuard(
  trigger: string,
  primaryService: string,
  detectionGap: string
) {
  const serviceKey = primaryService.replace(/-/g, "_");

  if (trigger === "db_saturation") {
    return `locals {
  minimum_${serviceKey}_db_class = "db.r6g.large"
}

resource "aws_db_instance" "${serviceKey}" {
  identifier = "${primaryService}-primary"

  lifecycle {
    precondition {
      condition     = contains(["db.r6g.large", "db.r6g.xlarge", "db.r6g.2xlarge"], var.${serviceKey}_db_instance_class)
      error_message = "${primaryService} must use an instance class that can sustain expected production query load."
    }
  }
}`;
  }

  if (trigger === "config_drift") {
    return `locals {
  required_${serviceKey}_controls = ["drift-detection", "protected-config-review"]
}

resource "null_resource" "${serviceKey}_config_guard" {
  lifecycle {
    precondition {
      condition     = alltrue([for control in local.required_${serviceKey}_controls : contains(var.enabled_controls, control)])
      error_message = "${primaryService} requires drift detection and protected config review controls before release."
    }
  }
}`;
  }

  if (trigger === "memory_leak") {
    return `locals {
  minimum_${serviceKey}_memory_limit_mb = 768
}

resource "kubernetes_deployment" "${serviceKey}" {
  metadata {
    name = "${primaryService}"
  }

  lifecycle {
    precondition {
      condition     = var.${serviceKey}_memory_limit_mb >= local.minimum_${serviceKey}_memory_limit_mb
      error_message = "${primaryService} must set a memory limit of at least 768MB."
    }
  }
}`;
  }

  if (trigger === "cache_stampede") {
    return `locals {
  require_request_coalescing = true
}

resource "null_resource" "${serviceKey}_cache_guard" {
  lifecycle {
    precondition {
      condition     = var.enable_request_coalescing == local.require_request_coalescing
      error_message = "${primaryService} must enable request coalescing before high-traffic cache invalidations."
    }
  }
}`;
  }

  return `locals {
  required_${serviceKey}_synthetics = ["critical-user-flow"]
}

resource "null_resource" "${serviceKey}_release_guard" {
  lifecycle {
    precondition {
      condition     = alltrue([for check in local.required_${serviceKey}_synthetics : contains(var.enabled_synthetic_checks, check)])
      error_message = "${primaryService} requires synthetic validation before rollout."
    }
  }
}`;
}

function generateArtifactsFromDna(dna: FailureDnaRecord) {
  const services = JSON.parse(dna.affected_services) as string[];
  const primaryService = services[0] ?? "platform-core";
  const alertName = buildAlertName(dna.title);
  const severity = toAlertSeverity(dna.blast_radius);
  const expr = inferPromQl(dna.trigger, primaryService);
  const runbookUrl = `https://runbooks.internal/${primaryService}/${dna.trigger}`;

  const alert_yaml = `groups:
  - name: ${primaryService}-${dna.trigger}
    rules:
      - alert: ${alertName}
        expr: ${expr}
        for: 10m
        labels:
          severity: ${severity}
        annotations:
          summary: ${dna.title}
          description: ${dna.detection_gap}
          runbook_url: ${runbookUrl}`;

  const runbook_md = `## Detection
Monitor ${primaryService} for signals tied to ${dna.trigger}. Specifically validate: ${dna.detection_gap}.

## Immediate Response
1. Confirm the failing symptom in dashboards, logs, and recent deploy or infrastructure changes.
2. Reduce blast radius by shifting traffic, rolling back risky changes, or enabling degraded mode.
3. Escalate to the owning service team and verify user-facing impact is stabilizing.

## Root Cause Investigation
Inspect recent changes to ${services.join(", ")} and confirm whether ${dna.trigger} aligns with the first failing metric, query path, or dependency.

## Prevention
Implement a ${dna.fix_category} fix for ${primaryService}, add explicit detection for the missed signal, and update service ownership expectations so recurrence is less likely within the next ${dna.recurrence_days} days.`;

  const terraform_tf = inferTerraformGuard(
    dna.trigger,
    primaryService,
    dna.detection_gap
  );

  return {
    alert_yaml,
    runbook_md,
    terraform_tf
  };
}

export function getArtifactsForIncident(incidentId: string) {
  const existing = db
    .prepare(
      `
      SELECT incident_id, alert_yaml, runbook_md, terraform_tf
      FROM artifacts
      WHERE incident_id = ?
      `
    )
    .get(incidentId) as
    | {
        incident_id: string;
        alert_yaml: string;
        runbook_md: string;
        terraform_tf: string;
      }
    | undefined;

  if (existing) {
    return {
      alert_yaml: existing.alert_yaml,
      runbook_md: existing.runbook_md,
      terraform_tf: existing.terraform_tf
    };
  }

  return null;
}

export function generateAndStoreArtifacts(incidentId: string) {
  const existing = getArtifactsForIncident(incidentId);

  if (existing) {
    return existing;
  }

  const dna = db
    .prepare(
      `
      SELECT
        incident_id,
        title,
        trigger,
        detection_gap,
        blast_radius,
        fix_category,
        affected_services,
        summary,
        recurrence_days
      FROM failure_dna
      WHERE incident_id = ?
      `
    )
    .get(incidentId) as FailureDnaRecord | undefined;

  if (!dna) {
    return null;
  }

  const artifacts = generateArtifactsFromDna(dna);

  db.prepare(
    `
    INSERT INTO artifacts (
      id,
      incident_id,
      alert_yaml,
      runbook_md,
      terraform_tf,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    randomUUID(),
    incidentId,
    artifacts.alert_yaml,
    artifacts.runbook_md,
    artifacts.terraform_tf,
    new Date().toISOString()
  );

  return artifacts;
}
