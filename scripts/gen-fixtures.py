#!/usr/bin/env python3
"""Generate apps/web/fixtures/sample-files.generated.ts.

The "Acme" project below is FICTIONAL sample data used to build the M1 workspace UI.
The hunks are real output of Python's difflib over the before/after sources in this
file, not hand-typed. Re-run after editing a source:

    python scripts/gen-fixtures.py

Standard library only.
"""
from __future__ import annotations

import difflib
import json
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "apps" / "web" / "fixtures" / "sample-files.generated.ts"

BUTTON_BEFORE = '''import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx("btn", variant === "primary" && "btn-primary", className)}
      {...props}
    />
  );
}
'''

BUTTON_AFTER = '''import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "danger" && "btn-danger",
        className,
      )}
      {...props}
    />
  );
}
'''

CSS_BEFORE = '''.card {
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.card h2 {
  font-size: 20px;
  margin: 0 0 16px;
}

.field {
  display: grid;
  gap: 6px;
  margin-bottom: 16px;
}

.btn {
  height: 40px;
  padding: 0 20px;
  border: 0;
  font-size: 14px;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
  border-radius: 4px;
}
'''

CSS_AFTER = '''.card {
  padding: 32px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.card h2 {
  font-size: 24px;
  margin: 0 0 20px;
}

.field {
  display: grid;
  gap: 6px;
  margin-bottom: 20px;
}

.btn {
  height: 40px;
  padding: 0 20px;
  border: 0;
  font-size: 14px;
}

.btn-primary {
  background: #4f46e5;
  color: #ffffff;
  border-radius: 12px;
}

.btn-danger {
  background: transparent;
  color: #b91c1c;
  border: 1px solid #b91c1c;
  border-radius: 12px;
}

.card-danger {
  border-color: #fca5a5;
}
'''

SETTINGS_BEFORE = '''import { Button } from "../components/Button";
import { LegacyBanner } from "../components/LegacyBanner";
import "../styles/settings.css";

export function Settings() {
  return (
    <main>
      <LegacyBanner />
      <section className="card">
        <h2>Workspace</h2>
        <label className="field">
          Workspace name
          <input defaultValue="Acme Inc." />
        </label>
        <label className="field">
          Contact email
          <input defaultValue="team@acme.test" />
        </label>
        <Button>Save</Button>
      </section>
    </main>
  );
}
'''

SETTINGS_AFTER = '''import { Button } from "../components/Button";
import { DangerZone } from "../components/DangerZone";
import "../styles/settings.css";

export function Settings() {
  return (
    <main>
      <section className="card">
        <h2>Workspace</h2>
        <label className="field">
          Workspace name
          <input defaultValue="Acme Inc." />
        </label>
        <label className="field">
          Contact email
          <input defaultValue="team@acme.test" />
        </label>
        <Button>Save changes</Button>
      </section>
      <DangerZone />
    </main>
  );
}
'''

DANGER_AFTER = '''import { Button } from "./Button";

export function DangerZone() {
  return (
    <section className="card card-danger">
      <h2>Danger zone</h2>
      <p>Deleting a workspace removes all projects and cannot be undone.</p>
      <Button variant="danger">Delete workspace</Button>
    </section>
  );
}
'''

LEGACY_BEFORE = '''export function LegacyBanner() {
  return <div role="note">Try the new dashboard beta.</div>;
}
'''

PKG_BEFORE = '''{
  "name": "acme-app",
  "version": "1.4.0",
  "dependencies": {
    "clsx": "^2.0.0",
    "react": "^18.3.0"
  }
}
'''

PKG_AFTER = '''{
  "name": "acme-app",
  "version": "1.5.0",
  "dependencies": {
    "clsx": "^2.1.1",
    "react": "^18.3.0"
  }
}
'''

# path, language, before (None = file did not exist), after (None = file was deleted)
FILES = [
    ("package.json", "json", PKG_BEFORE, PKG_AFTER),
    ("src/components/Button.tsx", "tsx", BUTTON_BEFORE, BUTTON_AFTER),
    ("src/components/DangerZone.tsx", "tsx", None, DANGER_AFTER),
    ("src/components/LegacyBanner.tsx", "tsx", LEGACY_BEFORE, None),
    ("src/pages/Settings.tsx", "tsx", SETTINGS_BEFORE, SETTINGS_AFTER),
    ("src/styles/settings.css", "css", CSS_BEFORE, CSS_AFTER),
]

HUNK_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")


def build_hunks(before: str | None, after: str | None):
    a = (before or "").splitlines()
    b = (after or "").splitlines()
    diff = list(difflib.unified_diff(a, b, lineterm="", n=3))
    hunks: list[dict] = []
    cur: dict | None = None
    old_no = new_no = 0
    for line in diff:
        if line.startswith(("---", "+++")) and cur is None:
            continue
        m = HUNK_RE.match(line)
        if m:
            old_start = int(m.group(1))
            old_lines = int(m.group(2)) if m.group(2) is not None else 1
            new_start = int(m.group(3))
            new_lines = int(m.group(4)) if m.group(4) is not None else 1
            cur = {
                "header": line,
                "oldStart": old_start,
                "oldLines": old_lines,
                "newStart": new_start,
                "newLines": new_lines,
                "lines": [],
            }
            hunks.append(cur)
            old_no, new_no = old_start, new_start
            continue
        assert cur is not None, "diff line before first hunk header"
        tag, text = line[:1], line[1:]
        if tag == " ":
            cur["lines"].append({"kind": "context", "oldNo": old_no, "newNo": new_no, "text": text})
            old_no += 1
            new_no += 1
        elif tag == "-":
            cur["lines"].append({"kind": "del", "oldNo": old_no, "newNo": None, "text": text})
            old_no += 1
        elif tag == "+":
            cur["lines"].append({"kind": "add", "oldNo": None, "newNo": new_no, "text": text})
            new_no += 1
        else:
            raise ValueError(f"unexpected diff line: {line!r}")
    return hunks


def main() -> None:
    changes = []
    for path, language, before, after in FILES:
        status = "added" if before is None else "deleted" if after is None else "modified"
        hunks = build_hunks(before, after)
        adds = sum(1 for h in hunks for l in h["lines"] if l["kind"] == "add")
        dels = sum(1 for h in hunks for l in h["lines"] if l["kind"] == "del")
        # Sanity check: replaying the hunks' line counts must match the headers.
        for h in hunks:
            n_old = sum(1 for l in h["lines"] if l["kind"] != "add")
            n_new = sum(1 for l in h["lines"] if l["kind"] != "del")
            assert (n_old, n_new) == (h["oldLines"], h["newLines"]) or h["oldLines"] == 0 or h["newLines"] == 0, path
        changes.append(
            {
                "id": re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-"),
                "path": path,
                "status": status,
                "language": language,
                "additions": adds,
                "deletions": dels,
                "hunks": hunks,
            }
        )
    body = json.dumps(changes, indent=2, ensure_ascii=False)
    OUT.write_text(
        "// GENERATED by scripts/gen-fixtures.py from fictional sample sources. Do not edit by hand.\n"
        'import type { FileChange } from "@/lib/comparison/types";\n\n'
        f"export const SAMPLE_FILES: readonly FileChange[] = {body};\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT} ({len(changes)} files)")
    for c in changes:
        print(f"  {c['status']:<9} +{c['additions']:<3} -{c['deletions']:<3} {c['path']}")


if __name__ == "__main__":
    main()
