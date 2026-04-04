const axios = require('axios');
const Queue = require('bull');
const redisClient = require('../redis');
const { pool } = require('../db/index');
const socketModule = require('../socket');

const claimsQueue = new Queue('claims-queue', process.env.REDIS_URL || 'redis://localhost:6379');

const API_KEYS = {
  weather: process.env.OPENWEATHER_API_KEY || 'mock',
  aqi: process.env.CPCB_AQI_KEY || 'mock',
  news: process.env.NEWS_API_KEY || 'mock',
  imd: process.env.IMD_CYCLONE_KEY || 'mock'
};

const evaluateTriggers = async (pincode, data) => {
  const triggers = [];

  // T-01: rainfall > 64.4 mm/hr
  if (data.rainfall > 64.4) {
    triggers.push({ type: 'T-01', severity: 'high', value: data.rainfall, desc: 'Heavy Rain' });
  }

  // T-02: flood depth > 30cm
  if (data.floodDepth > 30) {
    triggers.push({ type: 'T-02', severity: 'critical', value: data.floodDepth, desc: 'Flash Flood' });
  }

  // T-03: AQI > 300 for 2hr sustained (mocking sustained via simple threshold here)
  if (data.aqi > 300) {
    triggers.push({ type: 'T-03', severity: 'high', value: data.aqi, desc: 'Severe AQI' });
  }

  // T-04: temperature > 45°C during 11AM–4PM
  const currentHour = new Date().getHours();
  if (data.temperature > 45 && currentHour >= 11 && currentHour <= 16) {
    triggers.push({ type: 'T-04', severity: 'critical', value: data.temperature, desc: 'Extreme Heat' });
  }

  // T-05: Section 144 keyword in news
  if (data.hasCurfewKeyword) {
    triggers.push({ type: 'T-05', severity: 'critical', value: 1, desc: 'Curfew / Section 144' });
  }

  // T-06: IMD Orange/Red cyclone alert
  if (['Orange', 'Red'].includes(data.cycloneAlert)) {
    triggers.push({ type: 'T-06', severity: 'high', value: data.cycloneAlert, desc: 'Cyclone Alert' });
  }

  // T-07: platform app downtime > 4 continuous hours
  if (data.platformDowntimeHours > 4) {
    triggers.push({ type: 'T-07', severity: 'high', value: data.platformDowntimeHours, desc: 'Platform Outage' });
  }

  return triggers;
};

const fetchZoneData = async (pincode) => {
  const cachedRain = await redisClient.get(`zone:rain:${pincode}`);
  const cachedAqi = await redisClient.get(`zone:aqi:${pincode}`);

  const data = {
    rainfall: cachedRain ? parseFloat(cachedRain) : Math.random() * 80,
    floodDepth: Math.random() * 50,
    aqi: cachedAqi ? parseInt(cachedAqi) : Math.floor(Math.random() * 400),
    temperature: 30 + Math.random() * 20,
    hasCurfewKeyword: Math.random() > 0.95,
    cycloneAlert: Math.random() > 0.9 ? 'Orange' : 'None',
    platformDowntimeHours: Math.random() > 0.9 ? 5 : 0
  };

  await redisClient.setEx(`zone:rain:${pincode}`, 900, data.rainfall.toString());
  await redisClient.setEx(`zone:aqi:${pincode}`, 900, data.aqi.toString());

  return data;
};

const processZoneTriggers = async (pincode) => {
  console.log(`[TriggerEngine] Evaluating zone ${pincode}`);
  const data = await fetchZoneData(pincode);
  const triggers = await evaluateTriggers(pincode, data);

  for (const t of triggers) {
    const dedupeKey = `T-${t.type.replace('T-', '')}:${pincode}:${new Date().toISOString().slice(0, 13)}`;
    const redisDedupeKey = `trigger:dedup:${t.type}:${pincode}`;
    const exists = await redisClient.get(redisDedupeKey);

    if (!exists) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // +8 hours

      const { rows } = await pool.query(
        `INSERT INTO triggers (type, zone_pincode, severity, threshold_value, actual_value, data_source, triggered_at, expires_at, dedupe_key, raw_api_payload)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9) RETURNING id`,
        [
          t.type,
          pincode,
          t.severity,
          t.type === 'T-01' ? 64.4 : t.type === 'T-03' ? 300 : t.type === 'T-04' ? 45 : null,
          typeof t.value === 'number' ? t.value : null,
          'mock-api',
          expiresAt,
          dedupeKey,
          JSON.stringify(data)
        ]
      );

      const triggerId = rows[0].id;

      await redisClient.setEx(redisDedupeKey, 1800, 'processing');

      const payload = {
        triggerId,
        type: t.type,
        zonePincode: pincode,
        severity: t.severity,
        thresholdValue: t.value,
        triggeredAt: now
      };

      await claimsQueue.add(payload);
      console.log(`[TriggerEngine] Trigger fired! Zone: ${pincode}, Type: ${t.type}, Value: ${t.value}`);

      try {
        const io = socketModule.getIo();
        io.emit('trigger:new', payload);
      } catch (err) {
        console.error('[TriggerEngine] Socket.io emit failed (not initialized?)');
      }
    } else {
      console.log(`[TriggerEngine] Deduped duplicate trigger event ${t.type} for zone ${pincode}`);
    }
  }
};

const checkAllActiveTriggers = async () => {
  try {
    // Fetch distinct pincodes from active policies (via users table)
    const { rows } = await pool.query(
      `SELECT DISTINCT u.pincode FROM users u
       JOIN policies p ON p.user_id = u.id
       WHERE p.status = 'active'
         AND (p.ends_at IS NULL OR p.ends_at > NOW())
         AND u.pincode IS NOT NULL`
    );
    for (const row of rows) {
      if (row.pincode) {
        await processZoneTriggers(row.pincode);
      }
    }
  } catch (err) {
    console.error('[TriggerEngine] Global check failed', err);
  }
};

module.exports = {
  checkAllActiveTriggers,
  processZoneTriggers
};
