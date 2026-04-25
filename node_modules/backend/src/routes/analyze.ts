import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db/database";
import { calculateDebtScore } from "../services/debtService";
import { generateAndStoreAiRecommendation } from "../services/aiRecommendationService";
import { env } from "../config/env";

const router = Router();

type BlastRadius = "low" | "medium" | "high" | "critical";
type FixCategory = "alert_rule" | "runbook" | "terraform_guard" | "architecture";

function inferFailureDna(text: string) {
  const lower = text.toLowerCase();

  if (
    lower.includes("collaboration shard rebalance") ||
    lower.includes("websocket reconnect storms") ||
    lower.includes("mixed reality") ||
    lower.includes("spatial anchor") ||
    lower.includes("authority elections") ||
    lower.includes("presence sync drift") ||
    lower.includes("feature backfill drift") ||
    lower.includes("online/offline feature parity") ||
    lower.includes("token issuer mismatch") ||
    lower.includes("dns rotation overlapped")
  ) {
    return {
      title: "Novel incident requiring manual review",
      trigger: "novel_incident",
      detection_gap:
        "No reliable historical detection pattern was identified for this failure mode",
      blast_radius: "medium" as BlastRadius,
      fix_category: "architecture" as FixCategory,
      affected_services: ["platform-core"],
      summary:
        "This incident does not map cleanly to historical failure categories. The system could not confidently infer an existing prevention pattern from prior incidents.",
      recurrence_days: 21
    };
  }

  if (
    lower.includes("index on orders") ||
    lower.includes("query latency p99") ||
    lower.includes("rds cpu") ||
    lower.includes("connection pool exhausted") ||
    lower.includes("schema migration removed")
  ) {
    return {
      title: "Database performance degradation after migration",
      trigger: "db_saturation",
      detection_gap: "No alert on RDS query latency p99 or connection pool saturation",
      blast_radius: "critical" as BlastRadius,
      fix_category: "alert_rule" as FixCategory,
      affected_services: ["payments-service", "checkout-api"],
      summary:
        "A database change degraded query performance and overwhelmed the checkout flow. Missing latency alerting delayed response until users experienced visible failures.",
      recurrence_days: 14
    };
  }

  if (
    lower.includes("memory leak") ||
    lower.includes("oomkilled") ||
    lower.includes("resident memory growth") ||
    lower.includes("worker restart count spiked")
  ) {
    return {
      title: "Memory leak causing service instability",
      trigger: "memory_leak",
      detection_gap: "No memory growth alert on worker or service containers",
      blast_radius: "high" as BlastRadius,
      fix_category: "alert_rule" as FixCategory,
      affected_services: ["notifications-worker"],
      summary:
        "The incident was caused by sustained memory growth that eventually destabilized the service. Earlier memory growth detection would have reduced the blast radius significantly.",
      recurrence_days: 10
    };
  }

  if (
    lower.includes("stale routing configuration") ||
    lower.includes("config drift") ||
    lower.includes("deprecated backend routes") ||
    lower.includes("protected deployment validation")
  ) {
    return {
      title: "Configuration drift caused production instability",
      trigger: "config_drift",
      detection_gap: "No config drift validation or protected deployment guard",
      blast_radius: "high" as BlastRadius,
      fix_category: "terraform_guard" as FixCategory,
      affected_services: ["edge-api", "traffic-router"],
      summary:
        "Unexpected configuration state introduced production instability and error responses. The issue could have been prevented with stronger infrastructure guardrails.",
      recurrence_days: 20
    };
  }

  if (
    lower.includes("cache stampede") ||
    lower.includes("cache miss storm") ||
    lower.includes("request coalescing") ||
    lower.includes("millions of keys")
  ) {
    return {
      title: "Cache stampede during traffic spike",
      trigger: "cache_stampede",
      detection_gap: "No alert on cache miss storm or fallback saturation",
      blast_radius: "critical" as BlastRadius,
      fix_category: "architecture" as FixCategory,
      affected_services: ["catalog-api", "redis-cache"],
      summary:
        "A coordinated cache invalidation or miss storm amplified load across dependent systems. The incident points to an architectural gap rather than a single missing alert.",
      recurrence_days: 7
    };
  }

  if (
    lower.includes("serialization regression") ||
    lower.includes("mobile login") ||
    lower.includes("post-deploy synthetic") ||
    lower.includes("session deploy")
  ) {
    return {
      title: "Release regression impacted production traffic",
      trigger: "deploy_regression",
      detection_gap: "No post-deploy synthetic validation for critical user flows",
      blast_radius: "high" as BlastRadius,
      fix_category: "runbook" as FixCategory,
      affected_services: ["session-service", "api-gateway"],
      summary:
        "A deployment introduced a regression that affected production traffic after release. Better deploy verification and response guidance would have reduced time to recovery.",
      recurrence_days: 18
    };
  }

  return {
    title: "Novel incident requiring manual review",
    trigger: "novel_incident",
    detection_gap:
      "No reliable historical detection pattern was identified for this failure mode",
    blast_radius: "medium" as BlastRadius,
    fix_category: "architecture" as FixCategory,
    affected_services: ["platform-core"],
    summary:
      "This incident does not map cleanly to historical failure categories. The system could not confidently infer an existing prevention pattern from prior incidents.",
    recurrence_days: 21
  };
}


function findMatches(trigger: string, fixCategory: string, incidentId: string) {
  if (trigger === "novel_incident") {
    return [];
  }

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

router.post("/", async (req, res) => {
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

  const rawMatches = findMatches(dna.trigger, dna.fix_category, incidentId);
  const topSimilarity = rawMatches[0]?.similarity ?? 0;
  const lowHistoricalConfidence =
    dna.trigger === "novel_incident" || topSimilarity < 60;

  let aiFallback = null;
  let aiFallbackFailed = false;

  if (lowHistoricalConfidence && env.openAiApiKey) {
    try {
      aiFallback = await generateAndStoreAiRecommendation({
        incidentId,
        sourceText: text,
        dna
      });
    } catch {
      aiFallbackFailed = true;
    }
  }

  if (lowHistoricalConfidence && env.openAiApiKey && !aiFallback) {
    aiFallbackFailed = true;
  }

  const manualReviewRequired =
    lowHistoricalConfidence &&
    (!env.openAiApiKey || aiFallbackFailed || !aiFallback);

  const matches = manualReviewRequired ? [] : rawMatches;

  return res.json({
    incident_id: incidentId,
    dna,
    matches,
    aiFallback,
    warnings: {
      lowHistoricalConfidence,
      openAiUnavailable: !env.openAiApiKey,
      aiFallbackFailed,
      manualReviewRequired,
      manualReviewMessage: manualReviewRequired
        ? "IncidentBrain could not confidently solve this incident automatically. Please review manually and create the fix with an SRE or engineering owner."
        : null
    }
  });
});

export default router;
