// AI Inference service (mock)
// Replace with real model call as needed.

export async function runInference({ amountMinor = 100, riskSignals = [] } = {}) {
  // Simple heuristic: authorize small amounts; penalize card_testing risk
  const risky = riskSignals.some((r) => r.type === 'card_testing' && (r.score || 0) > 7);
  const authorized = !risky && amountMinor <= 2000; // up to $20
  const confidence = authorized ? 0.9 : 0.4;
  const reasoning = authorized
    ? 'Transaction meets authorization criteria: low risk and within budget.'
    : 'Risk score too high or amount exceeds threshold.';
  return {
    authorized,
    confidence,
    reasoning,
    parameters: {
      budgetRemaining: 5000 / 100,
      riskScore: risky ? 0.8 : 0.12,
      transactionAmount: amountMinor / 100,
      categoryScore: authorized ? 0.95 : 0.3,
      velocityScore: 0.78,
    },
  };
}

