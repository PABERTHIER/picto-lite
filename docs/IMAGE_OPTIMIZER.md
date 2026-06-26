# Image Optimizer — Technical Deep Dive

This document explains how the PictoLite image optimizer engine works under the hood. It covers every
code path, the rationale behind each design decision, and answers the question of what happens to
image metadata during optimization.

Source file: `app/composables/useImageOptimizer.ts`

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

PictoLite compresses images entirely **in the browser**, with no server round-trip. The entire pipeline
runs inside a [Web Worker-compatible](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
environment using two browser-native APIs:

- **`OffscreenCanvas`** — an off-screen canvas that can render and encode images without touching the DOM.
- **`createImageBitmap()`** — decodes an image source (File, Blob) into a pixel buffer.

The optimizer handles **three fundamentally different cases**, each with its own pipeline:

| Input format | `shouldConvertToWebp` | Pipeline used |
|---|---|---|
| JPEG or WebP | `false` | **A** — lossy binary-search compression |
| JPEG or WebP | `true` | **A** — lossy binary-search compression (output as WebP) |
| PNG | `true` | **B** — single-pass PNG → WebP conversion |
| PNG | `false` | **C** — progressive PNG compression with downscaling |

---

## 2. Key constants

```ts
BINARY_SEARCH_ITERATIONS = 6     // Max quality probes per binary-search pass
QUALITY_LOWER_BOUND       = 0.3  // Min encoder quality (30%)
QUALITY_UPPER_BOUND       = 0.92 // Max encoder quality (92%)
DOWNSCALE_STEP_FACTOR     = 0.85 // Progressive scale reduction factor (×0.85 per attempt)
MIN_ALLOWED_SCALE         = 0.05 // Absolute minimum scale on the final forced attempt
PNG_PASSTHROUGH_THRESHOLD = 1 MB // PNGs ≤ 1 MB are returned untouched
```

**Why 0.92 as the upper bound?** Most browsers internally cap the quality parameter for JPEG and
WebP encoding at 0.92, so asking for `1.0` does not actually produce a lossless result — it just
wastes bytes. Using 0.92 as the ceiling avoids that inefficiency.

**Why 0.3 as the lower bound?** Below quality 0.3, blocking artefacts become clearly visible to
the naked eye on most photographic content. This is the floor below which no encode result is
ever accepted.

---

## 3. Entry point: `optimizeImage()`

```ts
export async function optimizeImage(
  inputFile: File,
  shouldConvertToWebp: boolean
): Promise<FileResult>
```

This is the single public function exposed by the composable. It:

1. Reads the input MIME type (`image/png`, `image/jpeg`, `image/webp`, …).
2. **Branches immediately on PNG** — PNGs go through a separate, conservative pipeline that
   preserves text readability and alpha transparency (Pipelines B or C).
3. For all other formats (JPEG, WebP), it decodes the file with `createImageBitmap`, draws it
   onto an `OffscreenCanvas` at full resolution, computes a target size, and runs a binary
   search over the quality axis to meet that target (Pipeline A).
4. Always returns `{ file: Blob, success: boolean }`. A `success: false` means an unrecoverable
   error occurred and the original file is returned unchanged.

**The `chooseBest()` guarantee** — regardless of which pipeline runs, the final step always
calls `chooseBest()`, which compares the compressed candidate's size to the original and
returns whichever is smaller. This means **compression can never make a file larger**.

---

## 4. Pipeline A — JPEG / WebP (lossy path)

**Triggered when:** the input is JPEG or WebP (or any non-PNG format).

### Step-by-step

```
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
FileResult { file, success: true }
```

### Why binary search over quality?

The relationship between quality and output file size is **monotone but non-linear** — it varies
wildly depending on image content (flat illustrations compress much more than noisy photos at the
same quality level). A binary search finds the sweet spot without knowing the curve shape in
advance, and converges in O(log N) calls instead of a linear scan.

With 6 iterations the quality range narrows from 0.62 to just 0.62 / 2⁶ ≈ 0.01, which is
precise enough for practical use.

### The non-lossy fallback inside Pipeline A

There is a guard inside Pipeline A for any non-lossy MIME type that somehow reaches this branch
(currently unused, but defensive). In that case the image is simply drawn to canvas and
re-encoded at the default quality with no binary search. `chooseBest` is still applied.

---

## 5. Pipeline B — PNG → WebP conversion

**Triggered when:** the input is PNG and `shouldConvertToWebp = true`.

### Why a dedicated path?

PNG → WebP is a **lossless-to-lossy format change**. The goal here is not to hit a target
byte-size but to produce the highest quality WebP possible. Applying the same binary-search
size-targeting logic would be overly aggressive on what is often a UI screenshot, diagram, or
text-heavy image.

### Step-by-step

```
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
    │   if decode throws → blob = null (fall through to chooseBest with null)
    │
    ▼
chooseBest(blob, inputFile, inputFile.size)
    │
    ▼
FileResult { file, success: true }
```

### The verify-decode step

After encoding, the blob is immediately decoded again with `createImageBitmap`. This guards
against browsers that silently produce a corrupt or empty blob on `convertToBlob`. If the
verify fails, `blob` is set to `null`, and `chooseBest(null, ...)` returns the original file
with `success: false`.

---

## 6. Pipeline C — PNG → PNG optimization

**Triggered when:** the input is PNG and `shouldConvertToWebp = false`.

This is the most complex pipeline in the codebase. It exists because Canvas-based PNG
re-encoding (which is always lossy at the pixel level) is often *worse* than the original
for small, well-optimised PNGs — especially screenshots, text, and flat colour graphics.

### The 1 MB passthrough

```ts
if (inputFile.size <= PNG_PASSTHROUGH_THRESHOLD) {
  return { file: inputFile, success: true }
}
```

PNGs under 1 MB are returned **as-is, without any processing**. The reasoning:

- Small PNGs are typically UI screenshots, icons, or diagrams. They already use DEFLATE compression
  efficiently.
- Running them through an OffscreenCanvas draw cycle forces the browser to re-rasterise the image
  and re-compress, which frequently produces a *larger* file because the Canvas 2D context
  normalises pixel data (premultiplied alpha, sRGB conversion) and the PNG encoder has no access
  to the original DEFLATE dictionary.

### Conservative parameters

PNG uses different constants to the lossy path:

| Parameter | Lossy default | PNG value | Reason |
|---|---|---|---|
| `localMinInitialCompressionRatio` | (n/a) | `0.6` | Never start below 60% dimensions |
| `localMaxDownscaleAttempts` | (n/a) | `3` | Limit downscaling aggressiveness |
| `localQualityLower` | `0.3` | `0.5` | Higher floor to reduce text artefacts |
| `localFinalForcedQuality` | (n/a) | `0.35` | Less aggressive last resort |

### Step-by-step

```
Input PNG (> 1 MB)
    │
    ▼
computeTargetSize(inputFile.size)   ← determine the byte budget
    │
    ▼
createImageBitmap(inputFile)        ← decode once, reuse for all attempts
    │
    ▼
Progressive loop (up to 3 attempts, index 0..2):
    │
    │  scaleFactor = clamp(sqrt(targetSize / fileSize), 0.6, 1.0) × 0.85^attemptIndex
    │      → attempt 0: ~original sqrt ratio     (gentle start)
    │      → attempt 1: × 0.85                   (15% smaller)
    │      → attempt 2: × 0.85²                  (27% smaller total)
    │
    │  compressImageAtScale(...)
    │      → draws at scaled dimensions
    │      → binary-searches quality ∈ [0.5, 0.92]
    │      → returns blob if it fits under targetSize, else null
    │
    │  if blob returned → chooseBest → return immediately (early exit)
    │
    ▼
Final forced attempt (if all 3 progressive attempts failed):
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

File size scales roughly with the **area** of the image (width × height). To hit a target byte
budget you need to scale the linear dimensions by the **square root** of the size ratio. For
example, to reduce a 4 MB file to 2.4 MB (60%), you scale each dimension by √0.6 ≈ 0.775.

### Early-exit semantics

The loop exits on the first successful result. This means if the mildest attempt (attempt 0)
already produces a file within budget, the more aggressive attempts are never run. This
deliberately minimises dimension loss.

---

## 7. Shared helper: `compressImageAtScale()`

```ts
async function compressImageAtScale(
  originalWidth, originalHeight, scaleFactor,
  imageBitmap, outputMimeType, maxAllowedFileSize,
  qualityLowerBound, qualityUpperBound
): Promise<Blob | null>
```

Used only inside Pipeline C. It:

1. Computes `targetWidth = round(originalWidth × scaleFactor)`, clamped to ≥ 1.
2. Creates a *new* `OffscreenCanvas` at the scaled size.
3. Draws the bitmap at the scaled dimensions (the browser performs bilinear / bicubic downscaling).
4. Runs a **6-iteration binary search** over quality to find the highest quality that fits under
   `maxAllowedFileSize`.
5. Returns the best qualifying `Blob`, or `null` if no quality value produced a small-enough result.

The null return signals to the caller (Pipeline C's loop) that this scale factor is still not
aggressive enough — the caller should continue to the next, more downscaled attempt.

---

## 8. Shared helper: `computeTargetSize()`

This function translates a raw file size into a target byte budget. It uses tiered ratios:

| Input range | Target ratio | Absolute floor |
|---|---|---|
| ≤ 200 KB | 100% (no change) | — |
| ≤ 1 MB | 90% | — |
| ≤ 5 MB | 60% | — |
| ≤ 10 MB | 25% | 1 MB |
| ≤ 30 MB | 15% | 1.5 MB |
| > 30 MB | 12% | 2 MB |

**Why not a single ratio?** Because compression efficiency varies non-linearly with file size.
A 200 KB JPEG is typically already fairly compressed — pushing it harder yields little benefit
and visible quality loss. A 20 MB RAW-exported JPEG, on the other hand, almost certainly contains
redundant data that can be removed with minimal visual impact.

**Why absolute floors for large files?** Without a floor, a 10 MB photo with a 25% target would
compress to 2.5 MB — reasonable. But the floor at 1 MB exists because the binary-search quality
parameter cannot compensate for extreme file diversity: some 10 MB images compress well to 1 MB,
others would be destroyed. The floor prevents the engine from targeting sizes so small that all
results would be visually unacceptable.

---

## 9. Shared helper: `chooseBest()`

```ts
async function chooseBest(
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
The `success` flag indicates whether compression actually happened, not whether the function
encountered an error (a `success: true` result can contain the original file if compression
would have increased its size).

---

## 10. Shared helper: `closeBitmap()`

```ts
function closeBitmap(bitmap: ImageBitmap): void
```

`ImageBitmap` objects hold GPU-side texture memory. The browser does not automatically free them
when the JavaScript reference is garbage-collected (at least not promptly). Calling `.close()`
explicitly releases the GPU memory immediately. The try/catch guard is defensive — some older
environments may not implement `.close()`.

---

## 11. What happens to image metadata?

> **Short answer: all metadata is permanently lost during optimization.**

### What metadata is affected?

| Metadata type | Examples | Preserved? |
|---|---|---|
| EXIF | Camera model, focal length, aperture, ISO, shutter speed | ❌ No |
| GPS / geolocation | Latitude, longitude, altitude | ❌ No |
| IPTC | Copyright notice, author, caption, keywords | ❌ No |
| XMP | Adobe editing history, creator tool, description | ❌ No |
| ICC colour profile | sRGB, Display P3, AdobeRGB | ❌ No |
| Thumbnail | Embedded JPEG preview | ❌ No |
| Orientation flag | EXIF rotation tag (e.g. "rotate 90°") | ⚠️ Partially (see below) |

### Why is metadata lost?

The root cause is the **HTML Canvas pipeline**. Here is what happens step by step:

```
Original file (bytes)
    │   Contains: pixel data + EXIF block + ICC profile + XMP block + …
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
    │   Pixels are copied onto the Canvas 2D context.
    │   The context stores raw premultiplied-alpha RGBA pixels.
    │   No metadata containers exist in this representation.
    │
    ▼
canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
    │   The browser's image encoder reads the Canvas pixel buffer and
    │   produces a new, bare JPEG/PNG/WebP file from scratch.
    │   The encoder has no knowledge that metadata ever existed.
    │   The output blob contains pixel data and format headers only.
    │
    ▼
Output blob (bytes)
    │   Contains: pixel data only. No EXIF. No GPS. No ICC profile.
```

### The EXIF orientation edge case

EXIF stores a rotation tag (values 1–8) so that cameras can save images in their native sensor
orientation and let viewers rotate them on display. When `createImageBitmap()` decodes a JPEG,
most modern browsers **apply the rotation** to the pixel grid before returning the `ImageBitmap`
(this behaviour is specified by the [WHATWG Fetch / ImageBitmap spec](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html)).

This means:

- The pixel content is correct (the image appears right-way-up).
- But the output blob has no EXIF block and therefore **no orientation tag at all** (implicitly `1` — no rotation).

In practice, this is the correct and desirable behaviour: the output file is self-contained and
displays correctly without relying on viewer support for EXIF orientation.

### What about ICC colour profiles?

ICC colour profiles describe the colour space of an image (sRGB, Display P3, AdobeRGB, etc.).
When `createImageBitmap()` decodes an image, the browser *may* apply colour-space conversion to
normalise pixels to sRGB (the Canvas native colour space) — but this depends on the browser and
device. In any case, the ICC profile block is not carried through to `convertToBlob`, and the
output is always assumed to be standard sRGB.

For web usage this is generally fine. For professional photography workflows where colour accuracy
is critical, this optimizer is not the right tool.

### Privacy implication

Stripping EXIF GPS data is actually a **privacy benefit** in most consumer use cases: users
sharing optimised images on social media or messaging apps will not accidentally expose their
geolocation. This is a side-effect of the Canvas pipeline, not an intentional feature, but it is
worth knowing about.

---

## 12. Full decision flowchart

```
optimizeImage(file, shouldConvertToWebp)
│
├─ file.type === 'image/png' ?
│   │
│   ├─ YES, shouldConvertToWebp === true
│   │       └──► PIPELINE B: convertPngToWebp()
│   │               decode → draw → single WebP encode at 0.92
│   │               verify-decode
│   │               chooseBest → return
│   │
│   └─ YES, shouldConvertToWebp === false
│           └──► PIPELINE C: optimizePngImage()
│                   file ≤ 1 MB → return as-is (passthrough)
│                   file > 1 MB:
│                     decode once
│                     progressive loop (up to 3 attempts):
│                       scaleFactor = sqrt(target/size) × 0.85^i
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
