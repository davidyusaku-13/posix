.PHONY: all build build-fe build-be build-bridge test test-all clean run dev-fe dev-be run-bridge

all: test-all build

# Run all Go unit, service, repository, and REST API tests
test:
	go test -v -count=1 ./...

# Run all tests across backend, WhatsApp bridge, and frontend
test-all: test
	cd bridge/whatsapp && bun test
	cd frontend && bun test

# Build React / Vite frontend production bundle
build-fe:
	cd frontend && bun install && bun run build

# Build Go single binary with embedded frontend
build-be:
	mkdir -p bin
	go build -o bin/posix cmd/server/main.go

# Install WhatsApp bridge dependencies
build-bridge:
	cd bridge/whatsapp && bun install

# Full production build (Frontend + Backend + Bridge)
build: build-fe build-be
	@echo "Build complete: bin/posix"

# Run the single binary locally
run: build
	./bin/posix

# Run WhatsApp Baileys bridge
run-bridge:
	cd bridge/whatsapp && bun run index.ts

# Run Vite dev server for frontend development
dev-fe:
	cd frontend && bun run dev

# Run Go backend directly
dev-be:
	go run cmd/server/main.go

clean:
	rm -rf bin frontend/dist *.db*
