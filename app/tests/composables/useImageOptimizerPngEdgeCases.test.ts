import { describe, it, expect, afterAll } from 'vitest'

let lastInputFileSize = 0

class MockOffscreenCanvas {
  inputFileSize: number
  width: number
  height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.inputFileSize = lastInputFileSize
  }

  getContext(contextType: '2d'): OffscreenCanvasRenderingContext2D | null {
    if (contextType !== '2d') {
      return null
    }

    // Return a minimal 2D context shape the implementation uses (drawImage)
    return {
      drawImage: (
        _img: ImageBitmapSource,
        _x: number,
        _y: number,
        _w?: number,
        _h?: number
      ) => {},
    } as unknown as OffscreenCanvasRenderingContext2D
  }

  // Emulate browser convertToBlob behaviour with controllable sizes depending on quality.
  // quality <= 0.36 → small blob (1/3 of input) — matches the final forced quality (0.35)
  // quality >  0.36 → large blob (1.5× input) — forces binary search to find no candidate
  async convertToBlob(opts: { type: string; quality?: number }): Promise<Blob> {
    const quality = typeof opts.quality === 'number' ? opts.quality : 1

    // If quality is very low (final forced attempts in PNG path are ~0.35), return a smaller blob
    if (quality <= 0.36) {
      // Return a blob that's clearly smaller than the original file
      return new Blob(
        [new Uint8Array(Math.max(1, Math.floor(this.inputFileSize / 3)))],
        { type: opts.type }
      )
    }

    // For other qualities, return a large blob (bigger than original) to force further attempts
    return new Blob(
      [new Uint8Array(Math.max(1, Math.floor(this.inputFileSize * 1.5)))],
      { type: opts.type }
    )
  }
}

type NativeCreateImageBitmapFn = NonNullable<
  typeof globalThis.createImageBitmap
>

function createImageBitmapMock(
  shouldCloseThrow = false
): NativeCreateImageBitmapFn {
  const close = shouldCloseThrow
    ? () => {
        throw new Error('close failed')
      }
    : () => undefined

  function mock(
    image: ImageBitmapSource,
    options?: ImageBitmapOptions
  ): Promise<ImageBitmap>

  function mock(
    image: ImageBitmapSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    options?: ImageBitmapOptions
  ): Promise<ImageBitmap>

  function mock(..._args: unknown[]): Promise<ImageBitmap> {
    const bitmap = {
      width: 1_000,
      height: 800,
      close,
    } as unknown as ImageBitmap
    return Promise.resolve(bitmap)
  }

  return mock as NativeCreateImageBitmapFn
}

describe('useImageOptimizer composable optimizeImage method (png edge cases)', () => {
  const originalOffscreen = (
    globalThis as unknown as {
      OffscreenCanvas?: typeof OffscreenCanvas
    }
  ).OffscreenCanvas
  const originalCreateImageBitmap = globalThis.createImageBitmap

  afterAll(() => {
    if (typeof originalOffscreen !== 'undefined') {
      globalThis.OffscreenCanvas =
        originalOffscreen as unknown as typeof OffscreenCanvas
    } else {
      delete (globalThis as { OffscreenCanvas?: typeof OffscreenCanvas })
        .OffscreenCanvas
    }

    if (typeof originalCreateImageBitmap !== 'undefined') {
      globalThis.createImageBitmap = originalCreateImageBitmap
    } else {
      delete (
        globalThis as {
          createImageBitmap?: NativeCreateImageBitmapFn
        }
      ).createImageBitmap
    }
  })

  it('returns original file when convertToBlob throws in convertPngToWebp', async () => {
    lastInputFileSize = 50_000

    class ThrowingCanvas extends MockOffscreenCanvas {
      override async convertToBlob(_opts: {
        type: string
        quality?: number
      }): Promise<Blob> {
        throw new Error('convert failed')
      }
    }

    globalThis.OffscreenCanvas =
      ThrowingCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = createImageBitmapMock(false)

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, true)

    expect(fileResult.file).toBe(inputFile)
    expect(fileResult.file.size).toBe(inputFile.size)
    expect(fileResult.file.type).toBe('image/png')
    expect(fileResult.success).toBe(false)
  })

  it('returns original file (success: false) when ctx is null in convertPngToWebp', async () => {
    lastInputFileSize = 50_000

    class NullCtxCanvas extends MockOffscreenCanvas {
      override getContext(_contextType: '2d') {
        return null
      }
    }

    globalThis.OffscreenCanvas =
      NullCtxCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = createImageBitmapMock(false)

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, true)

    // ctx is null → blob stays null → chooseBest(null, ...) → success: false
    expect(fileResult.file).toBe(inputFile)
    expect(fileResult.success).toBe(false)
  })

  it('falls back gracefully when verify-decode fails in convertPngToWebp', async () => {
    // convertToBlob succeeds, but the verify createImageBitmap call throws.
    // Falls through to final chooseBest; since blob is larger than the input file
    // the original file is returned with success: true (not success: false).
    lastInputFileSize = 50_000

    let callCount = 0
    globalThis.OffscreenCanvas =
      MockOffscreenCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = (async () => {
      callCount++
      if (callCount > 1) {
        throw new Error('verify decode failed')
      }
      return {
        width: 1_000,
        height: 800,
        close: () => {},
      } as unknown as ImageBitmap
    }) as unknown as NativeCreateImageBitmapFn

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, true)

    // blob (1.5× input from mock) > input → chooseBest returns original, success: true
    expect(fileResult.file).toBe(inputFile)
    expect(fileResult.success).toBe(true)
  })

  it('continues when compressImageAtScale returns null (ctx missing) and falls back to original', async () => {
    lastInputFileSize = 1_200_000

    class NullCtxCanvas extends MockOffscreenCanvas {
      override getContext(_contextType: '2d') {
        return null
      }
    }

    globalThis.OffscreenCanvas =
      NullCtxCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = createImageBitmapMock(false)

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, false)

    // ctx null → all compressImageAtScale return null → finalContext null → fallback
    expect(fileResult.file).toBe(inputFile)
    expect(fileResult.file.size).toBe(inputFile.size)
    expect(fileResult.file.type).toBe('image/png')
    expect(fileResult.success).toBe(true)
  })

  it('uses final forced compression and returns a smaller blob; ignores close() errors', async () => {
    // Binary search blobs are too large (1.5× from mock) → no candidates in loop.
    // Final forced attempt (quality 0.35) returns 1/3 size → smaller than input → success.
    // The imageBitmap close() throws, which should be silently ignored.
    lastInputFileSize = 3_000_000

    globalThis.OffscreenCanvas =
      MockOffscreenCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = createImageBitmapMock(true)

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, false)

    expect(fileResult.file).toBeInstanceOf(Blob)
    expect(fileResult.file.size).toBeLessThan(inputFile.size)
    expect(fileResult.file.type).toBe('image/png')
    expect(fileResult.success).toBe(true)
  })

  it('returns failure when createImageBitmap throws for a PNG above threshold', async () => {
    lastInputFileSize = 2_000_000

    globalThis.OffscreenCanvas =
      MockOffscreenCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = (async () => {
      throw new Error('decode failed')
    }) as unknown as NativeCreateImageBitmapFn

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, false)

    expect(fileResult.file).toBe(inputFile)
    expect(fileResult.success).toBe(false)
  })

  it('handles a PNG ImageBitmap that has no close() method', async () => {
    // Exercises the typeof bitmap.close === 'function' false branch in closeBitmap.
    lastInputFileSize = 2_500_000

    globalThis.OffscreenCanvas =
      MockOffscreenCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = (async () =>
      ({
        width: 1_000,
        height: 800,
      }) as unknown as ImageBitmap) as unknown as NativeCreateImageBitmapFn

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, false)

    expect(fileResult.file).toBeInstanceOf(Blob)
    expect(fileResult.success).toBe(true)
  })

  it('falls back to original when final forced convertToBlob throws', async () => {
    // Loop blobs are too large (2× from mock) → no candidates.
    // Final forced convertToBlob (quality 0.35) throws → forcedCompressedBlob = null
    // → if(forcedCompressedBlob) false → fallback.
    lastInputFileSize = 3_000_000

    class FinalThrowCanvas extends MockOffscreenCanvas {
      override async convertToBlob(opts: {
        type: string
        quality?: number
      }): Promise<Blob> {
        const quality = typeof opts.quality === 'number' ? opts.quality : 1
        if (quality <= 0.36) {
          throw new Error('forced attempt failed')
        }
        return new Blob(
          [new Uint8Array(Math.max(1, Math.floor(this.inputFileSize * 2)))],
          { type: opts.type }
        )
      }
    }

    globalThis.OffscreenCanvas =
      FinalThrowCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = createImageBitmapMock(false)

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, false)

    expect(fileResult.file).toBe(inputFile)
    expect(fileResult.success).toBe(true)
  })

  it('falls back to original when final forced blob exists but is not smaller than input', async () => {
    // All quality levels return a blob 2× the input (larger than input and maxAllowedFileSize).
    // Loop: blob always too large → binary search never assigns candidate → compressImageAtScale returns null.
    // Final forced: blob = 2× input → verify succeeds → size check fails → fallback.
    lastInputFileSize = 3_000_000

    class AlwaysLargeCanvas extends MockOffscreenCanvas {
      override async convertToBlob(opts: {
        type: string
        quality?: number
      }): Promise<Blob> {
        return new Blob(
          [new Uint8Array(Math.max(1, Math.floor(this.inputFileSize * 2)))],
          { type: opts.type }
        )
      }
    }

    globalThis.OffscreenCanvas =
      AlwaysLargeCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = createImageBitmapMock(false)

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, false)

    // blob (6 MB) > inputFile (3 MB) → if(forcedBlob && size < input) false → fallback
    expect(fileResult.file).toBe(inputFile)
    expect(fileResult.success).toBe(true)
  })

  it('falls back to original when final forced verify-decode fails', async () => {
    // Loop: no candidates (1.5× blobs too large).
    // Final forced: blob created (1/3 size), but createImageBitmap(blob) throws
    // → forcedCompressedBlob = null → fallback to original.
    lastInputFileSize = 3_000_000

    let callCount = 0
    globalThis.OffscreenCanvas =
      MockOffscreenCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = (async () => {
      callCount++
      if (callCount > 1) {
        throw new Error('verify failed')
      }
      return {
        width: 1_000,
        height: 800,
        close: () => {},
      } as unknown as ImageBitmap
    }) as unknown as NativeCreateImageBitmapFn

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      { type: 'image/png' }
    )

    const fileResult = await optimizeImage(inputFile, false)

    expect(fileResult.file).toBe(inputFile)
    expect(fileResult.success).toBe(true)
  })
})
