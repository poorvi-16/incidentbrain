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
