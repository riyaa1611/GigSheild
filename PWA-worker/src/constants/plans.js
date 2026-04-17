export const PLANS = [
  {
    id: "basic",
    name: "BasicShield",
    tagline: "Essential Coverage",
    weeklyPremium: 29,
    coverageCap: 500,
    color: "#1a1a2e",
    accent: "#4ade80",
    triggers: ["T-01", "T-02"],
    features: ["Rain Disturbance", "High AQI Hazards"],
    missing: ["Curfew Protection", "Platform Outage"]
  },
  {
    id: "pro",
    name: "ProShield",
    tagline: "Professional Standard",
    weeklyPremium: 49,
    coverageCap: 900,
    recommended: true,
    color: "#0f3460",
    accent: "#4ade80",
    triggers: ["T-01", "T-02", "T-03", "T-04"],
    features: ["Rain Disturbance", "High AQI Hazards", "Curfew Protection", "Platform Outage (2h+)"],
    missing: []
  },
  {
    id: "ultra",
    name: "UltraShield",
    tagline: "Maximum Resilience",
    weeklyPremium: 79,
    coverageCap: 1500,
    color: "#1a0533",
    accent: "#a855f7",
    triggers: ["T-01", "T-02", "T-03", "T-04", "T-05", "T-06", "T-07"],
    features: ["All ProShield Features", "Instant Payouts", "Cyclone Protection", "Platform Outage 4h+"],
    missing: []
  }
];
