export type BlastRadius = "low" | "medium" | "high" | "critical";
export type PRStatus = "unresolved" | "open" | "merged";

export interface FailureDNA {
  title: string;
  trigger: string;
  detection_gap: string;
  blast_radius: BlastRadius;
  fix_category: "alert_rule" | "runbook" | "terraform_guard" | "architecture";
  affected_services: string[];
  summary: string;
  recurrence_days: number;
}

export interface ArtifactBundle {
  alert_yaml: string;
  runbook_md: string;
  terraform_tf: string;
}

export interface IncidentRecord {
  id: string;
  source_text: string;
  status: string;
  pr_url?: string | null;
  pr_status: PRStatus;
  created_at: string;
  resolved_at?: string | null;
  dna: FailureDNA | null;
  artifacts?: ArtifactBundle | null;
}

export interface ServiceDebtScore {
  service_name: string;
  score: number;
  open_incidents: number;
}

export interface DashboardData {
  total_incidents: number;
  open_debt_items: number;
  avg_recurrence_risk: number;
  prs_generated: number;
  debt_by_service: ServiceDebtScore[];
  trend: Array<{
    date: string;
    total_debt: number;
  }>;
}

export interface IncidentMatch {
  incident_id: string;
  title: string;
  created_at: string;
  similarity: number;
  fix_status: PRStatus;
  summary: string;
}

export interface IncidentDetail extends IncidentRecord {
  debt_scores: Array<{
    service_name: string;
    score: number;
    resolved: number;
    created_at: string;
  }>;
  matches: IncidentMatch[];
}

export interface ArtifactBundle {
  alert_yaml: string;
  runbook_md: string;
  terraform_tf: string;
}
