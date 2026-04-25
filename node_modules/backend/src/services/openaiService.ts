import OpenAI from "openai";
import { env } from "../config/env";

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

export type AiRecommendation = {
  solution_summary: string;
  recommended_alert_yaml: string;
  recommended_runbook_md: string;
  recommended_terraform_tf: string;
  novelty_reason: string;
};

const client = env.openAiApiKey
  ? new OpenAI({ apiKey: env.openAiApiKey })
  : null;

export async function generateNovelIncidentSolution(input: {
  text: string;
  dna: FailureDNAInput;
}): Promise<AiRecommendation | null> {
  if (!client) {
    return null;
  }

  const prompt = `
You are an expert SRE incident prevention assistant.

A new incident appears to have weak historical similarity.

Return STRICT JSON with this exact shape:
{
  "solution_summary": "2-4 sentence prevention strategy",
  "recommended_alert_yaml": "valid Prometheus alert YAML",
  "recommended_runbook_md": "valid markdown runbook section",
  "recommended_terraform_tf": "valid Terraform guard or precondition",
  "novelty_reason": "why the incident appears novel compared to historical incidents"
}

Rules:
- output JSON only
- no markdown fences
- alert YAML must be realistic
- runbook must include:
  - ## Detection
  - ## Immediate Response
  - ## Root Cause Investigation
  - ## Prevention

Post-mortem:
${input.text}

Initial Failure DNA:
${JSON.stringify(input.dna, null, 2)}
`;

  const response = await client.responses.create({
    model: "gpt-4o",
    input: prompt
  });

  const raw = response.output_text?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AiRecommendation;

    if (
      !parsed.solution_summary ||
      !parsed.recommended_alert_yaml ||
      !parsed.recommended_runbook_md ||
      !parsed.recommended_terraform_tf ||
      !parsed.novelty_reason
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
