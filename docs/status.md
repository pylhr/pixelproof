# Implementation status

Legend: **Implemented** (code exists) / **Verified** (actually executed, with the evidence stated) / **Planned**.
Last updated: M0 scaffold delivered.

## M0 - Foundation

| Item | Implemented | Verified | Evidence / note |
|---|---|---|---|
| Repo layout, `.gitignore`, README | yes | partly | Files exist; not yet under git |
| FastAPI app + `GET /health` + CORS allow-list | yes | **syntax only** | `py_compile` passed. `pytest` NOT run (fastapi/pytest unavailable in authoring sandbox) |
| Config loader (rejects `*` origins) | yes | **syntax only** | tests written in `tests/test_config.py`, not run |
| Design tokens (light/dark) | yes | **yes** | `scripts/check-contrast.py`: 50 pairs pass WCAG AA (text 4.5, UI boundary 3.0) |
| Next.js app, Tailwind v4 theming | yes | **no** | Never installed or compiled. Dependency versions are caret ranges, unresolved |
| App shell: sidebar, context bar, command palette, theme | yes | **no** | Not rendered or type-checked |
| Overview, Settings, 5 placeholder modules, design-system page | yes | **no** | Not rendered |
| Playwright smoke tests | written | **no** | Not run |
| `scripts/setup.ps1`, `dev.ps1`, `test.ps1` | written | **no** | Not run on Windows |

## Known limitations / technical debt
- Everything marked "no" above must be run once on a real machine before M0 is considered done.
- API types in `lib/api.ts` are hand-written; generate from OpenAPI once more endpoints exist.
- `next/font/google` downloads fonts at build time (needs network on first build).
- Sidebar Ctrl+B may conflict with a browser shortcut in Firefox.
- Frontend unit-test tooling not chosen yet (Playwright only).

## Unverified external assumptions
- Next.js 15/React 19/Tailwind 4/ESLint 9 peer compatibility as pinned in `package.json`.
- Current Gemini free-tier terms (Phase 5 gate).
