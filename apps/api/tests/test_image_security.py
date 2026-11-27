"""Untrusted-upload handling: the decoder must reject bad input with stable codes."""

import io

import numpy as np
import pytest
from PIL import Image

from pixelproof.security.images import ImageRejected, decode_image

LIMIT = 16_000_000


def encode(img: Image.Image, fmt: str, **kw) -> bytes:
    buf = io.BytesIO()
    img.save(buf, fmt, **kw)
    return buf.getvalue()


def rejected(data: bytes, **kw) -> str:
    with pytest.raises(ImageRejected) as e:
        decode_image(data, max_pixels=kw.get("max_pixels", LIMIT))
    return e.value.code


def test_valid_png_and_jpeg_decode_to_rgb_arrays():
    png = decode_image(encode(Image.new("RGB", (30, 20), (10, 20, 30)), "PNG"), max_pixels=LIMIT)
    assert png.pixels.shape == (20, 30, 3) and png.format == "png"
    assert tuple(png.pixels[0, 0]) == (10, 20, 30)
    jpg = decode_image(encode(Image.new("RGB", (16, 16), "red"), "JPEG"), max_pixels=LIMIT)
    assert jpg.format == "jpeg"


def test_empty_garbage_and_text_are_rejected():
    assert rejected(b"") == "empty_file"
    assert rejected(b"definitely not an image") == "not_an_image"
    assert rejected(b"<svg xmlns='http://www.w3.org/2000/svg'/>") == "not_an_image"


def test_extension_is_irrelevant_only_content_counts():
    # Bytes of a GIF are rejected as an unsupported format no matter what the upload was called.
    assert rejected(encode(Image.new("P", (8, 8)), "GIF")) == "unsupported_format"


def test_truncated_png_is_rejected():
    data = encode(Image.effect_noise((200, 200), 80).convert("RGB"), "PNG")
    assert rejected(data[: len(data) // 2]) == "corrupt_image"


def test_pixel_cap_is_checked_before_decoding():
    big = encode(Image.new("RGB", (4000, 4000), "white"), "PNG")  # tiny file, 16 MP+
    assert len(big) < 200_000
    assert rejected(big, max_pixels=1_000_000) == "image_too_large"


def test_transparency_is_flattened_onto_white():
    rgba = Image.new("RGBA", (4, 4), (255, 0, 0, 0))  # fully transparent red
    d = decode_image(encode(rgba, "PNG"), max_pixels=LIMIT)
    assert d.had_transparency
    assert tuple(d.pixels[0, 0]) == (255, 255, 255)


def test_exif_orientation_is_applied():
    img = Image.new("RGB", (40, 20), "blue")  # landscape
    exif = Image.Exif()
    exif[0x0112] = 6  # rotate 90 degrees clockwise to display
    d = decode_image(encode(img, "JPEG", exif=exif), max_pixels=LIMIT)
    assert (d.width, d.height) == (20, 40)


def test_output_is_contiguous_uint8():
    d = decode_image(encode(Image.new("L", (10, 10), 77), "PNG"), max_pixels=LIMIT)
    assert d.pixels.dtype == np.uint8 and d.pixels.flags["C_CONTIGUOUS"] and d.pixels.shape == (10, 10, 3)
