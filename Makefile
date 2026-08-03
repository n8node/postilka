.PHONY: up down prod migrate test lint logs setup psql wp-cli status

COMPOSE := docker compose --env-file .env
COMPOSE_PROD := $(COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

prod:
	$(COMPOSE_PROD) up --build -d

migrate:
	$(COMPOSE) exec -T backend sh -c 'goose -dir ./migrations postgres "$$DATABASE_URL" up'

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
