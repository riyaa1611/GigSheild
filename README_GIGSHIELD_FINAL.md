# GigShield: Parametric Insurance Platform

GigShield is an advanced, real-time parametric insurance platform designed explicitly for gig economy workers. Unlike traditional insurance that relies on claims adjusters and manual assessment, GigShield leverages machine learning, real-time trigger heuristics, and automated UPI disbursements to provide immediate financial relief when environmental or systemic disruptions occur (e.g., severe weather, platform outages, curfews, extreme heat).

## 🚀 Features Implemented

The full-stack application incorporates a microservices-inspired monolithic architecture built dynamically using Docker and modern development stacks:

### Context Validation & Trigger Engine
- **7-Tier Parametric Triggers (T-01 to T-07)**: Automated evaluation rules handling Heavy Rain, Extreme Heat, API latency (Platform Outages), and localized disruption feeds.
- **Background Dispatch Jobs (Bull & Redis)**: Triggers are efficiently queued using isolated producer-consumer Bull architecture.
- **Anomaly Detection (Fraud)**: Deterministic policy checks paired with an Isolation Forest anomoly-scoring machine learning model via FastAPI.

### Payouts & Claims Architecture
- **Instant UPI Disbursements**: Built-in integration with Razorpay sandbox to automatically funnel `processing` payouts based on valid trigger contexts.
- **Geospatial Cross-referencing**: Validates worker device pings (lat/lng) against triggered disrupted zone coordinates using internal Haversine distance computations before verifying the claim.

### Frontend Worker PWA
- **Glassmorphism Fintech UI**: Tailored Tailwind layout reflecting premium dynamic visuals, fluid animations, and contextual state monitoring (Live Pulse nodes).
- **Zustand State Preservation**: Synchronizes and caches Redux/Zustand worker state locally retaining JWTs, active plans, and real-time trigger payload views.
- **Magic Payout Flows**: WebSocket-enabled realtime alerts rendering "Magic Payout" overlays as soon as standard transactions verify on Razorpay.

### Admin Dashboard (Live Operations)
- **Live Trigger Map Orchestration**: Fully structured mapping utilizing React Leaflet representing live disruption zones layered by risk score and trigger frequency.
- **Extensive Analytical Telemetry**: Time-series charts analyzing claims vs premiums and aggregating platform loss ratios, tracked progressively inside Postgres.
- **Forecast ML Prediction Maps**: Admin panel integration pinging the ML service to showcase predictive risk forecasting across key postal codes.

---

## 🛠 Tech Stack

- **Backend Network:** Node.js, Express, Postgres (pg), Redis, Bull (Queueing), Socket.io (WebSockets).
- **Frontend PWA/Admin:** React, Vite, Tailwind CSS, Zustand, Recharts, React-Leaflet.
- **ML Risk Service:** Python, FastAPI, Scikit-Learn.
- **Infrastructure:** Docker, Docker Compose.

---

## 💻 Local Setup & Deployment

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/) setup functioning properly.
- [Node.js](https://nodejs.org/) v18+ (if attempting to run backend isolated).

### 2. Environment Variables Configuration
Clone the respective `.env` files internally for the backend and frontend.

**Backend (`backend/.env`)**
```env
# Database Connections (Docker overrides local URLs automatically)
DATABASE_URL=postgresql://gigshield:gigshield123@postgres:5432/gigshield
REDIS_URL=redis://redis:6379

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secrets
JWT_SECRET=your_jwt_secret_here
ADMIN_JWT_SECRET=your_admin_jwt_secret_here

# Services
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_ACCOUNT_NUMBER=your_razorpay_account
ML_SERVICE_URL=http://ml-service:8001
BULL_QUEUE_PREFIX=gigshield
```

**Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
# Add Razorpay Key ID for client-side interactions
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

### 3. Container Orchestration

GigShield operates fluidly in isolated Docker compositions minimizing host friction:

```bash
# Verify your Docker daemon is active, then execute:
docker compose up -d --build
```

**Containers Bridged Internally:**
- **`gigshield_postgres`**: Port `5432`
- **`gigshield_redis`**: Port `6379`
- **`gigshield_backend`**: Node server executing migrations and seed scripts automatically (Port `3001` exposed locally).
- **`gigshield_mlservice`**: Python FastAPI evaluating payloads (Port `8001` exposed locally).
- **`gigshield_frontend`**: React Vite dev server serving PWA and Admin endpoints (Port `3000` exposed locally).

### 4. Direct Access Endpoints
- **Worker PWA**: `http://localhost:3000`
- **Admin Authentication**: `http://localhost:3000/admin/login` (Use code: `GIGSHIELD_ADMIN_2024`)
- **Backend API**: `http://localhost:3001`
- **ML Forecast Service**: `http://localhost:8001/docs`

---

## 📚 Essential Demo Testing Routes

Ensure that database migrations sync efficiently. By default, the node application container operates a script triggering migrations on startup. 
To inject simulated traffic and test analytics:

```bash
# Injecting 15-20 dummy worker profiles 
cd backend 
node inject_data.js

# Triggering random weather boundaries for queue processor evaluation
node inject_triggers.js
```
*Note: Make sure to review the Admin map real-time as these scripts push dummy lat/lng intersections directly to RabbitMQ/Bull processors.*
