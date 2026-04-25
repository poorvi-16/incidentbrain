import { db } from "./database";

export function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      source_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      pr_url TEXT,
      pr_status TEXT NOT NULL DEFAULT 'unresolved',
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS failure_dna (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      title TEXT NOT NULL,
      trigger TEXT NOT NULL,
      detection_gap TEXT NOT NULL,
      blast_radius TEXT NOT NULL,
      fix_category TEXT NOT NULL,
      affected_services TEXT NOT NULL,
      summary TEXT NOT NULL,
      recurrence_days INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      alert_yaml TEXT NOT NULL,
      runbook_md TEXT NOT NULL,
      terraform_tf TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS debt_scores (
      id TEXT PRIMARY KEY,
      service_name TEXT NOT NULL,
      incident_id TEXT NOT NULL,
      score REAL NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_recommendations (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      solution_summary TEXT NOT NULL,
      recommended_alert_yaml TEXT NOT NULL,
      recommended_runbook_md TEXT NOT NULL,
      recommended_terraform_tf TEXT NOT NULL,
      novelty_reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_failure_dna_incident_id ON failure_dna(incident_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_incident_id ON artifacts(incident_id);
    CREATE INDEX IF NOT EXISTS idx_debt_scores_incident_id ON debt_scores(incident_id);
    CREATE INDEX IF NOT EXISTS idx_debt_scores_service_name ON debt_scores(service_name);
    CREATE INDEX IF NOT EXISTS idx_ai_recommendations_incident_id ON ai_recommendations(incident_id);
  `);
}
