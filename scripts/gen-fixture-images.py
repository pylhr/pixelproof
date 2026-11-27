#!/usr/bin/env python3
"""Draw the two FICTIONAL "Acme settings page" screenshots used as M1 sample data.

Output: apps/web/public/fixtures/acme-settings-{before,after}.png (1280x800).

The committed PNGs are the source of truth. Fonts differ between machines, so
re-running this elsewhere will not reproduce identical bytes; only re-run it if you
mean to replace the fixtures. Requires Pillow (a backend dependency from M2).

Deliberate, documented differences (ground truth for testing M2 later):
  1. Primary button: fill #2563eb -> #4f46e5, corner radius 4 -> 12, label "Save" -> "Save changes".
  2. Card: padding 24 -> 32 px; heading size 20 -> 24 px; field gap 16 -> 20 px.
  3. New "Danger zone" card with a "Delete workspace" button below the workspace card.
  4. Legacy beta banner removed from the top of the content area.
Everything else (sidebar, header, inputs) is identical.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 800
OUT = Path(__file__).resolve().parent.parent / "apps" / "web" / "public" / "fixtures"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(str(FONT_DIR / name), size)


def render(after: bool) -> Image.Image:
    img = Image.new("RGB", (W, H), "#f4f5f7")
    d = ImageDraw.Draw(img)

    # Sidebar (identical in both versions)
    d.rectangle([0, 0, 239, H], fill="#111827")
    d.text((28, 26), "Acme", font=font(20, True), fill="#ffffff")
    for i, label in enumerate(["Dashboard", "Projects", "Settings", "Billing"]):
        y = 96 + i * 44
        if label == "Settings":
            d.rounded_rectangle([16, y - 8, 224, y + 28], radius=6, fill="#1f2937")
        d.text((32, y), label, font=font(15), fill="#ffffff" if label == "Settings" else "#9ca3af")

    # Header bar (identical)
    d.rectangle([240, 0, W, 63], fill="#ffffff")
    d.line([240, 63, W, 63], fill="#e5e7eb", width=1)
    d.text((272, 20), "Settings", font=font(18, True), fill="#111827")

    x0, y = 288, 104
    card_w = 720
    pad = 32 if after else 24
    gap = 20 if after else 16
    heading = 24 if after else 20

    if not after:
        d.rounded_rectangle([x0, y, x0 + card_w, y + 40], radius=6, fill="#fef3c7", outline="#fcd34d")
        d.text((x0 + 16, y + 11), "Try the new dashboard beta.", font=font(14), fill="#92400e")
        y += 40 + 24

    card_top = y
    inner = card_top + pad
    # Contents are laid out first so the card height follows the padding.
    cursor = inner
    title_y = cursor
    cursor += heading + (20 if after else 16) + 8
    fields = [("Workspace name", "Acme Inc."), ("Contact email", "team@acme.test")]
    field_boxes = []
    for label, value in fields:
        field_boxes.append((cursor, label, value))
        cursor += 18 + 6 + 40 + gap
    btn_y = cursor
    btn_h = 40
    card_bottom = btn_y + btn_h + pad

    d.rounded_rectangle([x0, card_top, x0 + card_w, card_bottom], radius=8, fill="#ffffff", outline="#e5e7eb")
    d.text((x0 + pad, title_y), "Workspace", font=font(heading, True), fill="#111827")
    for fy, label, value in field_boxes:
        d.text((x0 + pad, fy), label, font=font(13), fill="#374151")
        d.rounded_rectangle([x0 + pad, fy + 24, x0 + card_w - pad, fy + 64], radius=6, fill="#ffffff", outline="#d1d5db")
        d.text((x0 + pad + 12, fy + 35), value, font=font(14), fill="#111827")

    label = "Save changes" if after else "Save"
    bw = 150 if after else 96
    d.rounded_rectangle(
        [x0 + pad, btn_y, x0 + pad + bw, btn_y + btn_h],
        radius=12 if after else 4,
        fill="#4f46e5" if after else "#2563eb",
    )
    tw = d.textlength(label, font=font(14, True))
    d.text((x0 + pad + (bw - tw) / 2, btn_y + 11), label, font=font(14, True), fill="#ffffff")

    if after:
        dz_top = card_bottom + 24
        dz_bottom = dz_top + pad + 48 + 36 + 40 + pad
        d.rounded_rectangle([x0, dz_top, x0 + card_w, dz_bottom], radius=8, fill="#ffffff", outline="#fca5a5")
        d.text((x0 + pad, dz_top + pad), "Danger zone", font=font(24, True), fill="#111827")
        d.text(
            (x0 + pad, dz_top + pad + 48),
            "Deleting a workspace removes all projects and cannot be undone.",
            font=font(13),
            fill="#4b5563",
        )
        by = dz_top + pad + 48 + 36
        d.rounded_rectangle([x0 + pad, by, x0 + pad + 190, by + 40], radius=12, outline="#b91c1c", width=1)
        t = "Delete workspace"
        tw = d.textlength(t, font=font(14, True))
        d.text((x0 + pad + (190 - tw) / 2, by + 11), t, font=font(14, True), fill="#b91c1c")
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, after in (("before", False), ("after", True)):
        p = OUT / f"acme-settings-{name}.png"
        render(after).save(p, optimize=True)
        print(f"wrote {p} ({p.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
