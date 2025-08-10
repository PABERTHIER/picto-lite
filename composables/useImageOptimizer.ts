const BINARY_SEARCH_ITERATIONS = 6 // Fixed iterations to find best quality
const QUALITY_LOWER_BOUND = 0.3 // Min compression quality (30%), image degradation becomes noticeable below 0.3
const QUALITY_UPPER_BOUND = 0.92 // Max compression quality (92%), most browsers cap this quality to 0.92
const MIN_INITIAL_COMPRESSION_RATIO = 0.2 // Never compress below 20% scale initially
const MAX_INITIAL_COMPRESSION_RATIO = 1 // Max 100% scale (original size)
const DOWNSCALE_STEP_FACTOR = 0.85 // Reduce size by 15% per attempt progressively
const MAX_DOWNSCALE_ATTEMPTS = 6 // Number of progressive downscale tries, 6 attempts give a precision of 0.0129 (1.3% of quality granularity), increase this value for finer control (cost time)
const MIN_ALLOWED_SCALE = 0.05 // Minimum scale on final forced attempt
const FINAL_FORCED_QUALITY = 0.05 // Very low quality for final aggressive compression attempt

export async function optimizeImage(
  inputFile: File,
  shouldConvertToWebp: boolean
): Promise<Blob> {
  const originalSize = inputFile.size
  const inputFileType = inputFile.type
  const imageBitmap = await createImageBitmap(inputFile)
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)

  const outputMime = shouldConvertToWebp ? 'image/webp' : inputFileType

  if (inputFileType === 'image/png') {
    if (shouldConvertToWebp) {
      return convertPngToWebp(inputFile)
    } else {
      return optimizePngImage(inputFile)
    }
  }

  const isLossy =
    outputMime === 'image/webp' ||
    outputMime === 'image/jpeg' ||
    outputMime === 'image/jpg'

  if (!isLossy) {
    const blob = await canvas.convertToBlob({ type: outputMime })
    return chooseBest(blob, inputFile, originalSize)
  }

  let bestBlob: Blob | null = null
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.drawImage(imageBitmap, 0, 0)

    const targetSize = computeTargetSize(originalSize)

    let low = QUALITY_LOWER_BOUND
    let high = QUALITY_UPPER_BOUND

    for (let i = 0; i < BINARY_SEARCH_ITERATIONS; i += 1) {
      const quality = (low + high) / 2
      const blob = await canvas.convertToBlob({ type: outputMime, quality })

      if (bestBlob === null || blob.size < bestBlob.size) {
        bestBlob = blob
      }

      if (blob.size > targetSize) {
        high = quality
      } else {
        low = quality
      }

      if (bestBlob.size <= targetSize && high - low < 0.01) {
        break
      }
    }
  }

  return chooseBest(bestBlob, inputFile, originalSize)
}

async function optimizePngImage(inputFile: File): Promise<Blob> {
  const isSmallPngFile = inputFile.size <= 1_000_000
  // Early exit: If PNG already small enough, return it as-is to preserve quality (e.g., for text readability)
  if (isSmallPngFile) {
    return inputFile
  }

  const maxAllowedFileSize = computeTargetSize(inputFile.size)
  const imageBitmap = await createImageBitmap(inputFile)
  const originalWidth = imageBitmap.width
  const originalHeight = imageBitmap.height
  const outputMimeType = 'image/png'

  // Per-file tuned params (less aggressive for PNGs to preserve text/readability)
  let localMinInitialCompressionRatio = MIN_INITIAL_COMPRESSION_RATIO
  let localMaxDownscaleAttempts = MAX_DOWNSCALE_ATTEMPTS
  let localQualityLower = QUALITY_LOWER_BOUND
  const localQualityUpper = QUALITY_UPPER_BOUND
  let localFinalForcedQuality = FINAL_FORCED_QUALITY

  // PNGs often contain text/sharp edges -> avoid aggressive downscaling/low-quality
  localMinInitialCompressionRatio = 0.6 // don't start below 60% scale
  localMaxDownscaleAttempts = 3 // fewer progressive downscales
  localQualityLower = 0.5 // don't drop below 50% quality
  // make the final forced attempt less aggressive for PNGs
  localFinalForcedQuality = 0.35

  // Progressive compression attempts with gradually decreasing scale
  for (
    let attemptIndex = 0;
    attemptIndex <= localMaxDownscaleAttempts;
    attemptIndex++
  ) {
    const scaleFactor =
      Math.max(
        localMinInitialCompressionRatio,
        Math.min(
          MAX_INITIAL_COMPRESSION_RATIO,
          Math.sqrt(maxAllowedFileSize / inputFile.size)
        )
      ) * Math.pow(DOWNSCALE_STEP_FACTOR, attemptIndex)

    if (scaleFactor <= 0) {
      break
    }

    const blob = await compressImageAtScale(
      originalWidth,
      originalHeight,
      scaleFactor,
      imageBitmap,
      outputMimeType,
      maxAllowedFileSize,
      localQualityLower,
      localQualityUpper
    )

    if (!blob) {
      continue
    }

    // Accept only if the new file is smaller than original
    if (blob.size < inputFile.size) {
      if (typeof imageBitmap.close === 'function') {
        try {
          imageBitmap.close()
        } catch {
          // Ignore errors closing bitmap
        }
      }

      return chooseBest(blob, inputFile, inputFile.size)
    }
  }

  // Final forced attempt with minimal scale and quality (most aggressive) — use per-file final quality
  const finalScaleFactor = Math.max(
    MIN_ALLOWED_SCALE,
    Math.sqrt(maxAllowedFileSize / inputFile.size) *
      Math.pow(DOWNSCALE_STEP_FACTOR, localMaxDownscaleAttempts + 1)
  )

  const finalCanvasWidth = Math.max(
    1,
    Math.round(originalWidth * finalScaleFactor)
  )
  const finalCanvasHeight = Math.max(
    1,
    Math.round(originalHeight * finalScaleFactor)
  )

  const finalCanvas = new OffscreenCanvas(finalCanvasWidth, finalCanvasHeight)
  const finalContext = finalCanvas.getContext('2d')

  if (finalContext) {
    finalContext.drawImage(
      imageBitmap,
      0,
      0,
      finalCanvasWidth,
      finalCanvasHeight
    )

    let forcedCompressedBlob: Blob | null = null
    try {
      forcedCompressedBlob = await (
        finalCanvas as unknown as {
          convertToBlob: (opts: {
            type: string
            quality: number
          }) => Promise<Blob>
        }
      ).convertToBlob({
        type: outputMimeType,
        quality: localFinalForcedQuality,
      })
    } catch {
      forcedCompressedBlob = null
    }

    if (forcedCompressedBlob) {
      try {
        await createImageBitmap(forcedCompressedBlob)
      } catch {
        forcedCompressedBlob = null
      }
    }

    if (forcedCompressedBlob && forcedCompressedBlob.size < inputFile.size) {
      if (typeof imageBitmap.close === 'function') {
        try {
          imageBitmap.close()
        } catch {
          // Ignore errors closing bitmap
        }
      }

      return chooseBest(forcedCompressedBlob, inputFile, inputFile.size)
    }
  }

  // Cleanup and fallback: close bitmap and return original file as last resort
  if (typeof imageBitmap.close === 'function') {
    try {
      imageBitmap.close()
    } catch {
      // Ignore errors closing bitmap
    }
  }

  return inputFile
}

// Try compressing image at given scale, returning compressed Blob or null if fails
// NOTE: accepts per-call quality bounds so PNGs can be treated less aggressively.
async function compressImageAtScale(
  originalWidth: number,
  originalHeight: number,
  scaleFactor: number,
  imageBitmap: ImageBitmap,
  outputMimeType: string,
  maxAllowedFileSize: number,
  qualityLowerBound: number,
  qualityUpperBound: number
): Promise<Blob | null> {
  const targetWidth = Math.max(1, Math.round(originalWidth * scaleFactor))
  const targetHeight = Math.max(1, Math.round(originalHeight * scaleFactor))

  let blob: Blob | null = null
  const offscreenCanvas = new OffscreenCanvas(targetWidth, targetHeight)
  const context = offscreenCanvas.getContext('2d')

  if (context) {
    context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)

    // Binary search to find highest quality under maxAllowedFileSize
    let qualityLow = qualityLowerBound
    let qualityHigh = qualityUpperBound

    for (let i = 0; i < BINARY_SEARCH_ITERATIONS; i++) {
      const testQuality = (qualityLow + qualityHigh) / 2
      const candidateBlob = await (
        offscreenCanvas as unknown as {
          convertToBlob: (opts: {
            type: string
            quality: number
          }) => Promise<Blob>
        }
      ).convertToBlob({ type: outputMimeType, quality: testQuality })

      if (candidateBlob.size > maxAllowedFileSize) {
        qualityHigh = testQuality
      } else {
        qualityLow = testQuality
        blob = candidateBlob
      }
    }
  }

  return blob
}

async function convertPngToWebp(inputFile: File): Promise<Blob> {
  let blob: Blob | null = null
  const imageBitmap = await createImageBitmap(inputFile)
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.drawImage(imageBitmap, 0, 0)

    try {
      blob = await (
        canvas as unknown as {
          convertToBlob: (opts: {
            type: string
            quality: number
          }) => Promise<Blob>
        }
      ).convertToBlob({ type: 'image/webp', quality: QUALITY_UPPER_BOUND })
      try {
        await createImageBitmap(blob)
        if (typeof imageBitmap.close === 'function') {
          try {
            imageBitmap.close()
          } catch {
            // ignore
          }
        }

        return chooseBest(blob, inputFile, inputFile.size)
      } catch {
        // verification failed -> fall through to regular pipeline
      }
    } catch {
      // conversion failed, fall through
    }
  }

  return chooseBest(blob, inputFile, inputFile.size)
}

function computeTargetSize(size: number): number {
  // tiny files: do not touch (metadata re-encode may increase)
  if (size <= 200_000) {
    return size
  }

  // small: light compression
  if (size <= 1_000_000) {
    return Math.round(size * 0.9)
  }

  // medium: aim for ~50%
  if (size <= 5_000_000) {
    return Math.round(size * 0.6)
  }

  // large: aim for ~20-25% but with an absolute floor
  if (size <= 10_000_000) {
    return Math.max(Math.round(size * 0.25), 1_000_000) // e.g. 7MB -> at least 1MB
  }

  // very large: stronger reduction but keep a reasonable floor
  if (size <= 30_000_000) {
    return Math.max(Math.round(size * 0.15), 1_500_000) // e.g. 20MB -> at least 3MB
  }

  return Math.max(Math.round(size * 0.12), 2_000_000)
}

// Ensure the final blob is never bigger than the original
async function chooseBest(
  candidate: Blob | null,
  file: File,
  originalSize: number
): Promise<Blob> {
  if (!candidate) {
    return file
  }

  return candidate.size < originalSize ? candidate : file
}
