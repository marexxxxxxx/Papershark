.PHONY: all backend frontend dev clean test

all: backend frontend

backend:
	cd planshark-core && go mod download && go build -o bin/server ./cmd/server

frontend:
	cd planshark-dashboard && npm install && npm run build

dev:
	cd planshark-core && go run ./cmd/server &
	cd planshark-dashboard && npm run dev -- --host

test:
	cd planshark-core && go test ./...

clean:
	rm -rf planshark-core/bin
	cd planshark-dashboard && rm -rf node_modules dist

docker-build:
	docker build -f docker/Dockerfile.agent -t planshark-agent:latest .

install: backend frontend
	@echo "Planshark installed. Run 'make dev' to start."

help:
	@echo "Planshark Makefile"
	@echo ""
	@echo "Targets:"
	@echo "  backend      - Build Go backend"
	@echo "  frontend     - Build React frontend"
	@echo "  all          - Build everything"
	@echo "  dev          - Run in development mode"
	@echo "  test         - Run tests"
	@echo "  clean        - Remove build artifacts"
	@echo "  docker-build - Build agent Docker image"
