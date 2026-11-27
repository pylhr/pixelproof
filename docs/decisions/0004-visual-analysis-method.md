# ADR 0004: Visual analysis method, storage and limits (M2)

**Status:** accepted (M2)

**What a result is.** The analysis reports *observations*: which pixels differ by more than a tolerance, where, and how structurally similar the images are. It never labels a difference a regression, and it never says what caused one.

- **Difference metric:** per-pixel CIE76 colour distance (ΔE in CIELAB) against a tolerance (default 2.3, roughly a just-noticeable difference). Colour conversion runs in strips of 512 rows to bound memory.
- **Noise and antialiasing:** connected groups of changed pixels smaller than `min_area` (default 4) are dropped, **and counted** in `ignored_small_pixels`. This is a heuristic; it does not know whether a glyph edge shifted for a good reason.
- **Regions:** changed pixels are merged when closer than `merge_distance` (default 6 px) and reported as tight bounding boxes with pixel count and mean/max ΔE. At most 200 are returned, largest first; `regions_truncated` says so.
- **SSIM:** implemented with OpenCV Gaussian filtering (11x11, sigma 1.5, K1 0.01, K2 0.03, borders excluded) on luminance. Verified against scikit-image on the sample screenshots (mean equal to about 1e-13) and in a test, so scikit-image is **not** a runtime dependency.
- **Different sizes:** by default nothing is scaled. Both images are anchored top-left on a padded canvas, only the overlap is compared, and the pixels present in one image only are reported. "Resize after to match before" exists but is flagged in the result as unreliable. A matching aspect ratio produces an explicit hint that the pair may differ only by scale.
- **Storage:** one folder per comparison under `PIXELPROOF_DATA_DIR/comparisons/<32-hex id>/`, no database until M6 needs queries. Newest 25 kept. Writes are atomic (temp folder, then rename). Only four rendered PNGs are served; the decoded originals and `result.json` are not.
- **Uploads are untrusted:** type is decided by actually decoding (PNG, JPEG, WebP only), the pixel count is checked from the header before decoding (default cap 16 MP), size is capped while reading (default 15 MB), EXIF orientation is applied and other metadata dropped, transparency is flattened onto white (and a warning says so), client file names are display labels only and never paths, and ids are re-validated on every access.
- **Known limit:** the multipart body is received before the per-file cap is applied. Only requests that declare an oversized `Content-Length` are refused early. Fine for a local tool; revisit before any hosted deployment.
- **Deferred:** UI for ignore areas (the API already accepts them), alignment correction for shifted layouts, progress reporting for very large images.
