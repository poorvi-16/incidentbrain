import { db } from "../db/database";
import { getAiRecommendationForIncident } from "./aiRecommendationService";

type BlastRadius = "low" | "medium" | "high" | "critical";
type FixCategory = "alert_rule" | "runbook" | "terraform_guard" | "architecture";
type PRStatus = "unresolved" | "open" | "merged";

type IncidentRow = {
  id: string;
  source_text: string;
  status: string;
  pr_url: string | null;
  pr_status: PRStatus;
  created_at: string;
  resolved_at: string | null;
};

type FailureDnaRow = {
  incident_id: string;
  title: string;
  trigger: string;
  detection_gap: string;
  blast_radius: BlastRadius;
  fix_category: FixCategory | "novel_incident";
  affected_services: string;
  summary: string;
  recurrence_days: number;
};

type ArtifactRow = {
  incident_id: string;
  alert_yaml: string;
  runbook_md: string;
  terraform_tf: string;
};

type SimulationSeverity = "contained" | "elevated" | "critical" | "severe";

type BlastRadiusSimulation = {
  directly_impacted_services: string[];
  downstream_services: string[];
  affected_regions: string[];
  likely_entry_points: string[];
  estimated_user_impact: string;
  severity_if_unfixed: SimulationSeverity;
  severity_after_fix: SimulationSeverity;
  containment_actions: string[];
};

type ForecastScope =
  | "single-service"
  | "regional"
  | "multi-region"
  | "platform-wide";

type FailureForecast = {
  scope: ForecastScope;
  recurrence_probability: number;
  confidence: "medium" | "high";
  primary_risk_driver: string;
  executive_summary: string;
  regional_risk: Array<{
    region: string;
    risk: number;
  }>;
};

const serviceDependencyGraph: Record<string, string[]> = {
  "payments-service": ["checkout-api", "orders-db", "auth-service", "event-bus"],
  "checkout-api": ["payments-service", "edge-api", "auth-service"],
  "orders-db": ["payments-service", "analytics-pipeline"],
  "auth-service": ["api-gateway", "session-service"],
  "edge-api": ["traffic-router", "auth-service", "rate-limit-service"],
  "traffic-router": ["edge-api", "cdn-control-plane"],
  "notifications-worker": ["email-provider", "push-gateway", "job-queue"],
  "catalog-api": ["redis-cache", "search-service", "pricing-service"],
  "redis-cache": ["catalog-api", "product-renderer"],
  "session-service": ["api-gateway", "mobile-auth-gateway"],
  "api-gateway": ["edge-api", "auth-service"],
  "platform-core": ["event-bus", "observability-stack", "config-service"]
};

const serviceRegions: Record<string, string[]> = {
  "payments-service": ["us-east-1", "eu-west-1"],
  "checkout-api": ["us-east-1", "eu-west-1"],
  "orders-db": ["us-east-1"],
  "auth-service": ["us-east-1", "ap-south-1"],
  "edge-api": ["us-east-1", "eu-west-1", "ap-south-1"],
  "traffic-router": ["global-edge", "us-east-1"],
  "notifications-worker": ["us-east-1"],
  "catalog-api": ["us-east-1", "eu-west-1"],
  "redis-cache": ["us-east-1", "eu-west-1"],
  "session-service": ["us-east-1", "eu-west-1"],
  "api-gateway": ["global-edge", "us-east-1", "eu-west-1"],
  "platform-core": ["us-east-1", "eu-west-1", "ap-south-1"]
};

function toSimulationSeverity(blastRadius: BlastRadius): SimulationSeverity {
  if (blastRadius === "critical") return "severe";
  if (blastRadius === "high") return "critical";
  if (blastRadius === "medium") return "elevated";
  return "contained";
}

function reduceSimulationSeverity(
  severity: SimulationSeverity
): SimulationSeverity {
  if (severity === "severe") return "critical";
  if (severity === "critical") return "elevated";
  if (severity === "elevated") return "contained";
  return "contained";
}

function buildContainmentActions(trigger: string, fixCategory: string) {
  const actions = [
    "Freeze risky deploys and configuration changes touching the impacted services.",
    "Shift traffic or enable degraded mode for the highest-risk entry points.",
    "Escalate to the owning SRE and service team with the predicted blast radius."
  ];

  if (trigger === "db_saturation") {
    actions.unshift(
      "Throttle expensive read paths and redirect eligible read traffic to replicas."
    );
  } else if (trigger === "memory_leak") {
    actions.unshift(
      "Roll back the most recent worker release and increase buffer capacity for the queue."
    );
  } else if (trigger === "config_drift") {
    actions.unshift(
      "Pin the last known-good configuration and block further rollout propagation."
    );
  } else if (trigger === "cache_stampede") {
    actions.unshift(
      "Enable stale-while-revalidate or request coalescing before cache refill accelerates."
    );
  } else if (trigger === "deploy_regression") {
    actions.unshift(
      "Run synthetic checks on the latest release and prepare rollback for the affected path."
    );
  }

  if (fixCategory === "terraform_guard") {
    actions.push("Apply an infrastructure policy gate before reopening rollout access.");
  } else if (fixCategory === "runbook") {
    actions.push("Update the incident playbook so the next responder can contain impact faster.");
  }

  return actions.slice(0, 4);
}

function buildBlastRadiusSimulation(
  dna:
    | {
        trigger: string;
        blast_radius: BlastRadius;
        fix_category: string;
        affected_services: string[];
      }
    | null
): BlastRadiusSimulation | null {
  if (!dna) {
    return null;
  }

  const directlyImpactedServices =
    dna.affected_services.length > 0 ? dna.affected_services : ["platform-core"];
  const downstreamServices = Array.from(
    new Set(
      directlyImpactedServices.flatMap(
        (service) => serviceDependencyGraph[service] ?? ["observability-stack"]
      )
    )
  ).filter((service) => !directlyImpactedServices.includes(service));

  const affectedRegions = Array.from(
    new Set(
      [...directlyImpactedServices, ...downstreamServices].flatMap(
        (service) => serviceRegions[service] ?? ["us-east-1"]
      )
    )
  );

  const likelyEntryPoints =
    dna.trigger === "db_saturation"
      ? ["checkout flow", "payment authorization API", "replica read traffic"]
      : dna.trigger === "config_drift"
      ? ["edge routing", "public API traffic", "deployment control plane"]
      : dna.trigger === "memory_leak"
      ? ["background jobs", "notification delivery", "queue backlog"]
      : dna.trigger === "cache_stampede"
      ? ["product detail page", "catalog search", "cache warmup path"]
      : dna.trigger === "deploy_regression"
      ? ["mobile login", "session refresh", "API gateway release path"]
      : ["shared control plane", "cross-service dependencies", "manual operator workflows"];

  const estimatedUserImpact =
    dna.blast_radius === "critical"
      ? "High risk of customer-visible disruption across primary request paths within minutes."
      : dna.blast_radius === "high"
      ? "Likely partial outage affecting multiple services and one or more regions."
      : dna.blast_radius === "medium"
      ? "Moderate user-facing degradation with spillover into adjacent services if untreated."
      : "Mostly contained to a narrow operational surface with limited end-user exposure.";

  const severityIfUnfixed = toSimulationSeverity(dna.blast_radius);
  const severityAfterFix = reduceSimulationSeverity(severityIfUnfixed);

  return {
    directly_impacted_services: directlyImpactedServices,
    downstream_services: downstreamServices,
    affected_regions: affectedRegions,
    likely_entry_points: likelyEntryPoints,
    estimated_user_impact: estimatedUserImpact,
    severity_if_unfixed: severityIfUnfixed,
    severity_after_fix: severityAfterFix,
    containment_actions: buildContainmentActions(dna.trigger, dna.fix_category)
  };
}

function buildFailureForecast(
  dna:
    | {
        trigger: string;
        blast_radius: BlastRadius;
        fix_category: string;
        affected_services: string[];
        recurrence_days: number;
      }
    | null
): FailureForecast | null {
  if (!dna) {
    return null;
  }

  const probabilityByTrigger: Record<string, number> = {
    db_saturation: 78,
    memory_leak: 68,
    config_drift: 74,
    cache_stampede: 71,
    deploy_regression: 63,
    novel_incident: 57
  };

  const baseProbability =
    probabilityByTrigger[dna.trigger] ??
    (dna.recurrence_days < 15 ? 70 : dna.recurrence_days <= 30 ? 61 : 48);

  const recurrenceAdjustment =
    dna.recurrence_days < 10 ? 8 : dna.recurrence_days < 20 ? 4 : 0;

  const blastAdjustment =
    dna.blast_radius === "critical"
      ? 8
      : dna.blast_radius === "high"
      ? 5
      : dna.blast_radius === "medium"
      ? 2
      : 0;

  const recurrenceProbability = Math.min(
    92,
    baseProbability + recurrenceAdjustment + blastAdjustment
  );

  const scope: ForecastScope =
    dna.trigger === "novel_incident"
      ? "platform-wide"
      : dna.affected_services.length >= 3 || dna.blast_radius === "critical"
      ? "multi-region"
      : dna.blast_radius === "high"
      ? "regional"
      : "single-service";

  const directlyKnownRegions = Array.from(
    new Set(
      dna.affected_services.flatMap((service) => serviceRegions[service] ?? ["us-east-1"])
    )
  );

  const regionalRisk = directlyKnownRegions.map((region, index) => {
    const spreadPenalty = scope === "platform-wide" ? 10 : scope === "multi-region" ? 6 : 0;
    const positionPenalty = index * 4;
    return {
      region,
      risk: Math.max(
        28,
        Math.min(95, recurrenceProbability + spreadPenalty - positionPenalty)
      )
    };
  });

  const primaryRiskDriver =
    dna.trigger === "db_saturation"
      ? "Database saturation can quickly propagate through checkout and auth dependencies."
      : dna.trigger === "memory_leak"
      ? "Long-running worker pressure can silently build until queues and retries overflow."
      : dna.trigger === "config_drift"
      ? "Configuration mismatches can spread across regions before validation catches them."
      : dna.trigger === "cache_stampede"
      ? "Cache refill storms can amplify instantly into cross-service traffic spikes."
      : dna.trigger === "deploy_regression"
      ? "Release regressions can expand through shared gateways and client paths after deploy."
      : "The failure mode is novel enough that existing guardrails may not localize recurrence.";

  const executiveSummary =
    scope === "platform-wide"
      ? "The next recurrence is likely to escape a single team boundary and affect shared platform surfaces unless stronger controls are added."
      : scope === "multi-region"
      ? "This incident has a strong chance of spreading across multiple regions or user entry points if the prevention work is delayed."
      : scope === "regional"
      ? "The recurrence risk is concentrated in a region-sized blast radius with meaningful spillover into adjacent services."
      : "The recurrence risk is currently concentrated in a narrow service area, but repeated triggers could widen the outage footprint.";

  return {
    scope,
    recurrence_probability: recurrenceProbability,
    confidence:
      dna.trigger === "novel_incident" || dna.recurrence_days > 20 ? "medium" : "high",
    primary_risk_driver: primaryRiskDriver,
    executive_summary: executiveSummary,
    regional_risk: regionalRisk
  };
}

function safeJsonParseArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function findMatchesForIncident(
  incidentId: string,
  trigger: string,
  fixCategory: string
) {
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
    pr_status: PRStatus;
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

export function getAllIncidents() {
  const incidents = db
    .prepare(
      `
      SELECT
        id,
        source_text,
        status,
        pr_url,
        pr_status,
        created_at,
        resolved_at
      FROM incidents
      ORDER BY datetime(created_at) DESC
      `
    )
    .all() as IncidentRow[];

  return incidents.map((incident) => {
    const dna = db
      .prepare(
        `
        SELECT
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
      .get(incident.id) as Omit<FailureDnaRow, "incident_id"> | undefined;

    const artifacts = db
      .prepare(
        `
        SELECT alert_yaml, runbook_md, terraform_tf
        FROM artifacts
        WHERE incident_id = ?
        `
      )
      .get(incident.id) as Omit<ArtifactRow, "incident_id"> | undefined;

    return {
      id: incident.id,
      source_text: incident.source_text,
      status: incident.status,
      pr_url: incident.pr_url,
      pr_status: incident.pr_status,
      created_at: incident.created_at,
      resolved_at: incident.resolved_at,
      dna: dna
        ? {
            title: dna.title,
            trigger: dna.trigger,
            detection_gap: dna.detection_gap,
            blast_radius: dna.blast_radius,
            fix_category: dna.fix_category,
            affected_services: safeJsonParseArray(dna.affected_services),
            summary: dna.summary,
            recurrence_days: dna.recurrence_days
          }
        : null,
      artifacts: artifacts
        ? {
            alert_yaml: artifacts.alert_yaml,
            runbook_md: artifacts.runbook_md,
            terraform_tf: artifacts.terraform_tf
          }
        : null
    };
  });
}

export function getIncidentById(incidentId: string) {
  const incident = db
    .prepare(
      `
      SELECT
        id,
        source_text,
        status,
        pr_url,
        pr_status,
        created_at,
        resolved_at
      FROM incidents
      WHERE id = ?
      `
    )
    .get(incidentId) as IncidentRow | undefined;

  if (!incident) {
    return null;
  }

  const dna = db
    .prepare(
      `
      SELECT
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
    .get(incidentId) as Omit<FailureDnaRow, "incident_id"> | undefined;

  const artifacts = db
    .prepare(
      `
      SELECT
        alert_yaml,
        runbook_md,
        terraform_tf
      FROM artifacts
      WHERE incident_id = ?
      `
    )
    .get(incidentId) as Omit<ArtifactRow, "incident_id"> | undefined;

  const debtRows = db
    .prepare(
      `
      SELECT
        service_name,
        score,
        resolved,
        created_at
      FROM debt_scores
      WHERE incident_id = ?
      `
    )
    .all(incidentId) as Array<{
    service_name: string;
    score: number;
    resolved: number;
    created_at: string;
  }>;

  const trigger = dna?.trigger ?? "novel_incident";
  const fixCategory = dna?.fix_category ?? "architecture";

  const rawMatches = findMatchesForIncident(incidentId, trigger, fixCategory);
  const aiRecommendation = getAiRecommendationForIncident(incidentId);
  const topSimilarity = rawMatches[0]?.similarity ?? 0;
  const lowHistoricalConfidence =
    trigger === "novel_incident" || topSimilarity < 60;
  const openAiUnavailable = lowHistoricalConfidence && !process.env.OPENAI_API_KEY;
  const aiFallbackFailed =
    lowHistoricalConfidence && !!process.env.OPENAI_API_KEY && !aiRecommendation;
  const manualReviewRequired =
    trigger === "novel_incident" && (openAiUnavailable || aiFallbackFailed);

  const matches = manualReviewRequired ? [] : rawMatches;
  const manualReviewMessage = manualReviewRequired
    ? "IncidentBrain could not confidently solve this incident automatically. Please review manually and create the fix with an SRE or engineering owner."
    : null;

  const normalizedDna = dna
    ? {
        title: dna.title,
        trigger: dna.trigger,
        detection_gap: dna.detection_gap,
        blast_radius: dna.blast_radius,
        fix_category: dna.fix_category,
        affected_services: safeJsonParseArray(dna.affected_services),
        summary: dna.summary,
        recurrence_days: dna.recurrence_days
      }
    : null;

  return {
    id: incident.id,
    source_text: incident.source_text,
    status: incident.status,
    pr_url: incident.pr_url,
    pr_status: incident.pr_status,
    created_at: incident.created_at,
    resolved_at: incident.resolved_at,
    dna: normalizedDna,
    artifacts: manualReviewRequired
      ? null
      : artifacts
      ? {
          alert_yaml: artifacts.alert_yaml,
          runbook_md: artifacts.runbook_md,
          terraform_tf: artifacts.terraform_tf
        }
      : null,
    debt_scores: debtRows,
    matches,
    ai_recommendation: aiRecommendation,
    blast_radius_simulation: buildBlastRadiusSimulation(normalizedDna),
    failure_forecast: buildFailureForecast(normalizedDna),
    warnings: {
      lowHistoricalConfidence,
      openAiUnavailable,
      aiFallbackFailed,
      manualReviewRequired,
      manualReviewMessage
    }
  };
}

export function getDashboardData() {
  const totals = db
    .prepare(
      `
      SELECT
        COUNT(*) as total_incidents,
        SUM(CASE WHEN pr_status IN ('open', 'merged') THEN 1 ELSE 0 END) as prs_generated
      FROM incidents
      `
    )
    .get() as {
    total_incidents: number;
    prs_generated: number;
  };

  const openDebt = db
    .prepare(
      `
      SELECT COUNT(*) as count
      FROM debt_scores
      WHERE resolved = 0
      `
    )
    .get() as { count: number };

  const recurrence = db
    .prepare(
      `
      SELECT AVG(recurrence_days) as avg_recurrence_days
      FROM failure_dna
      `
    )
    .get() as {
    avg_recurrence_days: number | null;
  };

  const debtByService = db
    .prepare(
      `
      SELECT
        service_name,
        ROUND(SUM(CASE WHEN resolved = 0 THEN score ELSE 0 END), 2) as score,
        SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as open_incidents
      FROM debt_scores
      GROUP BY service_name
      ORDER BY score DESC
      `
    )
    .all() as Array<{
    service_name: string;
    score: number;
    open_incidents: number;
  }>;

  const trend = db
    .prepare(
      `
      SELECT
        substr(created_at, 1, 10) as date,
        ROUND(SUM(score), 2) as total_debt
      FROM debt_scores
      GROUP BY substr(created_at, 1, 10)
      ORDER BY date ASC
      `
    )
    .all() as Array<{
    date: string;
    total_debt: number;
  }>;

  const avgRecurrenceRisk =
    recurrence.avg_recurrence_days && recurrence.avg_recurrence_days > 0
      ? Number((30 / recurrence.avg_recurrence_days).toFixed(2))
      : 0;

  return {
    total_incidents: totals.total_incidents ?? 0,
    open_debt_items: openDebt.count ?? 0,
    avg_recurrence_risk: avgRecurrenceRisk,
    prs_generated: totals.prs_generated ?? 0,
    debt_by_service: debtByService,
    trend
  };
}

export function resolveIncident(incidentId: string) {
  const existing = db
    .prepare("SELECT id FROM incidents WHERE id = ?")
    .get(incidentId) as { id: string } | undefined;

  if (!existing) {
    return null;
  }

  const resolvedAt = new Date().toISOString();

  db.prepare(
    `
    UPDATE incidents
    SET status = 'resolved',
        pr_status = CASE
          WHEN pr_status = 'unresolved' THEN 'merged'
          ELSE pr_status
        END,
        resolved_at = ?
    WHERE id = ?
    `
  ).run(resolvedAt, incidentId);

  db.prepare(
    `
    UPDATE debt_scores
    SET resolved = 1
    WHERE incident_id = ?
    `
  ).run(incidentId);

  return getIncidentById(incidentId);
}

export function deleteIncident(incidentId: string) {
  const existing = db
    .prepare("SELECT id FROM incidents WHERE id = ?")
    .get(incidentId) as { id: string } | undefined;

  if (!existing) {
    return false;
  }

  db.prepare("DELETE FROM incidents WHERE id = ?").run(incidentId);
  return true;
}
