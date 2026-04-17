/**
 * GigShield Local Risk Engine  v1.0
 * ─────────────────────────────────
 * Pure deterministic computation – no AI, no network call (beyond the
 * one-time data fetch that is then cached in module memory).
 *
 * Trigger coverage:
 *   T-01 Heavy Rain       → total_rainfall_mm
 *   T-02 Flood Risk       → flood_days
 *   T-03 AQI Alert        → avg_aqi + severe_aqi_days
 *   T-04 Extreme Heat     → heatwave_days
 *   T-05 Civil Disruption → civil_disruption_days
 *   T-06 Cyclone          → cyclone_event
 *   T-07 Platform Outage  → platform_outage_hrs
 *
 * Algorithm:
 *  1. Fetch /gigshield_risk_data.txt once, cache in module memory.
 *  2. Filter records for worker's city + current calendar month.
 *  3. Score each record's raw fields against calibrated thresholds.
 *  4. Compute year-weighted average (2024=3×, tapering to 1× for ≤2018).
 *  5. Map geo-seasonal score → base multiplier [0.80 – 2.00].
 *  6. Apply platform stability, weekly-hour, and claim-history factors.
 *  7. Clamp to [0.80 – 1.35] and return with human-readable breakdown.
 *
 * Output shape mirrors the old predict-premium Supabase edge function exactly.
 */

const BASE_PREMIUMS = { basic: 29, pro: 49, ultra: 79 };

const PLATFORM_RISK = {
  zomato:  1.00,
  swiggy:  0.98,
  zepto:   1.06,
  blinkit: 1.03,
  amazon:  0.94,
};

let _dbCache = null;
let _dbFetchPromise = null;

async function loadDb() {
  if (_dbCache) return _dbCache;
  if (_dbFetchPromise) return _dbFetchPromise;
  _dbFetchPromise = fetch("/gigshield_risk_data.txt")
    .then((r) => { if (!r.ok) throw new Error(`Risk data load failed: ${r.status}`); return r.json(); })
    .then((data) => { _dbCache = data; _dbFetchPromise = null; return data; });
  return _dbFetchPromise;
}

function yearWeight(year) {
  if (year >= 2024) return 3.0;
  if (year === 2023) return 2.5;
  if (year === 2022) return 2.0;
  if (year === 2021) return 1.5;
  if (year >= 2019)  return 1.2;
  return 1.0;
}

function geoSeasonScore(cityData, month) {
  const recs = cityData.monthly_data.filter((r) => r.month === month);
  if (!recs.length) return 0.40;
  let wSum = 0, wTotal = 0;
  for (const r of recs) {
    const w = yearWeight(r.year);
    const fRain  = Math.min(1, r.total_rainfall_mm / 400);
    const fFlood = Math.min(1, r.flood_days / 4);
    const fAqi   = Math.min(1, Math.max(0, r.avg_aqi - 120) / 230);
    const fSAqi  = Math.min(1, r.severe_aqi_days / 8);
    const fHeat  = Math.min(1, r.heatwave_days / 4);
    const fCyc   = r.cyclone_event;
    const fOut   = Math.min(1, r.platform_outage_hrs / 6);
    const fCivil = Math.min(1, r.civil_disruption_days / 3);
    const score  = fRain*0.22 + fFlood*0.18 + fAqi*0.20 + fSAqi*0.12 +
                   fHeat*0.16 + fCyc*0.08 + fOut*0.02 + fCivil*0.02;
    wSum += score * w; wTotal += w;
  }
  return wTotal > 0 ? wSum / wTotal : 0.40;
}

function hoursExposureFactor(hrs) {
  return parseFloat(Math.min(0.85 + (hrs / 40) * 0.15, 1.18).toFixed(4));
}

function platformFactor(platform) {
  return PLATFORM_RISK[platform?.toLowerCase()] ?? 1.0;
}

function claimFactor(count) {
  if (count === 0) return 0.95;
  if (count <= 2)  return 1.00;
  if (count <= 5)  return 1.05;
  return 1.10;
}

function buildBreakdown(cityData, month, platform, hrs, claimCount, geoScore, mult) {
  const recent = cityData.monthly_data.filter((r) => r.month === month && r.year >= 2019);
  const avg = (f) => recent.length ? recent.reduce((s, r) => s + r[f], 0) / recent.length : 0;

  const avgRain  = Math.round(avg("total_rainfall_mm"));
  const avgAqi   = Math.round(avg("avg_aqi"));
  const avgFlood = parseFloat(avg("flood_days").toFixed(1));
  const avgHeat  = parseFloat(avg("heatwave_days").toFixed(1));
  const avgOut   = parseFloat(avg("platform_outage_hrs").toFixed(1));
  const avgSAqi  = parseFloat(avg("severe_aqi_days").toFixed(1));
  const cycProb  = Math.round((recent.filter((r) => r.cyclone_event).length / (recent.length || 1)) * 100);

  const MN = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month];
  const bd = {};

  if (avgRain > 300)
    bd.rain = `🌧 Heavy monsoon in ${MN}: avg ${avgRain} mm — ${avgFlood} flood-disruption days/month on record.`;
  else if (avgRain > 80)
    bd.rain = `🌦 Moderate rainfall in ${MN}: avg ${avgRain} mm — ${avgFlood} flood days avg.`;
  else
    bd.rain = `☀️ Dry season in ${MN}: avg ${avgRain} mm — rain & flood risk minimal.`;

  if (avgAqi > 250)
    bd.aqi = `🏭 Severe AQI in ${MN}: city avg ${avgAqi} — ${avgSAqi} days/month above 300 (Hazardous).`;
  else if (avgAqi > 150)
    bd.aqi = `😷 Elevated AQI in ${MN}: city avg ${avgAqi} — intermittent poor air quality.`;
  else
    bd.aqi = `✅ Air quality in ${MN}: avg AQI ${avgAqi} — minimal disruption.`;

  if (avgHeat > 3)
    bd.heat = `🔥 Heatwave season in ${MN}: avg ${avgHeat} days ≥ 42°C — delivery slowdowns expected.`;
  else if (avgHeat > 0)
    bd.heat = `🌡 Occasional heat spikes in ${MN}: avg ${avgHeat} heatwave days on record.`;

  if (cycProb >= 5)
    bd.cyclone = `🌀 Cyclone risk in ${MN}: ${cycProb}% historical probability of a cyclone event.`;

  bd.outage = avgOut > 4.0
    ? `📵 High platform downtime in ${MN}: avg ${avgOut} hrs combined — direct earnings impact.`
    : `📶 Platform stability in ${MN}: avg ${avgOut} hrs downtime — within normal range.`;

  const pf = platformFactor(platform);
  const pName = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : "Your platform";
  if (pf > 1.02)
    bd.platform = `⚡ ${pName} carries a slightly higher outage factor (×${pf.toFixed(2)}) in your region.`;
  else if (pf < 0.97)
    bd.platform = `✅ ${pName} has strong platform stability (×${pf.toFixed(2)} applied).`;

  const hf = hoursExposureFactor(hrs);
  if (hrs > 56)
    bd.hours = `⏱ Working ${hrs} hrs/week — full-time+ exposure (factor ×${hf.toFixed(2)}).`;
  else if (hrs < 30)
    bd.hours = `🕓 Part-time at ${hrs} hrs/week — lower total exposure (factor ×${hf.toFixed(2)}).`;

  if (claimCount === 0)
    bd.history = `🏅 Clean claim record — 5% loyalty discount applied.`;
  else if (claimCount > 3)
    bd.history = `📋 ${claimCount} past claims on record — small loading applied.`;

  bd.summary = mult <= 0.92
    ? `Overall risk for ${MN} is LOW — discounted premium rate applies.`
    : mult <= 1.10
    ? `Overall risk for ${MN} is MODERATE — standard rate applies.`
    : `Overall risk for ${MN} is HIGH — premium reflects elevated disruption risk in your zone.`;

  return bd;
}

export async function computeRisk({
  city              = "Mumbai",
  platform          = "zomato",
  avgWeeklyHours    = 56,
  claimHistoryCount = 0,
  currentMonth      = new Date().getMonth() + 1,
} = {}) {
  const db = await loadDb();

  const cityKey =
    Object.keys(db.cities).find((k) => k.toLowerCase() === city.toLowerCase()) ?? "Mumbai";
  const cityData = db.cities[cityKey];

  const geoScore   = geoSeasonScore(cityData, currentMonth);
  const geoBase    = 0.80 + geoScore * 1.20;
  const pf         = platformFactor(platform);
  const hf         = hoursExposureFactor(avgWeeklyHours);
  const cf         = claimFactor(claimHistoryCount);
  const multiplier = parseFloat(Math.max(0.80, Math.min(1.35, geoBase * pf * hf * cf)).toFixed(2));

  const adjustedPlans = Object.entries(BASE_PREMIUMS).map(([planId, base]) => ({
    planId,
    basePremium:     base,
    adjustedPremium: Math.round(base * multiplier),
    multiplier,
  }));

  const breakdown = buildBreakdown(
    cityData, currentMonth, platform, avgWeeklyHours, claimHistoryCount, geoScore, multiplier
  );

  return { multiplier, adjustedPlans, breakdown };
}

export function preloadRiskData() {
  loadDb().catch(() => {});
}
