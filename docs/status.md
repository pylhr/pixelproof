# Implementation status

Legend: **Implemented** (code exists) / **Verified** (actually executed, with the evidence stated) / **Planned**.
Last updated: M0 first verification run (see below).

## M0 - Foundation

Verification run on the developer's Windows machine (Python 3.11.0, Node/pnpm via setup.ps1), 2026-11-26.
Resolved versions: Next 15.5.29, React 19.3.1, Tailwind 4.3.5, TypeScript 5.9.3, ESLint 9.39.5, Playwright 1.65.1; FastAPI 0.165.0, Pydantic 2.14.4, pytest 9.2.0.

| Item | Implemented | Verified | Evidence / note |
|---|---|---|---|
| Repo layout, `.gitignore`, README | yes | partly | Files exist; not yet under git |
| `scripts/setup.ps1` | yes | **yes** | Ran to completion on Windows (backend venv + `pnpm install`) |
| FastAPI app + `GET /health` + CORS allow-list | yes | **yes** | `pytest`: 8 passed (`test_health`, `test_config`) |
| Config loader (rejects `*` origins) | yes | **yes** | `tests/test_config.py` passed |
| Design tokens (light/dark) | yes | **yes** | `scripts/check-contrast.py`: 25 pairs per theme pass |
| Next.js app, Tailwind v4 theming | yes | **partly** | `pnpm typecheck` clean; `pnpm lint` 0 errors; production build succeeded on 2nd run (13/13 static pages). See open issue 1. Not yet inspected visually |
| App shell: sidebar, context bar, command palette, theme | yes | **partly** | Playwright covers nav, theme persistence, Ctrl+K, Ctrl+B, API status. No visual/a11y review yet |
| Overview, Settings, 5 placeholder modules, design-system page | yes | **partly** | All 8 routes render an H1 (14/14 e2e on warm run). Layout/visual quality unreviewed |
| Playwright smoke tests | yes | **yes** | Run 1 (cold): 11/14, 3 timeouts. Run 2 (warm): 14/14 |
| `scripts/dev.ps1` | written | **no** | Never run |
| `scripts/test.ps1` | yes | **yes** | Runs contrast, pytest, typecheck, lint (does not run e2e) |

## M1 - Workspace on sample data (written, NOT yet run)

All M1 code was written without the ability to install or run the web app. Only the checks listed in "Evidence so far" were performed. **Treat every row below as unverified until you run `scripts\test.ps1`, `pnpm build` and `pnpm test:e2e`.**

| Item | Implemented | Verified | Note |
|---|---|---|---|
| Data contract (`lib/comparison/types.ts`) | yes | typecheck: no | Shaped for the future API |
| Fictional fixtures: PNG pair + difflib-generated hunks | yes | partly | Generators ran; PNGs inspected by eye; hunk counts self-checked in the script |
| Three-pane workspace, responsive switcher, pane toggles | yes | **no** | Never rendered |
| URL state (`view`, `layout`, `zoom`, `file`) with validation | yes | **no** | Wrapped in `<Suspense>` for static build |
| Image canvas: slider, side-by-side, overlay, fit/100% | yes | **no** | Slider has pointer + keyboard + ARIA |
| Diff viewer: unified + split | yes | split-row pairing: yes (node assertions) | Rendering not run; no syntax highlighting |
| Files list: filter, status filter, listbox keys | yes | **no** | |
| Inspector, context bar, Overview recent comparisons | yes | **no** | Metrics show "Not computed", impact shows "Unknown" |
| Playwright `workspace.spec.ts` (17 tests) | yes | **no** | Never executed |

Evidence so far: syntax-only parse of all 53 TS/TSX files (0 errors); `toSplitRows` asserted in node; fixtures generated. **No typecheck, lint, build or browser run.**

Not in M1 (shown as Planned in the UI): difference view, heatmap, SSIM, changed regions (M2); upload/ZIP/Git import; syntax highlighting; component impact (M6).

## Open issues
1. **First `pnpm build` of M0 failed once** with `Invariant: no direct app page entry found for /_not-found`; the re-run succeeded with no changes. Not reproduced; treated as a flaky-build note, not a blocker.
2. **E2E cold-start timeouts (M0)**: 3 of 14 tests timed out once against `next dev`; the warm re-run passed 14/14. Playwright is now set to 2 workers and a 60 s timeout; the developer reports all tests passing since.
3. **M1 layout unverified**: canvas width with sidebar + two panes at 1280px is the main thing to check by eye (inspector auto-collapses below 1440px).

## Known limitations / technical debt
- M0 is not "done" until open issues 1-2 are resolved, `dev.ps1` has been run, and the UI has been looked at.
- No lockfile committed yet and no `packageManager` field; pin pnpm after confirming `pnpm --version`.
- Python deps are unpinned (`>=`); pytest warns that `starlette.testclient` + `httpx` is deprecated in favour of `httpx2`.
- ESLint 9.39.5 is flagged deprecated by pnpm; `eslint-config-next` 15 constrains the upgrade. Revisit with the Next upgrade.
- `next`/`lucide-react` have newer majors available (Next 16, lucide 1.x); staying on the resolved versions deliberately.
- API types in `lib/api.ts` are hand-written; generate from OpenAPI once more endpoints exist.
- `next/font/google` downloads fonts at build time (needs network on first build); it worked on the developer machine.
- Sidebar Ctrl+B may conflict with a browser shortcut in Firefox.
- Frontend unit-test tooling not chosen yet (Playwright only).

## Unverified external assumptions
- Current Gemini free-tier terms (Phase 5 gate).
