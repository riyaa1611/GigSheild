## 🧪 Phase 1 — Infrastructure Health Check

**Prompt 1 — Verify all services are running**

```
Look at my docker-compose.yml and all running containers.

Run the following health checks and report status of each:

1. PostgreSQL:
   - Can connect: docker exec gigshield_postgres pg_isready
   - All tables exist: 
     docker exec gigshield_postgres psql -U $POSTGRES_USER -d gigshield -c "\dt"
     Expected tables: users, policies, triggers, claims, payouts, analytics_snapshots
   - All indexes exist: \di
   - Seed data loaded: SELECT COUNT(*) from users; (expect 6 including admin)

2. Redis:
   - Connection: docker exec gigshield_redis redis-cli ping (expect PONG)
   - Check no stale keys from previous runs: redis-cli KEYS "*"

3. Backend:
   - Server running: curl http://localhost:3001/health
   - Expected: { status: 'ok', db: 'connected', redis: 'connected', 
                 queues: { claims: 'ready', payouts: 'ready' }, 
                 sockets: 'ready' }

4. ML Service:
   - Running: curl http://localhost:8001/health
   - Expected: { status: 'ok', modelsLoaded: { premium: true, fraud: true }, 
                 version: '1.0' }
   - If models not loaded: run make ml-train first, then re-check

5. Frontend:
   - Dev server: curl http://localhost:5173 returns HTML
   - Check for build errors in docker-compose logs frontend

6. Bull Queues:
   - Check claims-queue: no stuck jobs
   - Check payouts-queue: no stuck jobs
   - Command: docker exec gigshield_backend node -e 
     "const Queue = require('bull'); 
      const q = new Queue('claims-queue'); 
      q.getJobCounts().then(console.log)"

Report any failures with the exact error message and suggest fix.
If everything passes: print "✅ Infrastructure healthy — ready for API tests"
```

---

## 🔐 Phase 2 — Auth Flow Tests

**Prompt 2 — Test complete auth flow**

```
Look at backend/src/routes/auth.js and backend/src/services/authService.js.

Run these tests in sequence using curl or a test script. 
Report pass/fail for each with actual response bodies:

TEST A — Send OTP (valid phone):
curl -X POST http://localhost:3001/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'
Expected: { success: true, expiresIn: 600 }
Check: Redis key otp:9876543210 exists (redis-cli GET otp:9876543210)

TEST B — Send OTP (invalid phone — should fail):
curl -X POST http://localhost:3001/auth/send-otp \
  -d '{"phone": "123"}'
Expected: 400 error with validation message

TEST C — Rate limit OTP (send 4 times same phone):
Send POST /auth/send-otp 4 times for same phone
Expected: 4th request returns 429 Too Many Requests

TEST D — Verify OTP (get OTP from Redis, use it):
REAL_OTP=$(docker exec gigshield_redis redis-cli GET otp:9876543210)
curl -X POST http://localhost:3001/auth/verify-otp \
  -d "{\"phone\": \"9876543210\", \"otp\": \"$REAL_OTP\"}"
Expected: { token: "eyJ...", isNewUser: true, userId: "uuid" }
Save the token as TEST_TOKEN for subsequent requests

TEST E — Verify OTP (wrong OTP — should fail):
curl -X POST http://localhost:3001/auth/verify-otp \
  -d '{"phone": "9876543210", "otp": "000000"}'
Expected: 401 { error: "Invalid OTP" }

TEST F — Aadhaar mock verification (valid):
curl -X POST http://localhost:3001/auth/aadhaar-mock \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"aadhaarNumber": "987654321012"}'
Expected: { verified: true, maskedAadhaar: "XXXX-XXXX-1012" }
Check: users table aadhaar_status = 'verified' for this user

TEST G — Link platform:
curl -X POST http://localhost:3001/auth/link-platform \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"platformType": "zomato", "platformId": "ZMT-TEST-001"}'
Expected: { linked: true, platform: "zomato" }

TEST H — Protected route without token (should fail):
curl http://localhost:3001/policy/active
Expected: 401 Unauthorized

TEST I — Admin route with worker token (should fail):
curl http://localhost:3001/admin/analytics \
  -H "Authorization: Bearer $TEST_TOKEN"
Expected: 403 Forbidden

Get admin token:
ADMIN_OTP=$(docker exec gigshield_redis redis-cli GET otp:9999999999)
# Send OTP to admin phone first, then verify
Save as ADMIN_TOKEN for admin tests later.

Print summary: X/9 tests passed.
```

---

## 📋 Phase 3 — Policy & ML Integration Tests

**Prompt 3 — Test policy service + ML premium calculation**

```
Use TEST_TOKEN from auth tests. 
Look at backend/src/routes/policy.js and ml-service/app/main.py.

TEST A — Get plans with ML-adjusted premiums:
curl http://localhost:3001/plans \
  -H "Authorization: Bearer $TEST_TOKEN"

Expected response structure:
{
  plans: [
    { 
      type: "basic", name: "BasicShield",
      basePremium: 29, adjustedPremium: NUMBER_BETWEEN_20_42,
      coverageCap: 500,
      triggers: ["T-01", "T-02"],
      multiplier: NUMBER_BETWEEN_0.7_1.3
    },
    { type: "pro", name: "ProShield", ... },
    { type: "ultra", name: "UltraShield", ... }
  ],
  mlBreakdown: { zoneRisk, seasonal, loyalty }
}

Validate:
- All 3 plans returned
- adjustedPremium = basePremium * multiplier (verify math)
- multiplier is between 0.7 and 1.3
- triggers array matches plan tier correctly

TEST B — Subscribe to ProShield:
curl -X POST http://localhost:3001/subscribe \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType": "pro", "upiHandle": "testworker@upi"}'

Expected: { policyId: "uuid", plan: "pro", coverageCap: 900, 
            adjustedPremium: NUMBER, nextBillingDate: "DATE" }

Verify in database:
docker exec gigshield_postgres psql -U user -d gigshield \
  -c "SELECT * FROM policies WHERE status='active' ORDER BY created_at DESC LIMIT 1;"
Expected: status=active, plan_type=pro, coverage_cap=900

Check Redis:
redis-cli GET "policy:active:{userId}"
Expected: policy data cached

TEST C — Get active policy:
curl http://localhost:3001/policy/active \
  -H "Authorization: Bearer $TEST_TOKEN"
Expected: full policy object with coverage breakdown by trigger type

TEST D — Subscribe again (should fail — already has active policy):
curl -X POST http://localhost:3001/subscribe \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"planType": "basic", "upiHandle": "testworker@upi"}'
Expected: 409 Conflict "Active policy already exists"

TEST E — Direct ML service test:
curl -X POST http://localhost:8001/predict/premium \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-123",
    "zonePincode": "400070",
    "zoneLat": 19.0760,
    "zoneLng": 72.8777,
    "platform": "zomato",
    "avgWeeklyHours": 48.0,
    "claimHistoryCount": 2,
    "currentMonth": 7,
    "zoneRiskScore": 0.8
  }'
Expected: multiplier > 1.0 (Mumbai monsoon month = high risk)

TEST F — ML fraud score test:
curl -X POST http://localhost:8001/score/fraud \
  -d '{
    "userId": "test-123",
    "triggerId": "trig-456",
    "gpsLat": 19.0760, "gpsLng": 72.8777,
    "triggerZonePincode": "400070",
    "deviceFingerprint": "device-abc",
    "claimCount30days": 1,
    "platformActiveStatus": true,
    "claimTimingVsPolicyStart": 1440,
    "lastDeliveryCount": 5
  }'
Expected: { fraudScore: < 0.3, decision: "auto_approve", flags: [] }

TEST G — ML fraud score test (obvious fraud):
curl -X POST http://localhost:8001/score/fraud \
  -d '{
    "userId": "fraud-user",
    "triggerId": "trig-789",
    "gpsLat": 28.7041, "gpsLng": 77.1025,
    "triggerZonePincode": "400070",
    "deviceFingerprint": "device-abc",
    "claimCount30days": 8,
    "platformActiveStatus": false,
    "claimTimingVsPolicyStart": 30,
    "lastDeliveryCount": 0
  }'
Expected: { fraudScore: > 0.7, decision: "manual_review", 
            flags: ["gps_mismatch", "zero_deliveries", "repeat_pattern"] }

Print summary: X/7 tests passed.
```

---

## ⚡ Phase 4 — Trigger Engine Tests

**Prompt 4 — Test trigger detection and deduplication**

```
Look at backend/src/services/triggerEngine.js and backend/src/jobs/triggerCron.js.

TEST A — Manual trigger fire (simulate rain event):
Create a test endpoint or directly call the trigger evaluation function:

docker exec gigshield_backend node -e "
const triggerEngine = require('./src/services/triggerEngine');
triggerEngine.evaluateZone({
  pincode: '400070',
  rainfall: 75.5,
  aqi: 180,
  temperature: 32
}).then(result => console.log(JSON.stringify(result, null, 2)));
"

Expected: 
- T-01 triggered (rainfall 75.5 > 64.4 threshold)
- T-03 NOT triggered (AQI 180 < 300 threshold)
- trigger saved to DB
- Redis dedup key set
- Bull queue job created

Verify trigger in DB:
docker exec gigshield_postgres psql -U user -d gigshield \
  -c "SELECT id, type, zone_pincode, threshold_value, triggered_at 
      FROM triggers ORDER BY triggered_at DESC LIMIT 1;"

Verify Redis dedup:
redis-cli TTL "trigger:dedup:T-01:400070"
Expected: TTL between 1 and 1800 (30 minutes)

TEST B — Deduplication (fire same trigger immediately again):
Run the same evaluateZone call again within 30 minutes.
Expected: NO new trigger created in DB (dedup prevented it)
Verify: DB still has same 1 trigger, not 2

TEST C — GET /triggers/live (admin map feed):
curl http://localhost:3001/triggers/live \
  -H "Authorization: Bearer $ADMIN_TOKEN"
Expected: array containing the T-01 trigger just created
Fields: id, type, zonePincode, severity, thresholdValue, triggeredAt, claimsCount

TEST D — Test AQI trigger (T-03, requires 2hr sustained):
Simulate sustained AQI trigger:
docker exec gigshield_backend node -e "
const triggerEngine = require('./src/services/triggerEngine');
// First reading
triggerEngine.evaluateZone({ pincode: '110001', aqi: 420, rainfall: 0 });
// Check if T-03 fires immediately or waits for sustained period
"
Expected: T-03 should NOT fire on first reading (needs 2hr sustained)
Check: Redis key zone:aqi:110001 = 420, but no trigger created yet

TEST E — Platform outage trigger (T-07, UltraShield only):
Simulate platform outage > 4hr:
docker exec gigshield_backend node -e "
const triggerEngine = require('./src/services/triggerEngine');
triggerEngine.evaluateZone({ 
  pincode: '380015', 
  platformOutageMinutes: 250  // > 4 hours
}).then(r => console.log(r));
"
Expected: T-07 triggered
Verify: only UltraShield policy holders in zone 380015 will get claims

TEST F — Socket.io trigger emission (admin map):
Open a WebSocket client and connect to admin room:
docker exec gigshield_backend node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3001');
socket.emit('join:admin', { token: '$ADMIN_TOKEN' });
socket.on('trigger:new', (data) => {
  console.log('Received trigger event:', JSON.stringify(data));
  process.exit(0);
});
// Fire a new zone trigger
setTimeout(() => {
  const triggerEngine = require('./src/services/triggerEngine');
  triggerEngine.evaluateZone({ pincode: '560001', rainfall: 80 });
}, 1000);
setTimeout(() => { console.log('TIMEOUT - no event received'); process.exit(1); }, 5000);
"
Expected: trigger:new event received within 2 seconds

Print summary: X/6 tests passed.
```

---

## 💰 Phase 5 — End-to-End Payout Flow Test

**Prompt 5 — Test the complete magic payout flow**

```
This is the most critical test — the core GigShield demo flow.
Use seeded test worker (worker2, ProShield plan, Delhi zone 110001).

Get worker2 token:
WORKER2_PHONE="9000000002"  # adjust to match seed data phone
Send OTP → verify → save as WORKER2_TOKEN

Step 1 — Verify worker2 setup:
curl http://localhost:3001/policy/active \
  -H "Authorization: Bearer $WORKER2_TOKEN"
Expected: active ProShield policy, zone 110001

Step 2 — Simulate worker being active (set Redis lastping):
docker exec gigshield_redis redis-cli SET \
  "worker:lastping:WORKER2_ID" "$(date +%s)" EX 7200
docker exec gigshield_redis redis-cli SET \
  "platform:active:WORKER2_ID" "true" EX 7200

Step 3 — Listen for Socket.io payout event:
docker exec gigshield_backend node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3001');
socket.emit('join:worker', { userId: 'WORKER2_ID' });
socket.on('payout:success', (data) => {
  console.log('PAYOUT RECEIVED:', JSON.stringify(data, null, 2));
  process.exit(0);
});
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 30000);
" &
SOCKET_PID=$!

Step 4 — Fire T-01 trigger in worker2's zone (110001):
docker exec gigshield_backend node -e "
const triggerEngine = require('./src/services/triggerEngine');
triggerEngine.evaluateZone({ 
  pincode: '110001', 
  rainfall: 78.5 
}).then(r => console.log('Trigger result:', r));
"

Step 5 — Wait 10 seconds, then check all pipeline stages:

Check trigger created:
docker exec gigshield_postgres psql -U user -d gigshield \
  -c "SELECT id, type, zone_pincode FROM triggers 
      WHERE zone_pincode='110001' ORDER BY triggered_at DESC LIMIT 1;"

Check claim created for worker2:
docker exec gigshield_postgres psql -U user -d gigshield \
  -c "SELECT id, status, fraud_score, payout_amount, hours_disrupted
      FROM claims WHERE user_id='WORKER2_ID' ORDER BY created_at DESC LIMIT 1;"
Expected: status='approved' OR status='paid', fraud_score < 0.3

Check payout created:
docker exec gigshield_postgres psql -U user -d gigshield \
  -c "SELECT id, status, amount, paid_at, razorpay_payout_id
      FROM payouts WHERE user_id='WORKER2_ID' ORDER BY created_at DESC LIMIT 1;"
Expected: status='success', amount > 0

Verify payout math:
hoursDisrupted should be trigger duration capped at 8
hourlyRate = 4200 / 56 = ₹75/hr (default)
payoutAmount = min(hoursDisrupted * 75, 900) rounded to nearest ₹10
Verify the DB amount matches this formula

Check Socket.io event received (Step 3 listener):
kill $SOCKET_PID
Expected output: PAYOUT RECEIVED with amount, triggerType, paidAt

Step 6 — Verify payout history API:
curl http://localhost:3001/payouts/history \
  -H "Authorization: Bearer $WORKER2_TOKEN"
Expected: array with at least 1 payout, includes payoutTimeMinutes field

Step 7 — Measure payout speed:
Extract: created_at from claim, paid_at from payout
Calculate: paid_at - created_at in minutes
Expected: < 10 minutes (target KPI)
Print: "Payout completed in X minutes Y seconds"

Step 8 — Test failed payout retry:
Temporarily set Razorpay to fail mode (set env RAZORPAY_FORCE_FAIL=true)
Fire another trigger
Check: payout retried 3 times (attempt_count = 3), then status='failed'
Check: failure_reason field populated
Check: admin socket received "payout:failed" event
Reset: RAZORPAY_FORCE_FAIL=false

Print full pipeline trace and summary: X/8 steps passed.
```

---

## 🕵️ Phase 6 — Fraud Detection Tests

**Prompt 6 — Test fraud pipeline**

```
Look at backend/src/services/claimsService.js and ml-service fraud model.

TEST A — GPS mismatch fraud (worker in wrong zone):
Create a worker with GPS set to Mumbai (19.07, 72.87)
Fire T-01 trigger in Delhi zone (110001)
Set worker lastping to recent

docker exec gigshield_backend node -e "
// Simulate context validation failure — GPS zone mismatch
const claimsService = require('./src/services/claimsService');
claimsService.validateContext({
  userId: 'WORKER1_ID',
  triggerZonePincode: '110001',
  userPincode: '400070',  // Mumbai, not Delhi
  userLat: 19.0760, userLng: 72.8777,
  triggerLat: 28.7041, triggerLng: 77.1025
}).then(r => console.log('Context valid:', r));
"
Expected: context validation FAILS (distance > 5km), no claim created
Verify: NO new claim in DB for this worker

TEST B — Zero delivery fraud:
Call ML fraud endpoint with lastDeliveryCount: 0:
curl -X POST http://localhost:8001/score/fraud \
  -d '{
    "userId": "fraud-test-1",
    "gpsLat": 19.0760, "gpsLng": 72.8777,
    "triggerZonePincode": "400070",
    "deviceFingerprint": "device-fraud-1",
    "claimCount30days": 1,
    "platformActiveStatus": true,
    "claimTimingVsPolicyStart": 2880,
    "lastDeliveryCount": 0
  }'
Expected: flags includes "zero_deliveries", fraudScore elevated

TEST C — Device cluster fraud (3 accounts same device):
Register 3 workers with same deviceFingerprint "shared-device-001"
Fire trigger affecting their zone
Expected: fraud score elevated for all 3, flags "device_cluster"

TEST D — New policy claim fraud (policy < 1hr old):
Create new policy, immediately fire a trigger
claimTimingVsPolicyStart = 10 minutes
Expected: fraud score elevated (rule: claimTimingVsPolicyStart < 60 adds 0.3)

TEST E — Manual review queue flow:
Ensure a claim has status='manual_review' (from TEST B or C)

Admin views flagged claims:
curl http://localhost:3001/admin/claims/flagged \
  -H "Authorization: Bearer $ADMIN_TOKEN"
Expected: array with claim, fraud signal tags, GPS trail data

Admin approves claim:
CLAIM_ID="uuid-from-above"
curl -X PATCH http://localhost:3001/admin/claims/$CLAIM_ID/review \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"action": "approve", "adminNote": "GPS verified manually"}'
Expected: claim status → paid, payout initiated

Check payout was triggered after manual approval:
docker exec gigshield_postgres psql -U user -d gigshield \
  -c "SELECT status FROM payouts WHERE claim_id='$CLAIM_ID';"
Expected: status = 'success'

Admin rejects another claim:
curl -X PATCH http://localhost:3001/admin/claims/$ANOTHER_CLAIM_ID/review \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"action": "reject", "adminNote": "Confirmed GPS spoofing"}'
Expected: claim status → rejected, worker notified via SMS

TEST F — Repeat pattern fraud (claim every single trigger):
Simulate worker claiming 6 times in 30 days
claimCount30days: 6
Expected: repeat_pattern flag appears, score increases

Print summary: X/6 tests passed.
```

---

## 📊 Phase 7 — Admin Dashboard Data Tests

**Prompt 7 — Test all admin APIs**

```
Use ADMIN_TOKEN for all requests.

TEST A — Analytics dashboard:
curl http://localhost:3001/admin/analytics \
  -H "Authorization: Bearer $ADMIN_TOKEN"
Expected:
{
  totalActiveUsers: NUMBER > 0,
  claimsThisWeek: NUMBER,
  totalPaidOut: NUMBER,
  lossRatio: NUMBER (0-100),
  avgPayoutTimeMinutes: NUMBER < 10
}
Verify lossRatio math: totalPaidOut / totalPremiumsCollected * 100

TEST B — Trigger frequency:
curl "http://localhost:3001/admin/analytics/triggers?days=30" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
Expected: array of { type, label, count } for T-01 through T-07
Verify T-01 count matches triggers table for last 30 days

TEST C — Claims vs premiums chart data:
curl "http://localhost:3001/admin/analytics/claims-vs-premiums?days=7" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
Expected: array of 7 objects { date, claimsAmount, premiumsCollected }
Verify dates are consecutive, no gaps

TEST D — Plan distribution:
curl http://localhost:3001/admin/analytics/plans \
  -H "Authorization: Bearer $ADMIN_TOKEN"
Expected: [{ plan: 'basic', count, percentage }, pro, ultra]
Verify percentages sum to 100

TEST E — Fraud stats:
curl http://localhost:3001/admin/fraud/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
Expected: { autoApprovedRate, flaggedRate, manualReviewRate,
            fraudScoreDistribution: { low, medium, high },
            topFraudSignals: [...] }

TEST F — Forecast endpoint:
curl "http://localhost:3001/admin/forecast" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
Expected: zone risk scores for all active pincodes
Check: Redis key forecast:zones was cached

TEST G — Directly test ML forecast:
curl "http://localhost:8001/forecast/disruption?zone=400070&days=7"
Expected: {
  zone: "400070",
  forecastDays: 7 items with date + riskScore + riskLevel,
  peakRiskDay: "DATE",
  recommendedPlan: "pro" or "ultra"
}

Print summary: X/7 tests passed.
```

---

## 🔄 Phase 8 — Full Demo Simulation

**Prompt 8 — Run the complete hackathon demo script**

```
This simulates exactly what you will show judges. 
Run this end-to-end and verify every step works cleanly.

STEP 1 — Reset to clean demo state:
docker exec gigshield_postgres psql -U user -d gigshield \
  -c "DELETE FROM payouts; DELETE FROM claims; 
      DELETE FROM triggers WHERE zone_pincode IN ('400070','110001','380015');
      UPDATE policies SET status='active' WHERE status='suspended';"
docker exec gigshield_redis redis-cli FLUSHDB

STEP 2 — Register a fresh demo worker (Raju):
RAJU_PHONE="9123456789"
# Send OTP
curl -X POST http://localhost:3001/auth/send-otp \
  -d "{\"phone\": \"$RAJU_PHONE\"}"
# Get OTP from Redis
RAJU_OTP=$(docker exec gigshield_redis redis-cli GET otp:$RAJU_PHONE)
# Verify OTP
RAJU_TOKEN=$(curl -X POST http://localhost:3001/auth/verify-otp \
  -d "{\"phone\": \"$RAJU_PHONE\", \"otp\": \"$RAJU_OTP\"}" \
  | jq -r '.token')
# Aadhaar mock
curl -X POST http://localhost:3001/auth/aadhaar-mock \
  -H "Authorization: Bearer $RAJU_TOKEN" \
  -d '{"aadhaarNumber": "987612345012"}'
# Link Zomato
curl -X POST http://localhost:3001/auth/link-platform \
  -H "Authorization: Bearer $RAJU_TOKEN" \
  -d '{"platformType": "zomato", "platformId": "ZMT-RAJU-001"}'

Print: "✅ Raju registered and verified"

STEP 3 — Raju subscribes to ProShield:
curl -X POST http://localhost:3001/subscribe \
  -H "Authorization: Bearer $RAJU_TOKEN" \
  -d '{"planType": "pro", "upiHandle": "raju@upi"}'
Expected: ProShield active, coverage cap ₹900

Print: "✅ Raju subscribed to ProShield — ₹{adjustedPremium}/week"

STEP 4 — Raju goes active (simulate him opening Zomato):
RAJU_ID=$(curl http://localhost:3001/policy/active \
  -H "Authorization: Bearer $RAJU_TOKEN" | jq -r '.userId')
docker exec gigshield_redis redis-cli SET \
  "worker:lastping:$RAJU_ID" "$(date +%s)" EX 7200
docker exec gigshield_redis redis-cli SET \
  "platform:active:$RAJU_ID" "true" EX 7200

Print: "✅ Raju is active on Zomato in Mumbai zone 400070"

STEP 5 — Start listening for payout event:
docker exec gigshield_backend node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3001');
socket.emit('join:worker', { userId: '$RAJU_ID' });
socket.on('payout:success', (data) => {
  console.log('');
  console.log('🎉 MAGIC MOMENT — PAYOUT RECEIVED');
  console.log('Amount: ₹' + data.amount);
  console.log('Trigger: ' + data.triggerType);
  console.log('Paid at: ' + data.paidAt);
  console.log('This is the GigShield demo moment!');
  process.exit(0);
});
" &
LISTEN_PID=$!

STEP 6 — Heavy rain starts in Mumbai (simulate IMD API):
Print: "🌧️  Simulating: IMD reports 78mm/hr rainfall in Mumbai 400070..."
docker exec gigshield_backend node -e "
const triggerEngine = require('./src/services/triggerEngine');
triggerEngine.evaluateZone({ pincode: '400070', rainfall: 78.2 })
  .then(r => {
    console.log('Trigger Engine:', r.triggered ? 'T-01 FIRED' : 'Not triggered');
    console.log('Zone:', r.zone);
    console.log('Threshold:', r.thresholdValue);
  });
"

STEP 7 — Wait and show pipeline progression:
sleep 2 && echo "⚡ Trigger detected — scanning active policies..."
sleep 2 && echo "🔍 Context validation — Raju was active in zone..."
sleep 2 && echo "🤖 AI fraud check — score: 0.05 (clean)..."
sleep 2 && echo "✅ Claim approved — calculating payout..."

STEP 8 — Verify complete pipeline:
# Check trigger
TRIGGER_ID=$(docker exec gigshield_postgres psql -U user -d gigshield -t \
  -c "SELECT id FROM triggers WHERE zone_pincode='400070' ORDER BY triggered_at DESC LIMIT 1;")
echo "Trigger ID: $TRIGGER_ID"

# Check claim
CLAIM=$(docker exec gigshield_postgres psql -U user -d gigshield \
  -c "SELECT status, fraud_score, payout_amount, hours_disrupted 
      FROM claims WHERE user_id='$RAJU_ID' ORDER BY created_at DESC LIMIT 1;")
echo "Claim: $CLAIM"

# Check payout
PAYOUT=$(docker exec gigshield_postgres psql -U user -d gigshield \
  -c "SELECT status, amount, paid_at FROM payouts 
      WHERE user_id='$RAJU_ID' ORDER BY created_at DESC LIMIT 1;")
echo "Payout: $PAYOUT"

wait $LISTEN_PID

STEP 9 — Print full demo summary:
echo ""
echo "=========================================="
echo "  GIGSHIELD DEMO — COMPLETE RESULTS"
echo "=========================================="
echo "Worker:        Raju (Mumbai, Zomato)"
echo "Plan:          ProShield ₹49/week"
echo "Event:         Heavy Rain — 78.2mm/hr"
echo "Trigger:       T-01 — Auto detected"
echo "Fraud Score:   0.05 (Clean)"
echo "Claim Status:  Approved"
echo "Payout:        ₹{AMOUNT} → raju@upi"
echo "Total Time:    {X} minutes"
echo ""
echo "No claim filed. No call made. Raju just got paid."
echo "=========================================="

STEP 10 — Run all previous test summaries:
Print combined score: 
"Infrastructure: X/6 | Auth: X/9 | Policy+ML: X/7 | 
 Triggers: X/6 | Payout Flow: X/8 | Fraud: X/6 | Admin: X/7"
"Overall: XX/49 tests passed"

If any failed: list them with error messages.
If all pass: print "🚀 GigShield is demo-ready"
```
