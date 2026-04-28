---
applyTo: "app/composables/**/*.ts"
---

# Optimizer / Composable Instructions

## Invariants — Never Break These

### `chooseBest()` must always return the smaller file

`chooseBest(candidate, originalFile, originalSize)` returns the original file if the candidate
blob is larger. **Never bypass or remove this check.** Output must never be larger than input.

### PNG small-file early exit

Files typed as `image/png` with size ≤ `PNG_PASSTHROUGH_THRESHOLD` (1 MB) are returned **as-is**.
This is intentional — small PNGs are already efficiently compressed, and Canvas-based recompression
degrades text and sharp-edge quality. Do not change this threshold without benchmarking.

### PNG is a separate pipeline

Never merge the PNG pipeline into the lossy pipeline. PNG uses conservative, text-aware parameters
(the lossy pipeline does quality-only binary search with no downscaling — these concepts are PNG-exclusive):

- **`localMinInitialCompressionRatio = 0.6`** — never start below 60% scale
- **`localMaxDownscaleAttempts = 3`** — up to 4 loop iterations (indices 0–3) before final forced attempt
- **`localQualityLower = 0.5`** — floor quality for PNG binary search (lossy uses `QUALITY_LOWER_BOUND = 0.3`)
- **`localFinalForcedQuality = 0.35`** — quality for the final forced encode attempt

After the progressive loop, a final forced encode at `localFinalForcedQuality` is attempted and
verified with `await createImageBitmap(blob)` before being accepted.

`chooseBest()` always ensures the output is never larger than the original.

### Blob verification in PNG → WebP conversion

`convertPngToWebp` verifies the output blob is decodable with `await createImageBitmap(blob)`
before accepting it. If verification fails, the function falls through to the final `chooseBest`
call (which may still return the unverified blob if it is smaller than the original).

---

## Constants

These constants are tuned based on browser behavior and visual quality benchmarks. Do not change
them without a documented reason and updated test coverage:

| Constant | Value | Purpose |
|---|---|---|
| `BINARY_SEARCH_ITERATIONS` | 6 | Quality search precision (±1.3% of quality range) for the lossy pipeline |
| `QUALITY_LOWER_BOUND` | 0.3 | Min lossy quality (below 0.3 = noticeable degradation) |
| `QUALITY_UPPER_BOUND` | 0.92 | Max quality (browsers cap JPEG/WebP encoding at ~0.92) |
| `MAX_INITIAL_COMPRESSION_RATIO` | 1 | Never start a PNG encode above 100% of original dimensions |
| `DOWNSCALE_STEP_FACTOR` | 0.85 | Reduce scale by 15% per progressive downscale attempt |
| `MIN_ALLOWED_SCALE` | 0.05 | Floor scale for the final forced PNG encode attempt |
| `PNG_PASSTHROUGH_THRESHOLD` | 1 000 000 | PNGs ≤ this size are returned untouched |

---

## Browser APIs

`OffscreenCanvas`, `createImageBitmap`, and `showSaveFilePicker` are **browser-only APIs**.
They are not available in Node.js or the Vitest test environment.

- Always mock them in tests using `installOffscreenCanvasMock` and `vi.fn()`
- Never add direct calls to these APIs outside of the composable and component files that already use them
- The `showSaveFilePicker` fallback to `<a download>` in `ImageUploader.vue` is **required** for
  browsers that don't support the File System Access API — never remove it

---

## TypeScript

- All functions must have explicit return types
- Use `Promise<FileResult>` or `Promise<Blob | null>` as appropriate
- Never use `any` — use proper types or `unknown` with type guards
- Constants at the top of the file are module-level, not exported — keep them that way
