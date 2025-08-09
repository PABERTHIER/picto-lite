export async function optimizeImage(
  file: File,
  convertToWebp: boolean,
  maxSizeBytes = 1_000_000
): Promise<Blob> {
  // Quick accept if it already fits for png (to prevent text being unreadable)
  if (file.size <= maxSizeBytes && file.type === 'image/png') {
    return file
  }

  const imgBitmap = await createImageBitmap(file)
  const originalWidth = imgBitmap.width
  const originalHeight = imgBitmap.height

  const mime = convertToWebp ? 'image/webp' : file.type || 'image/jpeg'

  // Heuristic parameters (tune if you want more/less aggressive behavior)
  const initialRatio = Math.max(
    0.2,
    Math.min(1, Math.sqrt(maxSizeBytes / file.size))
  )
  const downscaleFactor = 0.85
  const maxDownscaleAttempts = 6 // number of progressive attempts before final aggressive attempt
  const minScale = 0.05 // minimal allowed scale for final forced attempt
  const forcedFinalQuality = 0.05 // final attempt's quality to force shrinking

  // Utility to attempt compression on one canvas scale
  async function compressAtScale(scale: number): Promise<Blob | null> {
    const canvasWidth = Math.max(1, Math.round(originalWidth * scale))
    const canvasHeight = Math.max(1, Math.round(originalHeight * scale))

    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return null
    }
    ctx.drawImage(imgBitmap, 0, 0, canvasWidth, canvasHeight)

    // Exactly 6 iterations binary search (keeps per-attempt behavior stable)
    let low = 0.1
    let high = 0.92
    let candidate: Blob | null = null

    for (let i = 0; i < 6; i += 1) {
      const q = (low + high) / 2
      candidate = await (
        canvas as unknown as {
          convertToBlob: (opts: {
            type: string
            quality: number
          }) => Promise<Blob>
        }
      ).convertToBlob({ type: mime, quality: q })

      if (candidate.size > maxSizeBytes) {
        high = q
      } else {
        low = q
      }
    }

    if (candidate === null) {
      return null
    }

    // Validate candidate decodes (avoid corrupted output)
    try {
      await createImageBitmap(candidate)
    } catch {
      return null
    }

    return candidate
  }

  // Progressive attempts
  for (let attempt = 0; attempt <= maxDownscaleAttempts; attempt += 1) {
    const scale = initialRatio * Math.pow(downscaleFactor, attempt)
    if (scale <= 0) {
      break
    }

    const candidate = await compressAtScale(scale)
    if (candidate === null) {
      // try next attempt
      continue
    }

    // Accept only if strictly smaller
    if (candidate.size < file.size) {
      if (typeof imgBitmap.close === 'function') {
        try {
          imgBitmap.close()
        } catch {
          // continue regardless of error
        }
      }
      return candidate
    }

    // else try next (smaller scale)
  }

  // Final forced attempt (most aggressive): minScale and forced low quality
  const finalScale = Math.max(
    minScale,
    initialRatio * Math.pow(downscaleFactor, maxDownscaleAttempts + 1)
  )
  const canvasFinal = new OffscreenCanvas(
    Math.max(1, Math.round(originalWidth * finalScale)),
    Math.max(1, Math.round(originalHeight * finalScale))
  )
  const ctxFinal = canvasFinal.getContext('2d')
  if (ctxFinal) {
    ctxFinal.drawImage(imgBitmap, 0, 0, canvasFinal.width, canvasFinal.height)

    let forcedBlob: Blob | null = null
    try {
      forcedBlob = await (
        canvasFinal as unknown as {
          convertToBlob: (opts: {
            type: string
            quality: number
          }) => Promise<Blob>
        }
      ).convertToBlob({ type: mime, quality: forcedFinalQuality })
    } catch {
      forcedBlob = null
    }

    if (forcedBlob !== null) {
      try {
        await createImageBitmap(forcedBlob)
      } catch {
        forcedBlob = null
      }
    }

    if (forcedBlob !== null && forcedBlob.size < file.size) {
      if (typeof imgBitmap.close === 'function') {
        try {
          imgBitmap.close()
        } catch {
          // continue regardless of error
        }
      }
      return forcedBlob
    }
  }

  // Give up: close resources and return original. This path is extremely unlikely
  if (typeof imgBitmap.close === 'function') {
    try {
      imgBitmap.close()
    } catch {
      // continue regardless of error
    }
  }

  return file
}
