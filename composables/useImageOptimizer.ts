// Compression tuning constants
const MIN_INITIAL_COMPRESSION_RATIO = 0.2 // Never compress below 20% scale initially
const MAX_INITIAL_COMPRESSION_RATIO = 1 // Max 100% scale (original size)
const BINARY_SEARCH_ITERATIONS = 6 // Fixed iterations to find best quality
const DOWNSCALE_STEP_FACTOR = 0.85 // Reduce size by 15% per attempt progressively
const MAX_DOWNSCALE_ATTEMPTS = 6 // Number of progressive downscale tries, 6 attempts give a precision of 0.0129 (1.3% of quality granularity), increase this value for finer control (cost time)
const MIN_ALLOWED_SCALE = 0.05 // Minimum scale on final forced attempt
const FINAL_FORCED_QUALITY = 0.05 // Very low quality for final aggressive compression attempt
const QUALITY_LOWER_BOUND = 0.1 // Min compression quality (10%), image degradation becomes noticeable
const QUALITY_UPPER_BOUND = 0.92 // Max compression quality (92%), most browsers cap this quality to 0.92

export async function optimizeImage(
  inputFile: File,
  shouldConvertToWebp: boolean,
  maxAllowedFileSize = 1_000_000 // 1MB default max size
): Promise<Blob> {
  const isSmallPngFile =
    inputFile.size <= maxAllowedFileSize && inputFile.type === 'image/png'
  // Early exit: If PNG already small enough, return it as-is to preserve quality (e.g., for text readability)
  if (isSmallPngFile && !shouldConvertToWebp) {
    return inputFile
  }

  const imageBitmap = await createImageBitmap(inputFile)
  const originalWidth = imageBitmap.width
  const originalHeight = imageBitmap.height

  const outputMimeType = shouldConvertToWebp
    ? 'image/webp'
    : inputFile.type || 'image/jpeg'

  if (isSmallPngFile) {
    const canvas = new OffscreenCanvas(originalWidth, originalHeight)
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.drawImage(imageBitmap, 0, 0, originalWidth, originalHeight)

      return await (
        canvas as unknown as {
          convertToBlob: (opts: {
            type: string
            quality: number
          }) => Promise<Blob>
        }
      ).convertToBlob({ type: outputMimeType, quality: QUALITY_UPPER_BOUND })
    }
  }

  // Progressive compression attempts with gradually decreasing scale
  for (
    let attemptIndex = 0;
    attemptIndex <= MAX_DOWNSCALE_ATTEMPTS;
    attemptIndex++
  ) {
    const scaleFactor =
      Math.max(
        MIN_INITIAL_COMPRESSION_RATIO,
        Math.min(
          MAX_INITIAL_COMPRESSION_RATIO,
          Math.sqrt(maxAllowedFileSize / inputFile.size)
        )
      ) * Math.pow(DOWNSCALE_STEP_FACTOR, attemptIndex)

    if (scaleFactor <= 0) {
      break
    }

    const compressedCandidate = await compressImageAtScale(
      originalWidth,
      originalHeight,
      scaleFactor,
      imageBitmap,
      outputMimeType,
      maxAllowedFileSize
    )
    if (!compressedCandidate) {
      continue
    }

    // Accept only if the new file is smaller than original
    if (compressedCandidate.size < inputFile.size) {
      if (typeof imageBitmap.close === 'function') {
        try {
          imageBitmap.close()
        } catch {
          // Ignore errors closing bitmap
        }
      }
      return compressedCandidate
    }
  }

  // Final forced attempt with minimal scale and quality (most aggressive)
  const finalScaleFactor = Math.max(
    MIN_ALLOWED_SCALE,
    Math.sqrt(maxAllowedFileSize / inputFile.size) *
      Math.pow(DOWNSCALE_STEP_FACTOR, MAX_DOWNSCALE_ATTEMPTS + 1)
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
      ).convertToBlob({ type: outputMimeType, quality: FINAL_FORCED_QUALITY })
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
      return forcedCompressedBlob
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

// Helper: Try compressing image at given scale, returning compressed Blob or null if fails
async function compressImageAtScale(
  originalWidth: number,
  originalHeight: number,
  scaleFactor: number,
  imageBitmap: ImageBitmap,
  outputMimeType: string,
  maxAllowedFileSize: number
): Promise<Blob | null> {
  const targetWidth = Math.max(1, Math.round(originalWidth * scaleFactor))
  const targetHeight = Math.max(1, Math.round(originalHeight * scaleFactor))

  const offscreenCanvas = new OffscreenCanvas(targetWidth, targetHeight)
  const context = offscreenCanvas.getContext('2d')
  if (!context) {
    return null
  }

  context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)

  // Binary search to find highest quality under maxAllowedFileSize
  let qualityLow = QUALITY_LOWER_BOUND
  let qualityHigh = QUALITY_UPPER_BOUND
  let bestCandidate: Blob | null = null

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
      bestCandidate = candidateBlob
    }
  }

  // Validate blob can be decoded to avoid corrupted output
  if (!bestCandidate) {
    return null
  }

  try {
    await createImageBitmap(bestCandidate)
  } catch {
    return null
  }

  return bestCandidate
}
