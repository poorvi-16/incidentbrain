import { db } from "../db/database";

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
  fix_category: FixCategory;
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

function getFailureDnaMap() {
  const rows = db
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
      `
    )
    .all() as FailureDnaRow[];

  return new Map(
    rows.map((row) => [
      row.incident_id,
      {
        title: row.title,
        trigger: row.trigger,
        detection_gap: row.detection_gap,
        blast_radius: row.blast_radius,
        fix_category: row.fix_category,
        affected_services: JSON.parse(row.affected_services) as string[],
        summary: row.summary,
        recurrence_days: row.recurrence_days
      }
    ])
  );
}

function getArtifactMap() {
  const rows = db
    .prepare(
      `
      SELECT
        incident_id,
        alert_yaml,
        runbook_md,
        terraform_tf
      FROM artifacts
      `
    )
    .all() as ArtifactRow[];

  return new Map(
    rows.map((row) => [
      row.incident_id,
      {
        alert_yaml: row.alert_yaml,
        runbook_md: row.runbook_md,
        terraform_tf: row.terraform_tf
      }
    ])
  );
}

function findMatchesForIncident(
  incidentId: string,
  trigger: string,
  fixCategory: string
) {
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

  const dnaMap = getFailureDnaMap();
  const artifactMap = getArtifactMap();

  return incidents.map((incident) => ({
    id: incident.id,
    source_text: incident.source_text,
    status: incident.status,
    pr_url: incident.pr_url,
    pr_status: incident.pr_status,
    created_at: incident.created_at,
    resolved_at: incident.resolved_at,
    dna: dnaMap.get(incident.id) ?? null,
    artifacts: artifactMap.get(incident.id) ?? null
  }));
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
    .get(incidentId) as FailureDnaRow | undefined;

  const artifacts = db
    .prepare(
      `
      SELECT
        incident_id,
        alert_yaml,
        runbook_md,
        terraform_tf
      FROM artifacts
      WHERE incident_id = ?
      `
    )
    .get(incidentId) as ArtifactRow | undefined;

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

  const matches = dna
    ? findMatchesForIncident(incidentId, dna.trigger, dna.fix_category)
    : [];

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
          affected_services: JSON.parse(dna.affected_services) as string[],
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
      : null,
    debt_scores: debtRows,
    matches
  };
}

export function getDashboardData() {
  const totals = db
    .prepare(
      `
      SELECT
        COUNT(*) as total_incidents,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_incidents,
        SUM(CASE WHEN pr_status IN ('open', 'merged') THEN 1 ELSE 0 END) as prs_generated
      FROM incidents
      `
    )
    .get() as {
    total_incidents: number;
    open_incidents: number;
    prs_generated: number;
  };

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
        ROUND(SUM(score), 2) as score,
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
    open_debt_items: totals.open_incidents ?? 0,
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
