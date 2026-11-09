# Repository Guidelines

POSIX is an offline-first Point of Sale application compiled into a single cross-platform executable (Go backend + embedded SQLite WAL + embedded React/Vite SPA) with an integrated Baileys WhatsApp notification bridge. The repository enforces Waterfall SDLC, TDD, SOLID, DRY, and REST standards.

## Project Structure & Module Organization

- `cmd/server/main.go`: Entrypoint, dependency injection wiring, and child process bridge supervisor.
- `internal/`: Clean architecture layers:
  - `domain/`: Entities, integer minor-unit financial math, domain errors. Zero external dependencies.
  - `payment/`: Strategy-pattern payment processors (`CashProcessor`, `CardProcessor`, `Registry`).
  - `repository/`: Persistence interfaces and SQLite WAL implementations (`internal/repository/sqlite/`).
  - `service/`: Orchestration layer (`OrderService`, `ProductService`, `AuthService`, `UserService`, `NotificationService`).
  - `api/`: REST v1 HTTP handlers, router, and SPA fallback server.
  - `notification/`: Notifier abstraction, Baileys client, and child process supervisor.
- `frontend/`: React 19, Vite, Tailwind CSS v4, Base UI, and shadcn (Lyra preset). Managed with **Bun**.
- `bridge/whatsapp/`: Local WhatsApp Web multi-device bridge powered by `@whiskeysockets/baileys` and Bun.
- `docs/`: SDLC specifications (`WATERFALL.md`, `SPECIFICATION.md`, `ARCHITECTURE.md`).

## Build, Test, and Development Commands

- `make test`: Run Go test suite (`go test -v -count=1 ./...`).
- `make test-all`: Run Go tests and WhatsApp bridge Bun tests.
- `make build`: Full production build (`build-fe` + `build-be`), outputs `bin/posix`.
- `make run`: Run binary on `:8080` (auto-spawns WhatsApp bridge on `:8081`).
- `make dev-be`: Run Go server directly (`go run cmd/server/main.go`).
- `make dev-fe`: Run Vite dev server with Bun (`cd frontend && bun run dev`).

## Coding Style & Standards

- **Financial Integrity**: All monetary values strictly use integer minor units (cents, `int64`). Floating-point math is forbidden in calculations and storage.
- **UI Design System**: Strictly follow shadcn Lyra styling: zero-radius square corners (`rounded-none`, `--radius: 0rem`), Espresso & Cream palette, Inter font, and JetBrains Mono for tabular numbers.
- **Modal UX**: All modals must support dismissal via <kbd>Escape</kbd> and backdrop click.
- **Process Safety**: Never execute broad commands like `pkill -f ./bin/posix` that risk terminating user session terminals.

## Testing & Quality Guidelines

- Follow strict **TDD**: Write failing tests before implementation (Red → Green → Refactor).
- Maintain 100% test pass rate across `make test-all` before committing.
- Mock network and external drivers using interface fakes.

## Commit Guidelines

Follow Conventional Commits: `<type>(<scope>): <short description>`.
- Allowed types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`.
- Example: `feat(notifications): add WhatsApp store owner low-stock alerts via Baileys`
