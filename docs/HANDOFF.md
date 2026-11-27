# PixelProof - session handoff

Paste this file (or point Claude at it) at the start of the next chat. Update it at the end of every session.

## Where we are
- Phase 0 (architecture, design direction, MVP, risks, roadmap M0-M8) is done and was reviewed in chat. Key decisions are in `docs/decisions/` and `docs/architecture.md`.
- **M0 scaffold has been written but NOT verified on a real machine.** See `docs/status.md` for the per-item table. Only the colour-token contrast check (50 pairs) has actually been run. Python files were syntax-checked only; frontend was never installed, compiled or rendered.

## First thing to do next session
1. Ask the developer for the output of `scripts\setup.ps1`, `scripts\test.ps1` and `pnpm test:e2e` (in `apps/web`).
2. Fix whatever fails (likely suspects: dependency version ranges in `apps/web/package.json`, Tailwind v4 / `@theme inline` behaviour, ESLint config, `tsc` strictness with `noUncheckedIndexedAccess`).
3. Only then update `docs/status.md` to "verified" and start M1.

## Next milestone: M1 (workspace UI on labelled sample data)
Overview polish, three-pane comparison workspace (changes list / canvas / inspector), screenshot slider + side-by-side + overlay, diff viewer. All data from an isolated `apps/web/fixtures/` module behind a visible "Sample data" badge. Every control functional or marked Planned.

## Decisions already made (do not re-litigate without reason)
- Plain two-app monorepo, no Turborepo/Nx. pnpm for web, venv + pip for API. Windows is the primary dev environment (8 GB RAM, small GPU).
- Tailwind v4; tokens live only in `apps/web/styles/tokens.css` (hex only, validated by `scripts/check-contrast.py`).
- Code-to-visual links are evidence-graded (confirmed / potential / unknown); MVP is screen-level potential/unknown only (ADR 0001). Visual differences are "observations", never "regressions".
- AI is optional, off by default, backend-only keys; Gemini first (verify current free-tier terms before Phase 5).

## Pending approvals (needed later, not for M0/M1)
- Node-based TypeScript analyzer subprocess for React component detection (M5) vs tree-sitter.
- Dependencies: scikit-image (SSIM), tinycss2 (CSS), TanStack Query (M2), Shiki (diff highlighting).
- Manual screenshot upload only in MVP (no automated capture).

## Known gotchas
- The authoring sandbox had no network: nothing was installed or run there beyond Python syntax checks and the contrast script.
- Sidebar `Ctrl+B` may conflict with Firefox's bookmarks shortcut.
- `next/font/google` needs network on first build.

## Working rules (from Project Instructions + Engineering Guide)
Inspect before changing; small increments; never present mock data as analysis; label planned vs implemented vs verified; ask before major architecture changes, paid services, or sending private data externally; do not auto-commit.
