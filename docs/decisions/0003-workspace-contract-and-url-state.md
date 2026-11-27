# ADR 0003: Workspace data contract, structured hunks and URL state

**Status:** accepted (M1)

- **One workspace, two lenses.** `/visual` and `/code` render the same `ComparisonWorkspace`; the selected file persists across lenses so the product does not feel like separate tools.
- **Contract before backend.** `lib/comparison/types.ts` is shaped like the response the API will return. The frontend receives structured hunks (`DiffLine[]`), never raw diff text, so there is no frontend diff parser to get wrong. Sample hunks are generated with `difflib` (`scripts/gen-fixtures.py`).
- **Sample data is always disclosed.** `Comparison.isSample` drives a "Sample data" badge in the context bar, the workspace header and Overview. Analysis values that do not exist yet render as "Not computed · M2", never as numbers; component impact renders as the ADR 0001 grade `Unknown`.
- **State in the URL, not Zustand.** `view`, `layout`, `zoom`, `file` are query params, validated against allowlists. Zustand is added only when shared state outgrows this.
- **New module status `preview`:** UI built on sample data only. `implemented` still means real and verified.
- **Deferred:** syntax highlighting (needs a dependency, e.g. Shiki), pane drag-resize, upload.
