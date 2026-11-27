# Architecture (summary)

Two processes, one repo: Next.js (`apps/web`) calls FastAPI (`apps/api`) over HTTP/JSON. SQLite plus a local filesystem workspace for storage (not yet implemented). No queue, workers or containers in the MVP.

Backend layering: `api/` (routes + Pydantic schemas) -> `services/` (orchestration) -> `analysis/` (pure functions, no I/O) -> `storage/`. `security/` is the only code allowed to open untrusted archives.

Design tokens: `apps/web/styles/tokens.css` is the single colour source; Tailwind aliases live in `app/globals.css`.

Full Phase 0 plan: see the project conversation; decisions are recorded as ADRs in `docs/decisions/`.
