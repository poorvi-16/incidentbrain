import { randomUUID } from "crypto";
import { db } from "../db/database";
import {
  generateNovelIncidentSolution,
  type AiRecommendation
} from "./openaiService";

type FailureDNAInput = {
  title: string;
  trigger: string;
  detection_gap: string;
  blast_radius: string;
  fix_category: string;
  affected_services: string[];
  summary: string;
  recurrence_days: number;
};

export async function generateAndStoreAiRecommendation(input: {
  incidentId: string;
  sourceText: string;
  dna: FailureDNAInput;
}) {
  const existing = db
    .prepare(
      `
      SELECT
        solution_summary,
        recommended_alert_yaml,
        recommended_runbook_md,
        recommended_terraform_tf,
        novelty_reason
      FROM ai_recommendations
      WHERE incident_id = ?
      `
    )
    .get(input.incidentId) as AiRecommendation | undefined;

  if (existing) {
    return existing;
  }

  const generated = await generateNovelIncidentSolution({
    text: input.sourceText,
    dna: input.dna
  });

  if (!generated) {
    return null;
  }

  db.prepare(
    `
    INSERT INTO ai_recommendations (
      id,
      incident_id,
      solution_summary,
      recommended_alert_yaml,
      recommended_runbook_md,
      recommended_terraform_tf,
      novelty_reason,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    randomUUID(),
    input.incidentId,
    generated.solution_summary,
    generated.recommended_alert_yaml,
    generated.recommended_runbook_md,
    generated.recommended_terraform_tf,
    generated.novelty_reason,
    new Date().toISOString()
  );

  return generated;
}

export function getAiRecommendationForIncident(incidentId: string) {
  return (
    db
      .prepare(
        `
        SELECT
          solution_summary,
          recommended_alert_yaml,
          recommended_runbook_md,
          recommended_terraform_tf,
          novelty_reason
        FROM ai_recommendations
        WHERE incident_id = ?
        `
      )
      .get(incidentId) ?? null
  );
}
