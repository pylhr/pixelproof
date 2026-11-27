"""Decoding of untrusted image uploads.

This is the only place uploaded image bytes are parsed. It never trusts the file
name, extension or declared content type: format is whatever Pillow actually decodes,
restricted to an allow-list, and the pixel count is checked from the header before
any pixel data is decoded (decompression-bomb guard).
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

ALLOWED_FORMATS = {"PNG": "png", "JPEG": "jpeg", "WEBP": "webp"}


class ImageRejected(ValueError):
    """The upload cannot be used. `code` is stable and safe to show to the client."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class DecodedImage:
    pixels: np.ndarray  # (H, W, 3) uint8 RGB
    format: str  # "png" | "jpeg" | "webp"
    width: int
    height: int
    had_transparency: bool
    was_animated: bool
    byte_size: int


def decode_image(data: bytes, *, max_pixels: int) -> DecodedImage:
    if not data:
        raise ImageRejected("empty_file", "The file is empty.")

    try:
        img = Image.open(io.BytesIO(data))  # reads the header only
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        raise ImageRejected("not_an_image", "The file is not a readable image.") from None

    fmt = ALLOWED_FORMATS.get(img.format or "")
    if fmt is None:
        raise ImageRejected("unsupported_format", "Only PNG, JPEG and WebP images are supported.")

    width, height = img.size
    if width < 1 or height < 1:
        raise ImageRejected("not_an_image", "The image has no pixels.")
    if width * height > max_pixels:
        raise ImageRejected(
            "image_too_large",
            f"The image is {width}x{height} ({width * height / 1e6:.1f} MP); the limit is {max_pixels / 1e6:.0f} MP.",
        )

    animated = getattr(img, "n_frames", 1) > 1
    try:
        img.load()  # raises on truncated or corrupt data
        img = ImageOps.exif_transpose(img)  # apply the orientation tag, drop other metadata
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError):
        raise ImageRejected("corrupt_image", "The image data is corrupt or truncated.") from None

    had_alpha = img.mode in ("RGBA", "LA", "PA") or (img.mode == "P" and "transparency" in img.info)
    if had_alpha:
        rgba = img.convert("RGBA")
        flat = Image.new("RGB", rgba.size, (255, 255, 255))
        flat.paste(rgba, mask=rgba.getchannel("A"))
        rgb = flat
    else:
        rgb = img.convert("RGB")

    pixels = np.ascontiguousarray(np.asarray(rgb, dtype=np.uint8))
    return DecodedImage(
        pixels=pixels,
        format=fmt,
        width=pixels.shape[1],
        height=pixels.shape[0],
        had_transparency=had_alpha,
        was_animated=animated,
        byte_size=len(data),
    )
