import type { FileResult } from '~/types/result'

const BINARY_SEARCH_ITERATIONS = 6 // Fixed iterations to find best quality
const QUALITY_LOWER_BOUND = 0.3 // Min compression quality (30%), image degradation becomes noticeable below 0.3
const QUALITY_UPPER_BOUND = 0.92 // Max compression quality (92%), most browsers cap this quality to 0.92
const MAX_INITIAL_COMPRESSION_RATIO = 1 // Max 100% scale (original size)
const DOWNSCALE_STEP_FACTOR = 0.85 // Reduce size by 15% per attempt progressively
const MIN_ALLOWED_SCALE = 0.05 // Minimum scale on final forced attempt
const PNG_PASSTHROUGH_THRESHOLD = 1_000_000 // PNGs ≤ 1 MB are returned as-is (already well-compressed)

export async function optimizeImage(
  inputFile: File,
  shouldConvertToWebp: boolean
): Promise<FileResult> {
  try {
    const inputFileType = inputFile.type

    // PNG has its own pipeline (separate from lossy formats, preserves text & transparency)
    if (inputFileType === 'image/png') {
      return await (shouldConvertToWebp
        ? convertPngToWebp(inputFile)
        : optimizePngImage(inputFile))
    }

    const originalSize = inputFile.size
    const outputMime = shouldConvertToWebp ? 'image/webp' : inputFileType

    const imageBitmap = await createImageBitmap(inputFile)
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)

    const isLossy =
      outputMime === 'image/webp' ||
      outputMime === 'image/jpeg' ||
      outputMime === 'image/jpg'

    if (!isLossy) {
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(imageBitmap, 0, 0)
      const blob = await canvas.convertToBlob({ type: inputFileType })
      closeBitmap(imageBitmap)

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

    closeBitmap(imageBitmap)

    return chooseBest(bestBlob, inputFile, originalSize)
  } catch {
    return { file: inputFile, success: false }
  }
}

// PNG-specific pipeline: separate from lossy path, tuned to preserve text & transparency.
// Files ≤ PNG_PASSTHROUGH_THRESHOLD are returned untouched.
// Larger files go through a progressive downscale loop (up to 3 attempts), followed by
// a final forced attempt. chooseBest ensures we never return a file larger than the original.
async function optimizePngImage(inputFile: File): Promise<FileResult> {
  const isSmallPngFile = inputFile.size <= PNG_PASSTHROUGH_THRESHOLD
  if (isSmallPngFile) {
    return { file: inputFile, success: true }
  }

  const maxAllowedFileSize = computeTargetSize(inputFile.size)
  const imageBitmap = await createImageBitmap(inputFile)
  const originalWidth = imageBitmap.width
  const originalHeight = imageBitmap.height
  const outputMimeType = 'image/png'

  // PNG-tuned params: less aggressive than lossy defaults to preserve text/readability
  const localMinInitialCompressionRatio = 0.6 // Don't start below 60% scale
  const localMaxDownscaleAttempts = 3 // Fewer progressive downscales
  const localQualityLower = 0.5 // Don't drop below 50% quality
  const localQualityUpper = QUALITY_UPPER_BOUND
  const localFinalForcedQuality = 0.35 // Make the final forced attempt less aggressive for PNGs

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

    // blob.size <= maxAllowedFileSize < inputFile.size (invariant: only runs for files > 1 MB)
    closeBitmap(imageBitmap)

    return chooseBest(blob, inputFile, inputFile.size)
  }

  // Final forced attempt: most aggressive, lowest quality
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
      forcedCompressedBlob = await finalCanvas.convertToBlob({
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
      closeBitmap(imageBitmap)

      return chooseBest(forcedCompressedBlob, inputFile, inputFile.size)
    }
  }

  closeBitmap(imageBitmap)

  return { file: inputFile, success: true }
}

// Try compressing the image at given scale; returns null if no candidate fits under the target.
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
      const candidateBlob = await offscreenCanvas.convertToBlob({
        type: outputMimeType,
        quality: testQuality,
      })

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

async function convertPngToWebp(inputFile: File): Promise<FileResult> {
  let blob: Blob | null = null
  const imageBitmap = await createImageBitmap(inputFile)
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.drawImage(imageBitmap, 0, 0)

    try {
      blob = await canvas.convertToBlob({
        type: 'image/webp',
        quality: QUALITY_UPPER_BOUND,
      })
      try {
        await createImageBitmap(blob)
        closeBitmap(imageBitmap)

        return chooseBest(blob, inputFile, inputFile.size)
      } catch {
        // Verification failed — fall through to chooseBest below
      }
    } catch {
      // Conversion failed
    }
  }

  closeBitmap(imageBitmap)

  return chooseBest(blob, inputFile, inputFile.size)
}

function closeBitmap(bitmap: ImageBitmap): void {
  if (typeof bitmap.close === 'function') {
    try {
      bitmap.close()
    } catch {
      // Ignore errors closing bitmap
    }
  }
}

function computeTargetSize(size: number): number {
  // Tiny files: do not touch (metadata re-encode could increase size)
  if (size <= 200_000) {
    return size
  }

  // Small: light compression
  if (size <= 1_000_000) {
    return Math.round(size * 0.9)
  }

  // Medium: aim for ~60%
  if (size <= 5_000_000) {
    return Math.round(size * 0.6)
  }

  // Large: aim for ~25% but with an absolute floor
  if (size <= 10_000_000) {
    return Math.max(Math.round(size * 0.25), 1_000_000) // e.g. 7MB -> at least 1MB
  }

  // Very large: stronger reduction with a reasonable floor
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
): Promise<FileResult> {
  if (!candidate) {
    return { file, success: false }
  }

  return {
    file: candidate.size < originalSize ? candidate : file,
    success: true,
  }
}
