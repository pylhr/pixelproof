# PixelProof

*Understand how your interfaces evolve.*

A visual and code evolution inspector: compare two versions of a frontend project, see what changed on screen, what changed in the source, and how the two are (honestly) connected.

> **Status: M0 (foundation).** Only the application shell exists. No comparison or analysis feature is implemented yet. See [docs/status.md](docs/status.md) for exactly what is built and verified.

## Requirements (Windows primary)
Node.js LTS, pnpm (via `corepack enable`), Python 3.11+, Git.

## Setup and run
```powershell
scripts\setup.ps1   # once: venv, pip install, pnpm install, .env files
scripts\dev.ps1     # API on http://127.0.0.1:8000, web on http://localhost:3000
scripts\test.ps1    # contrast check, pytest, typecheck, lint
```
End-to-end tests: `cd apps/web; pnpm exec playwright install chromium; pnpm test:e2e`.

## Layout
- `apps/web` - Next.js frontend (App Router, TypeScript strict, Tailwind v4)
- `apps/api` - FastAPI backend: `api/` routes and schemas, `services/` orchestration, pure `analysis/` (visual comparison), `security/` (untrusted image decoding), `storage/` (one folder per comparison). Endpoints under `/api/comparisons/visual`; interactive docs at http://127.0.0.1:8000/docs
- `docs` - architecture, decisions (ADRs), status
- `scripts` - Windows-friendly dev tooling; `check-contrast.py` validates design tokens; `gen-fixtures.py` / `gen-fixture-images.py` regenerate the fictional M1 sample data (`apps/web/fixtures/README.md`)
- `examples` - reserved for demo project versions and screenshots

## Principles
No feature is shown as working unless it is. AI is optional and off by default. Source code and screenshots stay local.
