#!/usr/bin/env python3
"""Validate WCAG 2.x contrast of the design tokens in apps/web/styles/tokens.css.

Text pairs need 4.5:1; UI-boundary colours (inputs, focus) need 3:1.
Exits non-zero on any failure, so it can run in CI.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

TOKENS = Path(__file__).resolve().parent.parent / "apps/web/styles/tokens.css"


def parse_block(css: str, selector: str) -> dict[str, str]:
    m = re.search(re.escape(selector) + r"\s*\{(.*?)\}", css, re.S)
    if not m:
        raise SystemExit(f"selector not found in tokens.css: {selector}")
    return dict(re.findall(r"--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;", m.group(1)))


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a: str, b: str) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


BACKGROUNDS = ["bg-app", "bg-surface", "bg-raised"]
TEXT_ON_BG = ["text-primary", "text-secondary", "text-muted", "accent", "added", "removed", "modified"]
FILLED_BUTTON = [("accent-fg", "accent"), ("accent-fg", "accent-hover")]
UI_BOUNDARY = [("border-strong", "bg-app"), ("border-strong", "bg-surface")]


def main() -> int:
    css = TOKENS.read_text(encoding="utf-8")
    failures = 0
    for name, selector in (("light", ":root"), ("dark", '[data-theme="dark"]')):
        t = parse_block(css, selector)
        print(f"[{name}]")
        checks = [(fg, bg, 4.5) for fg in TEXT_ON_BG for bg in BACKGROUNDS]
        checks += [(fg, bg, 4.5) for fg, bg in FILLED_BUTTON]
        checks += [(fg, bg, 3.0) for fg, bg in UI_BOUNDARY]
        for fg, bg, minimum in checks:
            r = ratio(t[fg], t[bg])
            ok = r >= minimum
            failures += not ok
            if not ok:
                print(f"  FAIL {fg} on {bg}: {r:.2f} (< {minimum})")
        print(f"  {len(checks)} pairs checked")
    print("FAILED" if failures else "All pairs pass")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
