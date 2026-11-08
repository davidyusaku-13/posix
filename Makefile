.PHONY: all build build-fe build-be test clean run dev-fe dev-be

all: test build

# Run all unit, service, repository, and REST API tests
test:
	go test -v -count=1 ./...

# Build React / Vite frontend production bundle
build-fe:
	cd frontend && npm install && npm run build

# Build Go single binary with embedded frontend
build-be:
	mkdir -p bin
	go build -o bin/posix cmd/server/main.go

# Full production build (Frontend + Backend)
build: build-fe build-be
	@echo "Build complete: bin/posix"

# Run the single binary locally
run: build
	./bin/posix

# Run Vite dev server for frontend development
dev-fe:
	cd frontend && npm run dev

# Run Go backend directly
dev-be:
	go run cmd/server/main.go

clean:
	rm -rf bin frontend/dist *.db*
