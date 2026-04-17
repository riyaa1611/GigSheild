export const FRAUD_CRITERIA = [
  {
    key: "auto_approve",
    label: "Auto Approve Payout",
    band: "Score < 0.3",
    color: "#4ade80",
  },
  {
    key: "secondary_validation",
    label: "Secondary Validation",
    band: "Score 0.3-0.7",
    color: "#f59e0b",
  },
  {
    key: "manual_review",
    label: "Manual Review Queue",
    band: "Score > 0.7",
    color: "#ef4444",
  },
];

export function getFraudCriteria(score) {
  const value = Number(score) || 0;
  if (value < 0.3) {
    return FRAUD_CRITERIA[0];
  }
  if (value <= 0.7) {
    return FRAUD_CRITERIA[1];
  }
  return FRAUD_CRITERIA[2];
}

export function getFraudColor(score) {
  return getFraudCriteria(score).color;
}
