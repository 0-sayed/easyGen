.PHONY: setup infra infra-down infra-logs api web dev check test validate build coverage migrate-up migrate-status

setup:
	pnpm install

infra:
	pnpm infra:up

infra-down:
	pnpm infra:down

infra-logs:
	pnpm infra:logs

api:
	pnpm --filter @easygen/api dev

web:
	pnpm --filter @easygen/web dev

dev:
	pnpm --parallel --stream --filter @easygen/api --filter @easygen/web run dev

check:
	pnpm format:check
	pnpm lint
	pnpm type-check

test:
	pnpm test

validate:
	pnpm validate

build:
	pnpm build

coverage:
	pnpm coverage

migrate-up:
	pnpm migrate:up

migrate-status:
	pnpm migrate:status
