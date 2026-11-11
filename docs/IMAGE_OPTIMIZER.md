# Image Optimizer — Technical Deep Dive

This document explains how the PictoLite image optimizer engine works under the hood.
It covers every code path, the rationale behind each design decision, and answers the question of what happens to image metadata during optimization.

Source file: [useImageOptimizer.ts](../app/composables/useImageOptimizer.ts).
The [agent reference](../.agents/docs/IMAGE_OPTIMIZER.md) provides focused invariants and review criteria for the same implementation.

---

## Table of Contents

1. [High-level overview](#1-high-level-overview)
2. [Key constants](#2-key-constants)
3. [Entry point: `optimizeImage()`](#3-entry-point-optimizeimage)
4. [Pipeline A — JPEG / WebP (lossy path)](#4-pipeline-a--jpeg--webp-lossy-path)
5. [Pipeline B — PNG → WebP conversion](#5-pipeline-b--png--webp-conversion)
6. [Pipeline C — PNG → PNG optimization](#6-pipeline-c--png--png-optimization)
7. [Shared helper: `compressImageAtScale()`](#7-shared-helper-compressimageatscale)
8. [Shared helper: `computeTargetSize()`](#8-shared-helper-computetargetsize)
9. [Shared helper: `chooseBest()`](#9-shared-helper-choosebest)
10. [Shared helper: `closeBitmap()`](#10-shared-helper-closebitmap)
11. [What happens to image metadata?](#11-what-happens-to-image-metadata)
12. [Full decision flowchart](#12-full-decision-flowchart)

---

## 1. High-level overview

PictoLite compresses images entirely **in the browser**, with no server round-trip for image processing.
The current implementation is called by the uploader; it does not create a Web Worker.
It uses two browser-native APIs:

- **`OffscreenCanvas`** — an off-screen canvas that can render and encode images without touching the DOM.
- **`createImageBitmap()`** — decodes an image source (File, Blob) into a pixel buffer.

The optimizer handles **three fundamentally different cases**, each with its own pipeline:

| Input format | `shouldConvertToWebp` | Pipeline used                                            |
| ------------ | --------------------- | -------------------------------------------------------- |
| JPEG or WebP | `false`               | **A** — lossy binary-search compression                  |
| JPEG or WebP | `true`                | **A** — lossy binary-search compression (output as WebP) |
| PNG          | `true`                | **B** — single-pass PNG → WebP conversion                |
| PNG          | `false`               | **C** — progressive PNG compression with downscaling     |

---

## 2. Key constants

```ts
const BINARY_SEARCH_ITERATIONS = 6          // Max quality probes per binary-search pass
const QUALITY_LOWER_BOUND = 0.3             // Min encoder quality (30%)
const QUALITY_UPPER_BOUND = 0.92            // Max encoder quality (92%)
const MAX_INITIAL_COMPRESSION_RATIO = 1 
const DOWNSCALE_STEP_FACTOR = 0.85          // Progressive scale reduction factor (×0.85 per attempt)
const MIN_ALLOWED_SCALE = 0.05              // Absolute minimum scale on the final forced attempt
const PNG_PASSTHROUGH_THRESHOLD = 1_000_000 // PNGs ≤ 1 MB are returned untouched
```

**Upper quality bound:** 0.92 is the application's configured JPEG/WebP ceiling and PNG-to-WebP encode quality.
It is not a universal browser cap.
**Lower quality bound:** 0.3 limits the JPEG/WebP search; actual visual quality depends on the image and encoder.
PNG encoding does not use this variable-quality control.
See the [HTML bitmap serialization rules](https://html.spec.whatwg.org/multipage/canvas.html#serialising-bitmaps-to-a-file) for the browser contract.

---

## 3. Entry point: `optimizeImage()`

```ts
export async function optimizeImage(
  inputFile: File,
  shouldConvertToWebp: boolean
): Promise<FileResult>
```

This is the single public function exposed by the composable.
It:

1. Reads the input MIME type (`image/png`, `image/jpeg`, `image/webp`, …).
2. **Branches immediately on PNG** — PNGs use separate conversion and optimization paths (Pipelines B or C).
   Downscaling can affect text readability; neither path guarantees visually lossless output.
3. For all other formats (JPEG, WebP), it decodes the file with `createImageBitmap`, draws it onto an `OffscreenCanvas` at full resolution, computes a target size, and runs a binary search over the quality axis to meet that target (Pipeline A).
4. Always returns `{ file: Blob, success: boolean }`.
   A caught error or null candidate produces `success: false` with the original unchanged; successful fallbacks can also return the original.

**The `chooseBest()` guarantee** compares each accepted candidate's size to the original and selects it only when strictly smaller.
PNG passthrough and exhausted optimization paths return the original directly.
Across all paths, **the returned file is never larger than the input**.
Successful processing does not guarantee conversion, reduction or visual fidelity.

---

## 4. Pipeline A — JPEG / WebP (lossy path)

**Triggered when:** the input is JPEG or WebP (or any non-PNG format).

### Step-by-step

```text
Input file
    │
    ▼
createImageBitmap(inputFile)       ← decode pixels into a GPU-friendly buffer
    │
    ▼
OffscreenCanvas(width, height)     ← create an off-screen canvas at full resolution
    │
    ▼
ctx.drawImage(imageBitmap)         ← paint decoded pixels onto the canvas
    │
    ▼
computeTargetSize(originalSize)    ← pick a size target based on the input size
    │
    ▼
Binary search over quality ∈ [0.3, 0.92] for 6 iterations
    │   • mid = (low + high) / 2
    │   • encode at mid → candidateBlob
    │   • if candidateBlob.size > targetSize → high = mid (quality too high, try lower)
    │   • else                               → low  = mid (quality acceptable, try higher)
    │   • track the smallest blob seen so far as bestBlob
    │   • early exit when bestBlob ≤ targetSize AND range < 0.01
    │
    ▼
chooseBest(bestBlob, inputFile, originalSize)
    │
    ▼
FileResult { file, success }
```

### Why binary search over quality?

The search assumes that lower quality generally reduces size, but the actual curve depends on image content and the browser encoder.
Binary search narrows the quality interval with a fixed probe budget rather than testing every quality value.
The implementation keeps the smallest observed blob, not necessarily the highest-quality blob that fits the target.

With 6 iterations the quality range narrows from 0.62 to just 0.62 / 2⁶ ≈ 0.01, which is precise enough for practical use.

### The non-lossy fallback inside Pipeline A

The non-PNG branch has a plain re-encode guard when its selected output MIME is not JPEG or WebP.
In that case the image is simply drawn to canvas and re-encoded at the default quality with no binary search.
`chooseBest` is still applied.
A missing 2D context on the lossy branch leaves its candidate null; a thrown decode or encode error reaches the public fallback.

---

## 5. Pipeline B — PNG → WebP conversion

**Triggered when:** the input is PNG and `shouldConvertToWebp = true`.

### Why a dedicated path?

PNG → WebP is a **lossless-to-lossy format change**.
The goal here is not to hit a target byte-size but to encode at the configured upper quality bound while retaining the original dimensions.
Applying the same binary-search size-targeting logic would be overly aggressive on what is often a UI screenshot, diagram, or text-heavy image.

### Step-by-step

```text
Input PNG file
    │
    ▼
createImageBitmap(inputFile)         ← decode PNG pixels (including transparency)
    │
    ▼
OffscreenCanvas(width, height)       ← full-resolution canvas
    │
    ▼
ctx.drawImage(imageBitmap)
    │
    ▼
canvas.convertToBlob({
  type: 'image/webp',
  quality: QUALITY_UPPER_BOUND       ← single high-quality encode (0.92)
})
    │
    ▼
createImageBitmap(blob)              ← verify-decode: can the browser re-open this WebP?
    │   if decode throws → current code retains blob and falls through
    │   if encode throws → blob stays null
    │
    ▼
chooseBest(blob, inputFile, inputFile.size)
    │
    ▼
FileResult { file, success }
```

### The verify-decode step

After encoding, the blob is decoded again with `createImageBitmap` to check whether the output can be opened.
The current verification catch retains `blob` instead of clearing it.
A smaller candidate can therefore be returned with `success: true` even after verification fails.
An encoding failure leaves `blob` null, so `chooseBest(null, ...)` returns the original with `success: false`.
This is a source limitation rather than a safe-rejection guarantee.
The size fallback can also keep the original PNG when the WebP candidate is larger.
This conversion path runs even for PNGs at or below 1 MB.

---

## 6. Pipeline C — PNG → PNG optimization

**Triggered when:** the input is PNG and `shouldConvertToWebp = false`.

This is the most complex pipeline in the codebase, it separates PNG resizing from the JPEG/WebP quality search.
It exists because Canvas-based PNG re-encoding (which is always lossy at the pixel level) is often *worse* than the original for small, well-optimised PNGs — especially screenshots, text, and flat colour graphics.
Canvas PNG re-encoding can produce a larger file, while downscaling changes pixels and can reduce text or edge readability.
PNG encoding itself is not a lossy quality slider.

### The 1 MB passthrough

```ts
if (inputFile.size <= PNG_PASSTHROUGH_THRESHOLD) {
  return { file: inputFile, success: true }
}
```

PNGs at or below 1,000,000 bytes are returned **as-is, without decoding or encoding** when conversion is disabled.
This avoids unnecessary re-encoding of small files and preserves their original pixels and metadata.
Canvas output is not guaranteed to improve an already compressed PNG.

- Small PNGs are typically UI screenshots, icons, or diagrams. They already use DEFLATE compression efficiently.
- Running them through an OffscreenCanvas draw cycle forces the browser to re-rasterise the image and re-compress.
    This frequently produces a *larger* file because the Canvas 2D context normalises pixel data (premultiplied alpha, sRGB conversion) and the PNG encoder has no access to the original DEFLATE dictionary.

### Conservative parameters

PNG uses different constants to the lossy path:

| Parameter                         | Lossy default | PNG value | Reason                                                                                                        |
| --------------------------------- | ------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| `localMinInitialCompressionRatio` | (n/a)         | `0.6`     | Initial scale floor before the attempt multiplier (Never start below 60% dimensions)                          |
| `localMaxDownscaleAttempts`       | (n/a)         | `3`       | Inclusive upper index: four loop attempts (Limit downscaling aggressiveness)                                  |
| `localQualityLower`               | `0.3`         | `0.5`     | Search argument; PNG encoding ignores variable quality (Higher floor to reduce text artefacts)                |
| `localFinalForcedQuality`         | (n/a)         | `0.35`    | Forced encode argument; PNG reduction depends on pixels and dimensions (Less aggressive last resort)          |

### Step-by-step

```text
Input PNG (> 1 MB)
    │
    ▼
computeTargetSize(inputFile.size)   ← determine the byte budget
    │
    ▼
createImageBitmap(inputFile)        ← decode once, reuse for all attempts
    │
    ▼
Progressive loop (4 attempts, index 0..3):
    │
    │  scaleFactor = clamp(sqrt(targetSize / fileSize), 0.6, 1.0) × 0.85^attemptIndex
    │      → attempt 0: ~original sqrt ratio     (gentle start)
    │      → attempt 1: × 0.85                   (15% smaller)
    │      → attempt 2: × 0.85²                  (27% smaller total)
    │      → attempt 3: × 0.85³                  (39% smaller total)
    │
    │  compressImageAtScale(...)
    │      → draws at scaled dimensions
    │      → binary-searches quality ∈ [0.5, 0.92]
    │      → returns blob if it fits under targetSize, else null
    │
    │  if blob returned → chooseBest → return immediately (early exit)
    │
    ▼
Final forced attempt (if all 4 progressive attempts failed):
    │
    │  finalScaleFactor = max(0.05, sqrt(targetSize/fileSize) × 0.85⁴)
    │  Draw at finalScaleFactor dimensions
    │  Encode at quality 0.35 (hard-coded, no binary search)
    │  Verify-decode with createImageBitmap
    │  If verify passes AND blob < inputFile.size → chooseBest → return
    │
    ▼
If everything failed → return { file: inputFile, success: true }
    (original file returned, no corruption)
```

### Why the scale factor formula uses sqrt?

The formula uses image **area** as a size heuristic (width × height) and derives linear dimensions from the **square root** of the target/input ratio.
For example, a 60% area ratio gives a linear scale of √0.6 ≈ 0.775 (it will reduce a 4 MB file to 2.4 MB).
Compression and image content still affect the actual byte result.
The initial 0.6 floor is applied before the 0.85 multiplier, so later attempts can fall below 60% dimensions.

### Early-exit semantics

The loop exits on the first successful result.
This means if the mildest attempt (attempt 0) already produces a file within budget, the more aggressive attempts are never run.
This deliberately minimises dimension loss.

---

## 7. Shared helper: `compressImageAtScale()`

```ts
declare function compressImageAtScale(
  originalWidth: number,
  originalHeight: number,
  scaleFactor: number,
  imageBitmap: ImageBitmap,
  outputMimeType: string,
  maxAllowedFileSize: number,
  qualityLowerBound: number,
  qualityUpperBound: number
): Promise<Blob | null>
```

Used only inside Pipeline C.
It:

1. Computes `targetWidth = round(originalWidth × scaleFactor)`, clamped to ≥ 1.
2. Creates a *new* `OffscreenCanvas` at the scaled size.
3. Draws the bitmap at the scaled dimensions using the browser's image-smoothing implementation (the browser performs bilinear / bicubic downscaling).
4. Runs a **6-iteration binary search**, over quality to find the highest quality, retaining the last candidate that fits under `maxAllowedFileSize`.
5. Returns that qualifying `Blob`, or `null` if no probe fits.

The code passes quality values for PNG, but the browser's PNG encoder does not use the variable-quality argument.

The null return signals to the caller (Pipeline C's loop) that this scale factor is still not aggressive enough — the caller should continue to the next, more downscaled attempt.

---

## 8. Shared helper: `computeTargetSize()`

This function translates a raw file size into a target byte budget.
It uses tiered ratios:

| Input range | Target ratio     | Absolute floor |
| ----------- | ---------------- | -------------- |
| ≤ 200 KB    | 100% (no change) | —              |
| ≤ 1 MB      | 90%              | —              |
| ≤ 5 MB      | 60%              | —              |
| ≤ 10 MB     | 25%              | 1 MB           |
| ≤ 30 MB     | 15%              | 1.5 MB         |
| > 30 MB     | 12%              | 2 MB           |

**Why not a single ratio?**
Because compression efficiency varies non-linearly with file size.
A 200 KB JPEG is typically already fairly compressed — pushing it harder yields little benefit and visible quality loss.
A 20 MB RAW-exported JPEG, on the other hand, almost certainly contains redundant data that can be removed with minimal visual impact.

These thresholds use decimal units: 1 MB means 1,000,000 bytes.
The tiered ratios request stronger reduction for larger inputs; floors limit the requested byte budget.
They do not guarantee target attainment or visually acceptable output for every image.

For JPEG/WebP inputs at or below 200 KB, a 100% target still enters the encode/search pipeline.
It is not an early passthrough.
The original is retained if no candidate is smaller.

**Why absolute floors for large files?**
Without a floor, a 10 MB photo with a 25% target would compress to 2.5 MB — reasonable.
But the floor at 1 MB exists because the binary-search quality parameter cannot compensate for extreme file diversity: some 10 MB images compress well to 1 MB, others would be destroyed.
The floor prevents the engine from targeting sizes so small that all results would be visually unacceptable.

---

## 9. Shared helper: `chooseBest()`

```ts
declare function chooseBest(
  candidate: Blob | null,
  file: File,
  originalSize: number
): Promise<FileResult>
```

The safety net for the entire optimizer:

- If `candidate` is `null` → return original file with `success: false`.
- If `candidate.size < originalSize` → return the compressed blob with `success: true`.
- Otherwise → return the original file with `success: true`.

This invariant ensures **compression can never make the returned file larger than the input**.
The `success` flag does not indicate whether compression or conversion actually changed the returned file.
A non-null candidate can produce `success: true` while the original is retained.
A null candidate produces `success: false`; the public catch also returns the original on errors.

---

## 10. Shared helper: `closeBitmap()`

```ts
declare function closeBitmap(bitmap: ImageBitmap): void
```

`ImageBitmap` objects hold decoded image resources (GPU-side texture memory).
The browser does not automatically free them when the JavaScript reference is garbage-collected (at least not promptly).
Calling `.close()` releases those resources (the GPU memory) explicitly rather than relying on later garbage collection.
The helper checks whether `.close()` exists and tolerates a closing error.
Original bitmaps are closed on normal completion paths; verification bitmaps are not retained or explicitly closed, and some exceptional exits can bypass cleanup.

---

## 11. What happens to image metadata?

> Source metadata is not copied into a new Canvas encode, but an unchanged returned original retains all of its bytes.

### What metadata is affected?

The table describes a newly encoded candidate that is actually selected for download.

| Metadata type      | Examples                                                 | Source information copied?                                                                  |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| EXIF               | Camera model, focal length, aperture, ISO, shutter speed | ❌ No                                                                                       |
| GPS / geolocation  | Latitude, longitude, altitude                            | ❌ No                                                                                       |
| IPTC               | Copyright notice, author, caption, keywords              | ❌ No                                                                                       |
| XMP                | Editing history, creator tool, description               | ❌ No                                                                                       |
| ICC colour profile | sRGB, Display P3, AdobeRGB                               | ❌ Original profile is not copied; output can include a profile for the Canvas colour space |
| Thumbnail          | Embedded JPEG preview                                    | ❌ No                                                                                       |
| Orientation flag   | EXIF rotation tag (e.g. "rotate 90°")                    | ⚠️ Source tag is not copied; decoding can apply orientation to the pixels                   |

The original-file fallback and non-conversion small-PNG passthrough preserve source metadata.
Do not describe all optimizer downloads as stripped of GPS or other metadata.

### Why is metadata lost?

The root cause is the **HTML Canvas pipeline**.
The Canvas pipeline creates an encoded image from decoded pixels instead of copying source metadata containers.
The browser can include output metadata of its own.

```text
Original file (bytes)
    │   Contains: pixel data + EXIF block + GPS + ICC profile + XMP block + ...
    │
    ▼
createImageBitmap(file)
    │   The browser decodes the file and produces an ImageBitmap.
    │   An ImageBitmap is a pure pixel grid — width × height × RGBA.
    │   ALL non-pixel data (EXIF, ICC, IPTC, XMP) is discarded at this step.
    │   The browser keeps the pixel data only.
    │
    ▼
ctx.drawImage(imageBitmap, 0, 0)
    │   Draw into the Canvas pixel buffer (Canvas 2D context).
    │   The context stores raw premultiplied-alpha RGBA pixels.
    │   Downscaling or colour conversion can affect pixels.
    │
    ▼
canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
    │   Encode Canvas pixels as a new, bare JPEG/PNG/WebP image from scratch.
    │   Source EXIF/GPS/IPTC/XMP/thumbnail containers are not copied.
    │   The output blob contains pixel data (colour-profile or resolution) and format headers only.
    │
    ▼
Output blob candidate (bytes)
    │
    ▼
chooseBest(candidate, originalFile, originalSize)
    ├── candidate smaller → return new encoded bytes.
    └── candidate not smaller → return original bytes, including metadata.
```

### The EXIF orientation edge case

EXIF orientation describes how viewers should rotate or reflect an image.
EXIF stores a rotation tag (values 1–8) so that cameras can save images in their native sensor orientation and let viewers rotate them on display.
When `createImageBitmap()` decodes a JPEG, most modern browsers **apply the rotation** to the pixel grid before returning the `ImageBitmap`.
The [WHATWG Fetch / ImageBitmap specification](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-createimagebitmap) defines decoding and orientation options.
The code uses the browser's default decoding behavior and does not copy the source EXIF tag into the new blob.
Check representative rotated and mirrored images in the target browser; mocked dimensions do not prove correct orientation.

This means:

- The pixel content is correct (the image appears right-way-up).
- But the output blob has no EXIF block and therefore **no orientation tag at all** (implicitly `1` — no rotation).

In practice, this is the correct and desirable behaviour: the output file is self-contained and displays correctly without relying on viewer support for EXIF orientation.

### What about ICC colour profiles?

A decoded bitmap and Canvas have colour-space information.
ICC colour profiles describe the colour space of an image (sRGB, Display P3, AdobeRGB, etc.).
When `createImageBitmap()` decodes an image, the browser *may* apply colour-space conversion to normalise pixels to sRGB (the Canvas native colour space) — but this depends on the browser and
device.
In any case, the ICC profile block is not carried through to `convertToBlob`, and the output is always assumed to be standard sRGB.
The code does not preserve the original embedded ICC profile as a source metadata block.

For web usage this is generally fine.
For professional photography workflows where colour accuracy is critical, this optimizer is not the right tool.

The browser may encode a profile describing the output Canvas colour space, as defined by the [HTML serialization rules](https://html.spec.whatwg.org/multipage/canvas.html#serialising-bitmaps-to-a-file).
Do not assume every re-encoded image lacks a profile or that every output reproduces the original colour exactly.
Compare colour-sensitive images in the intended browser and display environment.

### Privacy implication

A newly encoded result does not copy source GPS metadata through this code.
That does not make the optimizer a guaranteed metadata-removal tool, because successful processing can still return the original file.
Stripping EXIF GPS data is actually a **privacy benefit** in most consumer use cases: users sharing optimised images on social media or messaging apps will not accidentally expose their
geolocation.
Inspect the actual downloaded output when metadata removal is a requirement.

---

## 12. Full decision flowchart

```text
optimizeImage(file, shouldConvertToWebp)
│
├─ file.type === 'image/png' ?
│   │
│   ├─ YES, shouldConvertToWebp === true
│   │       └──► PIPELINE B: convertPngToWebp()
│   │               decode → draw → single WebP encode at 0.92
│   │               verify-decode (current failure catch retains blob)
│   │               chooseBest → return
│   │
│   └─ YES, shouldConvertToWebp === false
│           └──► PIPELINE C: optimizePngImage()
│                   file ≤ 1 MB → return as-is (passthrough)
│                   file > 1 MB:
│                     decode once
│                     progressive loop (4 attempts, indices 0..3):
│                       scaleFactor = clamp(sqrt(target/size), 0.6, 1) × 0.85^i
│                       compressImageAtScale → binary-search quality [0.5, 0.92]
│                       if result fits → chooseBest → return early
│                     final forced attempt:
│                       scale = max(0.05, …)
│                       encode at quality 0.35
│                       verify-decode
│                       if OK → chooseBest → return
│                     all failed → return original as-is
│
└─ file.type !== 'image/png' (JPEG, WebP, …)
        └──► PIPELINE A: lossy binary-search
                decode → draw at full size
                outputMime = 'image/webp' if shouldConvertToWebp else inputMime
                if outputMime is not lossy:
                  plain re-encode → chooseBest → return
                targetSize = computeTargetSize(originalSize)
                binary search quality [0.3, 0.92] for 6 iterations:
                  track bestBlob (smallest so far)
                  early exit when bestBlob ≤ target AND range < 0.01
                chooseBest(bestBlob, …) → return
```

---
