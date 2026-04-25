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

export interface AiRecommendation {
  solution_summary: string;
  recommended_alert_yaml: string;
  recommended_runbook_md: string;
  recommended_terraform_tf: string;
  novelty_reason: string;
}

export interface IncidentWarnings {
  lowHistoricalConfidence: boolean;
  openAiUnavailable: boolean;
  aiFallbackFailed: boolean;
  manualReviewRequired: boolean;
  manualReviewMessage: string | null;
}

export interface BlastRadiusSimulation {
  directly_impacted_services: string[];
  downstream_services: string[];
  affected_regions: string[];
  likely_entry_points: string[];
  estimated_user_impact: string;
  severity_if_unfixed: "contained" | "elevated" | "critical" | "severe";
  severity_after_fix: "contained" | "elevated" | "critical" | "severe";
  containment_actions: string[];
}

export interface FailureForecast {
  scope: "single-service" | "regional" | "multi-region" | "platform-wide";
  recurrence_probability: number;
  confidence: "medium" | "high";
  primary_risk_driver: string;
  executive_summary: string;
  regional_risk: Array<{
    region: string;
    risk: number;
  }>;
}

export interface IncidentDetail extends IncidentRecord {
  debt_scores: Array<{
    service_name: string;
    score: number;
    resolved: number;
    created_at: string;
  }>;
  matches: IncidentMatch[];
  ai_recommendation: AiRecommendation | null;
  blast_radius_simulation: BlastRadiusSimulation | null;
  failure_forecast: FailureForecast | null;
  warnings: IncidentWarnings;
}
