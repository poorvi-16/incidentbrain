export type BlastRadius = "low" | "medium" | "high" | "critical";

export type FixCategory =
  | "alert_rule"
  | "runbook"
  | "terraform_guard"
  | "architecture";

export type IncidentStatus = "open" | "resolved";

export type PRStatus = "unresolved" | "open" | "merged";

export interface FailureDNA {
  title: string;
  trigger: string;
  detection_gap: string;
  blast_radius: BlastRadius;
  fix_category: FixCategory;
  affected_services: string[];
  summary: string;
  recurrence_days: number;
}

export interface ArtifactBundle {
  alert_yaml: string;
  runbook_md: string;
  terraform_tf: string;
}

export interface IncidentMatch {
  incident_id: string;
  title: string;
  created_at: string;
  similarity: number;
  fix_status: PRStatus;
  summary: string;
}

export interface IncidentRecord {
  id: string;
  source_text: string;
  status: IncidentStatus;
  pr_url?: string | null;
  pr_status: PRStatus;
  created_at: string;
  resolved_at?: string | null;
  dna: FailureDNA;
  artifacts?: ArtifactBundle | null;
}

export interface ServiceDebtScore {
  service_name: string;
  score: number;
  open_incidents: number;
}

export interface DebtTrendPoint {
  date: string;
  total_debt: number;
}

export interface DashboardStats {
  total_incidents: number;
  open_debt_items: number;
  avg_recurrence_risk: number;
  prs_generated: number;
  debt_by_service: ServiceDebtScore[];
  trend: DebtTrendPoint[];
}
