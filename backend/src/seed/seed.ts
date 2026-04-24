import { randomUUID } from "crypto";
import { db } from "../db/database";
import { seededIncidents } from "./seedData";
import { calculateDebtScore } from "../services/debtService";



export function seedDatabase() {
  const existing = db
    .prepare("SELECT COUNT(*) as count FROM incidents")
    .get() as { count: number };

  if (existing.count > 0) {
    return;
  }

  const insertIncident = db.prepare(`
    INSERT INTO incidents (id, source_text, status, pr_url, pr_status, created_at, resolved_at)
    VALUES (@id, @source_text, @status, @pr_url, @pr_status, @created_at, @resolved_at)
  `);

  const insertDna = db.prepare(`
    INSERT INTO failure_dna (
      id, incident_id, title, trigger, detection_gap, blast_radius,
      fix_category, affected_services, summary, recurrence_days, created_at
    ) VALUES (
      @id, @incident_id, @title, @trigger, @detection_gap, @blast_radius,
      @fix_category, @affected_services, @summary, @recurrence_days, @created_at
    )
  `);

  const insertArtifacts = db.prepare(`
    INSERT INTO artifacts (
      id, incident_id, alert_yaml, runbook_md, terraform_tf, created_at
    ) VALUES (
      @id, @incident_id, @alert_yaml, @runbook_md, @terraform_tf, @created_at
    )
  `);

  const insertDebt = db.prepare(`
    INSERT INTO debt_scores (
      id, service_name, incident_id, score, resolved, created_at
    ) VALUES (
      @id, @service_name, @incident_id, @score, @resolved, @created_at
    )
  `);

  const transaction = db.transaction(() => {
    for (const incident of seededIncidents) {
      insertIncident.run({
        id: incident.id,
        source_text: incident.source_text,
        status: incident.status,
        pr_url: incident.pr_url,
        pr_status: incident.pr_status,
        created_at: incident.created_at,
        resolved_at: incident.resolved_at
      });

      insertDna.run({
        id: randomUUID(),
        incident_id: incident.id,
        title: incident.dna.title,
        trigger: incident.dna.trigger,
        detection_gap: incident.dna.detection_gap,
        blast_radius: incident.dna.blast_radius,
        fix_category: incident.dna.fix_category,
        affected_services: JSON.stringify(incident.dna.affected_services),
        summary: incident.dna.summary,
        recurrence_days: incident.dna.recurrence_days,
        created_at: incident.created_at
      });

      insertArtifacts.run({
        id: randomUUID(),
        incident_id: incident.id,
        alert_yaml: incident.artifacts.alert_yaml,
        runbook_md: incident.artifacts.runbook_md,
        terraform_tf: incident.artifacts.terraform_tf,
        created_at: incident.created_at
      });

      for (const serviceName of incident.dna.affected_services) {
        insertDebt.run({
          id: randomUUID(),
          service_name: serviceName,
          incident_id: incident.id,
          score: calculateDebtScore(
            incident.status === "open" ? 1 : 0,
            incident.dna.recurrence_days,
            incident.dna.blast_radius
          ),
          resolved: incident.status === "resolved" ? 1 : 0,
          created_at: incident.created_at
        });
      }
    }
  });

  transaction();
}
