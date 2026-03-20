# GigShield — AI-Powered Parametric Income Insurance for India's Gig Economy

## Inspiration

India has 15M+ gig delivery workers. A single bad weather week wipes 20–30% of their income. No safety net exists. We wanted to fix that with automation and AI.

## What it does

GigShield is a parametric income insurance platform for food delivery partners. It monitors real-time disruptions (weather, pollution, curfews), automatically triggers claims when thresholds are crossed, and processes payouts to workers — zero paperwork.

## How we built it

React + Tailwind frontend, Node/Express backend, PostgreSQL database, Python FastAPI ML service for dynamic weekly premium calculation and fraud detection, OpenWeatherMap API for live triggers, Razorpay test mode for simulated payouts.

## Challenges we ran into

Defining realistic parametric thresholds that reflect actual income loss without over/under triggering. Building fraud detection without real GPS data. Making the ML premium model explainable to a non-technical gig worker.

## Accomplishments that we're proud of

Fully automated zero-touch claims pipeline. Hyper-local zone-based dynamic pricing. Dual dashboard (worker + insurer). Working fraud anomaly detection.

## What we learned

Parametric insurance design is harder than it looks — setting the right thresholds matters more than the tech. Gig workers need extreme UX simplicity (many are low-literacy). Loss ratio math has to be sustainable from day one.

## What's next for GigShield

Expand beyond Zomato/Swiggy to e-commerce and Q-commerce delivery. Integrate real Zomato/Swiggy platform APIs for verified income data. Add regional language support. Partner with NBFCs for real premium collection.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| AI/ML | Python FastAPI + scikit-learn |
| Weather API | OpenWeatherMap (free tier) |
| Payment Mock | Razorpay test mode |
| Auth | JWT |

## Project Structure

```
GigShield/
├── frontend/          # React + Tailwind UI
├── backend/           # Node.js + Express API
├── ml-service/        # Python FastAPI ML service
├── docker-compose.yml # Full stack local setup
└── README.md
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.10+

### With Docker (Recommended)
```bash
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- ML Service: http://localhost:8000
- PostgreSQL: localhost:5432

### Without Docker

**Backend:**
```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npm run seed           # seed demo data
npm run dev
```

**ML Service:**
```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gigshield.in | admin123 |
| Worker | ravi.kumar@demo.in | demo123 |

## Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://gigshield:gigshield123@localhost:5432/gigshield
JWT_SECRET=your-secret-key
OPENWEATHER_API_KEY=your-openweathermap-key
ML_SERVICE_URL=http://localhost:8000
PORT=5000
```

### Frontend `.env`
```
REACT_APP_API_URL=http://localhost:5000/api
```

## API Documentation

Once running, visit `http://localhost:5000/api/docs` (Swagger UI) or import `backend/gigshield.postman_collection.json`.

## Covered Disruption Types

| Trigger | API | Threshold |
|---------|-----|-----------|
| Heavy Rain | OpenWeatherMap | Rainfall > 50mm/day |
| Extreme Heat | OpenWeatherMap | Temp > 42°C |
| Severe AQI/Pollution | OpenAQ API | AQI > 300 |
| Flood Alert | Mock / hardcoded | Boolean flag |
| Curfew / Zone Closure | Admin toggle | Admin sets it |

> **Note:** This platform covers income loss only. No health, life, accident, or vehicle repair coverage.

## Payout Formula

```
Payout = (declared_weekly_income / 7) × (estimated_disruption_hours / 8)
```

## License

MIT
