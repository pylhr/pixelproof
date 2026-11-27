# ADR 0001: Code-to-visual links are evidence-graded

**Status:** accepted (Phase 0)

Static screenshots plus a source diff cannot prove that a code change caused a visual change. Every link between a change and a screen/region is therefore stored with a grade - `confirmed`, `potential` or `unknown` - and typed evidence (import path, CSS selector match, changed lines). The MVP can produce `potential` and `unknown` at screen level only; `confirmed` requires runtime DOM instrumentation. The UI never displays an unevidenced "caused by". Visual differences are called *observations*, never *regressions*.
