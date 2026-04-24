import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db/database";
import { calculateDebtScore } from "../services/debtService";

const router = Router();

type BlastRadius = "low" | "medium" | "high" | "critical";
type FixCategory = "alert_rule" | "runbook" | "terraform_guard" | "architecture";

function inferFailureDna(text: string) {
  const lower = text.toLowerCase();

  let trigger = "config_drift";
  let blastRadius: BlastRadius = "medium";
  let fixCategory: FixCategory = "runbook";
  let title = "Operational incident detected";
  let detectionGap = "Missing targeted alert or operational validation";
  let affectedServices = ["platform-core"];
  let summary =
    "The incident exposed an operational gap that increased user impact and slowed detection. The post-mortem suggests missing safeguards in alerting, runbooks, or infrastructure policy.";
  let recurrenceDays = 21;

  if (lower.includes("index") || lower.includes("query latency") || lower.includes("rds")) {
    trigger = "db_saturation";
    blastRadius = "critical";
    fixCategory = "alert_rule";
    title = "Database performance degradation after migration";
    detectionGap = "No alert on RDS query latency p99 or connection pool saturation";
    affectedServices = ["payments-service", "checkout-api"];
    summary =
      "A database change degraded query performance and overwhelmed the checkout flow. Missing latency alerting delayed response until users experienced visible failures.";
    recurrenceDays = 14;
  } else if (lower.includes("memory") || lower.includes("oom") || lower.includes("leak")) {
    trigger = "memory_leak";
    blastRadius = "high";
    fixCategory = "alert_rule";
    title = "Memory leak causing service instability";
    detectionGap = "No memory growth alert on worker or service containers";
    affectedServices = ["notifications-worker"];
    summary =
      "The incident was caused by sustained memory growth that eventually destabilized the service. Earlier memory growth detection would have reduced the blast radius significantly.";
    recurrenceDays = 10;
  } else if (lower.includes("terraform") || lower.includes("drift") || lower.includes("config")) {
    trigger = "config_drift";
    blastRadius = "high";
    fixCategory = "terraform_guard";
    title = "Configuration drift caused production instability";
    detectionGap = "No config drift validation or protected deployment guard";
    affectedServices = ["edge-api", "traffic-router"];
    summary =
      "Unexpected configuration state introduced production instability and error responses. The issue could have been prevented with stronger infrastructure guardrails.";
    recurrenceDays = 20;
  } else if (lower.includes("cache")) {
    trigger = "cache_stampede";
    blastRadius = "critical";
    fixCategory = "architecture";
    title = "Cache stampede during traffic spike";
    detectionGap = "No alert on cache miss storm or fallback saturation";
    affectedServices = ["catalog-api", "redis-cache"];
    summary =
      "A coordinated cache invalidation or miss storm amplified load across dependent systems. The incident points to an architectural gap rather than a single missing alert.";
    recurrenceDays = 7;
  } else if (lower.includes("deploy") || lower.includes("release") || lower.includes("rollback")) {
    trigger = "deploy_regression";
    blastRadius = "high";
    fixCategory = "runbook";
    title = "Release regression impacted production traffic";
    detectionGap = "No post-deploy synthetic validation for critical user flows";
    affectedServices = ["session-service", "api-gateway"];
    summary =
      "A deployment introduced a regression that affected production traffic after release. Better deploy verification and response guidance would have reduced time to recovery.";
    recurrenceDays = 18;
  }

  return {
    title,
    trigger,
    detection_gap: detectionGap,
    blast_radius: blastRadius,
    fix_category: fixCategory,
    affected_services: affectedServices,
    summary,
    recurrence_days: recurrenceDays
  };
}

function findMatches(trigger: string, fixCategory: string, incidentId: string) {
  const rows = db
    .prepare(
      `
      SELECT
        incidents.id,
        incidents.created_at,
        incidents.pr_status,
        failure_dna.title,
        failure_dna.summary,
        failure_dna.trigger,
        failure_dna.fix_category
      FROM incidents
      JOIN failure_dna ON failure_dna.incident_id = incidents.id
      WHERE incidents.id != ?
      `
    )
    .all(incidentId) as Array<{
    id: string;
    created_at: string;
    pr_status: "unresolved" | "open" | "merged";
    title: string;
    summary: string;
    trigger: string;
    fix_category: string;
  }>;

  return rows
    .map((row) => {
      let similarity = 35;

      if (row.trigger === trigger) similarity += 40;
      if (row.fix_category === fixCategory) similarity += 25;

      return {
        incident_id: row.id,
        title: row.title,
        created_at: row.created_at,
        similarity: Math.min(similarity, 100),
        fix_status: row.pr_status,
        summary: row.summary
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

router.post("/", (req, res) => {
  const text = String(req.body?.text ?? "").trim();

  if (!text) {
    return res.status(400).json({ error: "Post-mortem text is required" });
  }

  const incidentId = `inc_${Date.now()}`;
  const createdAt = new Date().toISOString();
  const dna = inferFailureDna(text);

  db.prepare(
    `
    INSERT INTO incidents (id, source_text, status, pr_url, pr_status, created_at, resolved_at)
    VALUES (?, ?, 'open', NULL, 'unresolved', ?, NULL)
    `
  ).run(incidentId, text, createdAt);

  db.prepare(
    `
    INSERT INTO failure_dna (
      id, incident_id, title, trigger, detection_gap, blast_radius,
      fix_category, affected_services, summary, recurrence_days, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    randomUUID(),
    incidentId,
    dna.title,
    dna.trigger,
    dna.detection_gap,
    dna.blast_radius,
    dna.fix_category,
    JSON.stringify(dna.affected_services),
    dna.summary,
    dna.recurrence_days,
    createdAt
  );

  for (const serviceName of dna.affected_services) {
    db.prepare(
      `
      INSERT INTO debt_scores (id, service_name, incident_id, score, resolved, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
      `
    ).run(
      randomUUID(),
      serviceName,
      incidentId,
      calculateDebtScore(1, dna.recurrence_days, dna.blast_radius),
      createdAt
    );
  }

  const matches = findMatches(dna.trigger, dna.fix_category, incidentId);

  return res.json({
    incident_id: incidentId,
    dna,
    matches
  });
});

export default router;
