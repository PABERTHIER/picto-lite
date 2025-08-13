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

  // Emulate browser convertToBlob behaviour with controllable sizes depending on quality
  // Accept optional quality to match various callsites
  async convertToBlob(opts: { type: string; quality?: number }): Promise<Blob> {
    const quality = typeof opts.quality === 'number' ? opts.quality : 1

    // If quality is very low (final forced attempts in PNG path are ~0.35), return a smaller blob
    if (quality <= 0.36) {
      // Return a blob that's clearly smaller than the original file
      return new Blob(
        [new Uint8Array(Math.max(1, Math.floor(this.inputFileSize / 3)))],
        {
          type: opts.type,
        }
      )
    }

    // For other qualities, return a large blob (bigger than original) to force further attempts
    return new Blob(
      [new Uint8Array(Math.max(1, Math.floor(this.inputFileSize * 1.5)))],
      {
        type: opts.type,
      }
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
      {
        type: 'image/png',
      }
    )

    const fileResult = await optimizeImage(inputFile, true)
    const resultBlob = fileResult.file

    // Convert failed -> chooseBest with null -> should return original file
    expect(resultBlob).toBeInstanceOf(File)
    expect(resultBlob).toBe(inputFile)
    expect(resultBlob.size).toBe(inputFile.size)
    expect(resultBlob.type).toBe('image/png')
    expect(fileResult.success).toBe(false)
  })

  it('continues when compressImageAtScale returns null (ctx missing) and falls back to original', async () => {
    lastInputFileSize = 1_200_000

    class NullCtxCanvas extends MockOffscreenCanvas {
      override getContext(_contextType: '2d') {
        return null
      }

      override async convertToBlob(_opts: {
        type: string
        quality?: number
      }): Promise<Blob> {
        return new Blob([new Uint8Array(this.inputFileSize)], {
          type: 'image/png',
        })
      }
    }

    globalThis.OffscreenCanvas =
      NullCtxCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = createImageBitmapMock(false)

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      {
        type: 'image/png',
      }
    )

    const fileResult = await optimizeImage(inputFile, false)
    const resultBlob = fileResult.file

    // Nothing could be compressed (no ctx) -> final fallback returns original file
    expect(resultBlob).toBeInstanceOf(Blob)
    expect(resultBlob).toBe(inputFile)
    expect(resultBlob.size).toBe(inputFile.size)
    expect(resultBlob.type).toBe('image/png')
    expect(fileResult.success).toBe(true)
  })

  it('uses final forced compression and returns a smaller blob; ignores close() errors', async () => {
    lastInputFileSize = 3_000_000

    globalThis.OffscreenCanvas =
      MockOffscreenCanvas as unknown as typeof OffscreenCanvas
    globalThis.createImageBitmap = createImageBitmapMock(true)

    const inputFile = new File(
      [new Uint8Array(lastInputFileSize)],
      'image.png',
      {
        type: 'image/png',
      }
    )

    const fileResult = await optimizeImage(inputFile, false)
    const resultBlob = fileResult.file

    expect(resultBlob).toBeInstanceOf(Blob)
    expect(resultBlob.size).toBeLessThan(inputFile.size)
    expect(resultBlob.type).toBe('image/png')
    expect(fileResult.success).toBe(true)
  })
})
