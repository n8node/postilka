.PHONY: up down prod prod-backend prod-frontend prod-nginx migrate test lint logs setup psql wp-cli status create-superadmin

COMPOSE := docker compose --env-file .env
COMPOSE_PROD := $(COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

prod:
	$(COMPOSE_PROD) up --build -d

# Prefer these after Wave-1: avoid recreating nginx (Windows browsers RST on dead keepalives).
prod-backend:
	$(COMPOSE_PROD) up --build -d backend worker

prod-frontend:
	$(COMPOSE_PROD) up --build -d frontend

prod-nginx:
	$(COMPOSE_PROD) up --build -d nginx

migrate:
	$(COMPOSE) exec -T backend sh -c 'goose -dir ./migrations postgres "$$DATABASE_URL" up'

# Usage: make create-superadmin EMAIL=you@example.com PASSWORD='Secret1!' NAME=Admin
# If the user already exists, only is_platform_admin is set (password unchanged).
create-superadmin:
	@test -n "$(EMAIL)" || (echo "EMAIL is required"; exit 1)
	$(COMPOSE_PROD) exec -T backend /app/create-superadmin -email "$(EMAIL)" -password "$(PASSWORD)" -name "$(NAME)"

test:
	cd backend && go test ./...

lint:
	cd backend && go vet ./...
	cd frontend && npm run lint

logs:
	$(COMPOSE) logs -f

psql:
	$(COMPOSE) exec postgres psql -U postilka postilka

wp-cli:
	$(COMPOSE) exec wordpress wp --allow-root $(filter-out $@,$(MAKECMDGOALS))

status:
	$(COMPOSE) ps

setup:
	bash scripts/setup.sh

%:
	@:
