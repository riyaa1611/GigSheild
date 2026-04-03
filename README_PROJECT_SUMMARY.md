# GigShield — AI-Driven Parametric Income Protection For Gig Workers

**GigShield** is an end-to-end, automated parametric insurance platform specifically engineered to protect the income of gig economy workers (delivery partners, drivers, etc.). It continuously monitors real-time environmental data and platform downtimes across micro-zones, instantly and autonomously dispersing payouts via UPI when triggered—entirely bypassing legacy, manual claim processes.

---

## 🎯 Core Features Implemented

The platform operates autonomously through a multi-service architecture seamlessly connecting ML evaluations, queue-based background processing, and real-time frontend visualization.

### 1. **Trigger Engine & Automated Verification**
* **Real-time API Polling**: Background crons continuously evaluate 7 core thresholds mapping extreme weather (IMD Rainfall/Cyclones), unsafe environments (CPCB AQI, Heatwaves), curfews (NewsAPI), and platform outages.
* **Geospatial Cross-referencing**: Validates worker physical presence inside active disruption zones via Haversine logic before generating claims.
* **Deduplication**: Robust Redis integration strictly tracks TTL state-locks preventing redundant dual-claims across overlapping trigger bounds.

### 2. **Machine Learning Integrations (FastAPI)**
* **Dynamic Premium Pricing (XGBoost)**: Evaluates user risk indexes dynamically calculating bespoke weekly subscription structures.
* **Fraud Detection Pipeline (Isolation Forest)**: Utilizes deterministic rules coupled deeply with anomaly evaluations analyzing geospatial velocity, device fingerprinting, and claim density, yielding precise localized Fraud Scores assigning claims as either **Auto-Approved** or **Flagged for Manual Review**.
* **Disruption Forecasting**: Projects future atmospheric and localized volatility utilizing LSTM time-series datasets visualizing 7-Day lookahead vulnerability overlays.

### 3. **Payments & Ledger Architectures**
* **Razorpay Sync**: Full automated weekly `AutoPay` setups orchestrating worker subscription policies.
* **Bull Queue Payouts**: Secure worker disbursements pushed deeply into simulated background processing handling intelligent 5m exponential retry backoffs upon failure limits natively integrating localized Twilio SMS success triggers.

### 4. **Worker PWA & Admin Dashboards (React / Tailwind)**
* **Worker Interface**: JWT-protected mobile-focused interface featuring subscription portals, real-time live map disruptions, secure socket-triggered Payout overlays, and comprehensive historical transparency.
* **Admin Interface**: Powerful centralized command hub overlaying `react-leaflet` geo-nodes rendering localized live claims, Isolation Forest anomaly distribution analytics, Recharts fiscal telemetry, and direct flagged-claim adjudication tools.

---

## 🏛 Architecture Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express, Socket.io | Orchestration, Trigger Cron, Admin API |
| **AI / ML Service** | Python, FastAPI, scikit-learn | Fraud scoring, Dynamic Pricing |
| **Frontend** | React, Tailwind, Recharts, Leaflet | Worker PWA & Admin UI |
| **Database** | PostgreSQL | Robust tracking of Claims, Policies, Payouts |
| **Queues / Cache**| Redis, Bull | Claim/Payout processing, session caching |
| **Infrastructure**| Docker Compose | Secure containerization running identical dev/prod parity |

---

## 🚀 Local Development Setup

Follow these instructions to safely spin up the entire microservice ecosystem locally using Docker.

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
* `make` utility installed (Optional, but recommended for shortcut commands).
* Git.

### 1. Repository Setup & Environment Variables

Open the root `/backend` folder and ensure your `.env` is populated. You will need to provision Sandbox keys.

**`/backend/.env` Requirements:**
```env
# Database & Cache
PORT=3001
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=gigshield
REDIS_URL=redis://redis:6379

# Internal Services
ML_SERVICE_URL=http://ml-service:8001
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Autentication
JWT_SECRET=your_super_secure_jwt_secret_key_123

# Razorpay (Sandbox)
RAZORPAY_KEY_ID=rzp_test_YourSandboxKeyHere
RAZORPAY_KEY_SECRET=YourSandboxSecret
RAZORPAY_ACCOUNT_NUMBER=2323230000000000

# Twilio (Optional, acts as mock internally if left blank)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

**`/frontend/.env` Requirements:**
```env
VITE_API_URL=http://localhost:3001/api
```

### 2. Bootstrapping Containers

From the project root directory, spin up all 5 interconnected systems (PostgreSQL, Redis, Express Backend, FastAPI ML, React Frontend):

```bash
docker compose up --build
```
*Note: The initial build may take a few minutes as Python dependencies (scikit-learn, FastAPI) and exact Node modules (Zustand, socket.io) are explicitly compiled.*

### 3. Database Initialization & Seeding

The PostgreSQL schema will automatically execute via `001_initial_schema.sql` upon boot. However, to populate your dashboard with functional mock logic efficiently, deploy the backend seed command:

```bash
# Enter the backend container securely
docker compose exec backend sh 

# Execute the local database mock insertions (Auth bypasses, Mock Workers)
npm run db:seed 
```

### 4. Port Mapping Reference

Once the containers successfully stabilize, access the interfaces natively at:

* **Worker/Admin Frontend**: [http://localhost:3000](http://localhost:3000) (Use login UI or navigate to `/admin`)
* **Core Backend API**: [http://localhost:3001](http://localhost:3001)
* **ML Service API / Docs**: [http://localhost:8001/docs](http://localhost:8001/docs) *(Swagger UI)*
* **PostgreSQL Base**: `localhost:5432`

---

## 🛠 Simulated Trigger Testing

GigShield relies heavily on Background queues processing asynchronous environmental telemetry. 

To forcefully trigger an **Extreme Weather (T-01)** scenario evaluating worker bounds dynamically without awaiting crons:

```bash
curl -X POST http://localhost:3001/api/triggers/simulate \
     -H "Content-Type: application/json" \
     -d '{"type": "T-01", "pincode": "400001", "severity": 75}'
```

Watch your Admin Dashboard map dynamically populate active localized overlays and instantly route worker payout algorithms to the adjudication queue!
