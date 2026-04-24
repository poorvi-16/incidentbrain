type BlastRadius = "low" | "medium" | "high" | "critical";

const blastRadiusMultiplier: Record<BlastRadius, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export function recurrenceProbability(recurrenceDays: number): number {
  const raw = 30 / Math.max(recurrenceDays, 1);
  return Math.max(0.1, Math.min(1, raw));
}

export function calculateDebtScore(
  unresolvedFailureModes: number,
  recurrenceDays: number,
  blastRadius: BlastRadius
): number {
  const multiplier = blastRadiusMultiplier[blastRadius];
  const probability = recurrenceProbability(recurrenceDays);

  return Number(
    (unresolvedFailureModes * probability * multiplier * 25).toFixed(2)
  );
}

export function estimateDebtReduction(score: number): number {
  return Number((score * 0.8).toFixed(2));
}
