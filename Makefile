# =============================================================
# GigShield — Root Makefile
# Requires: docker, docker-compose, make
# =============================================================

COMPOSE        = docker compose
BACKEND_CTR    = gigshield_backend
ML_CTR         = gigshield_mlservice
POSTGRES_CTR   = gigshield_postgres

.PHONY: dev down migrate seed ml-train logs logs-be logs-ml \
        ps shell-be shell-ml shell-db demo test clean

# ─────────────────────────────────────────────────────────────
# Service lifecycle
# ─────────────────────────────────────────────────────────────

## dev: Build images (if changed) and start all services
dev:
	$(COMPOSE) up --build

## up: Start all services without rebuilding
up:
	$(COMPOSE) up

## down: Stop and remove all containers (keeps volumes)
down:
	$(COMPOSE) down

## clean: Remove containers AND all named volumes (destructive!)
clean:
	$(COMPOSE) down -v --remove-orphans

# ─────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────

## migrate: Run pending SQL migrations inside the backend container
migrate:
	docker exec $(BACKEND_CTR) node src/db/migrate.js

## seed: Apply dev_seed.sql inside the backend container (dev only)
seed:
	docker exec $(BACKEND_CTR) node src/db/seed.js

## reset-db: Drop & recreate the database, then re-migrate and re-seed (dev only!)
reset-db: down
	$(COMPOSE) up -d postgres
	@echo "Waiting for postgres to be ready..."
	@sleep 5
	$(COMPOSE) up -d backend
	@sleep 5
	$(MAKE) migrate
	$(MAKE) seed

# ─────────────────────────────────────────────────────────────
# ML Training (runs inside ml-service container)
# ─────────────────────────────────────────────────────────────

## ml-train: Train all three models (premium, fraud, LSTM forecast)
ml-train:
	docker exec $(ML_CTR) python -m app.train.train_premium
	docker exec $(ML_CTR) python -m app.train.train_fraud
	docker exec $(ML_CTR) python -m app.train.train_lstm

## ml-train-premium: Train only the XGBoost premium model
ml-train-premium:
	docker exec $(ML_CTR) python -m app.train.train_premium

## ml-train-fraud: Train only the Isolation Forest fraud model
ml-train-fraud:
	docker exec $(ML_CTR) python -m app.train.train_fraud

## ml-train-lstm: Train only the LSTM disruption forecast model
ml-train-lstm:
	docker exec $(ML_CTR) python -m app.train.train_lstm

# ─────────────────────────────────────────────────────────────
# Logs
# ─────────────────────────────────────────────────────────────

## logs: Follow logs for all services
logs:
	$(COMPOSE) logs -f

## logs-be: Follow backend logs only
logs-be:
	$(COMPOSE) logs -f backend

## logs-ml: Follow ml-service logs only
logs-ml:
	$(COMPOSE) logs -f ml-service

## logs-db: Follow postgres logs only
logs-db:
	$(COMPOSE) logs -f postgres

## ps: Show running container status
ps:
	$(COMPOSE) ps

# ─────────────────────────────────────────────────────────────
# Shell access
# ─────────────────────────────────────────────────────────────

## shell-be: Open a shell inside the backend container
shell-be:
	docker exec -it $(BACKEND_CTR) sh

## shell-ml: Open a shell inside the ml-service container
shell-ml:
	docker exec -it $(ML_CTR) bash

## shell-db: Open psql inside the postgres container
shell-db:
	docker exec -it $(POSTGRES_CTR) psql -U gigshield -d gigshield

# ─────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────

## test: Run backend (Jest) + ML service (pytest) tests
test:
	docker exec $(BACKEND_CTR) npm test
	docker exec $(ML_CTR) pytest app/ -v --tb=short

## test-be: Run backend tests only
test-be:
	docker exec $(BACKEND_CTR) npm test

## test-ml: Run ml-service tests only
test-ml:
	docker exec $(ML_CTR) pytest app/ -v --tb=short

# ─────────────────────────────────────────────────────────────
# End-to-end Demo
# Demonstrates the "magic moment": seed → fire T-01 trigger → payout
# ─────────────────────────────────────────────────────────────

## demo: Full e2e demo — seed DB, fire T-01 trigger, watch payout
demo:
	@echo ""
	@echo "╔══════════════════════════════════════════════════╗"
	@echo "║         GigShield E2E Demo Starting...           ║"
	@echo "╚══════════════════════════════════════════════════╝"
	@echo ""
	@echo "Step 1/4 → Applying dev seed..."
	$(MAKE) seed
	@echo ""
	@echo "Step 2/4 → Firing T-01 (Heavy Rain) trigger on zone 400070..."
	curl -s -X POST http://localhost:3001/api/triggers/fire \
	  -H "Content-Type: application/json" \
	  -d '{"type":"T-01","zone_pincode":"400070","actual_value":87.5,"data_source":"demo"}' \
	  | python3 -m json.tool || true
	@echo ""
	@echo "Step 3/4 → Waiting 10s for claims + payout pipeline..."
	sleep 10
	@echo ""
	@echo "Step 4/4 → Latest payout status:"
	curl -s http://localhost:3001/api/payouts/analytics?limit=5 \
	  | python3 -m json.tool || true
	@echo ""
	@echo "✅ Demo complete! Open http://localhost:5173 to see live dashboard."
	@echo ""

# ─────────────────────────────────────────────────────────────
# Help
# ─────────────────────────────────────────────────────────────

## help: Print this help message
help:
	@echo ""
	@echo "GigShield Makefile commands:"
	@echo ""
	@grep -E '^## ' Makefile | sed 's/## /  make /'
	@echo ""
