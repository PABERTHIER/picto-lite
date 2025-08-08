import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

class MockOffscreenCanvas {
  constructor(
    public width: number,
    public height: number
  ) {}

  getContext(contextType: '2d') {
    if (contextType !== '2d') return null
    return {
      drawImage: () => {},
    }
  }

  async convertToBlob({ type, quality }: { type: string; quality: number }) {
    const simulatedSize = Math.max(1, Math.round((1 - quality) * 2_000_000))
    return new Blob(['x'.repeat(simulatedSize)], { type })
  }
}

let originalOffscreenCanvas: typeof globalThis.OffscreenCanvas
let originalCreateImageBitmap: typeof globalThis.createImageBitmap

beforeAll(() => {
  originalOffscreenCanvas = globalThis.OffscreenCanvas
  originalCreateImageBitmap = globalThis.createImageBitmap

  globalThis.OffscreenCanvas = MockOffscreenCanvas as typeof OffscreenCanvas
  globalThis.createImageBitmap = async () => ({
    width: 100,
    height: 50,
    close: () => {},
  })
})

afterAll(() => {
  globalThis.OffscreenCanvas = originalOffscreenCanvas
  globalThis.createImageBitmap = originalCreateImageBitmap
})

describe('useImageOptimizer composable optimizeImage method', () => {
  it('returns a Blob below the max size and with correct MIME type', async () => {
    const inputFile = new File([new Uint8Array(100)], 'sample.webp', {
      type: 'image/webp',
    })
    const maxBytes = 1_000_000

    const resultBlob = await optimizeImage(inputFile, true, maxBytes)

    expect(resultBlob).toBeInstanceOf(Blob)
    expect(resultBlob.size).toBeLessThanOrEqual(maxBytes)
    expect(resultBlob.type).toBe('image/webp')
  })

  it('preserves the original MIME type if convertToWebp is false', async () => {
    const inputFile = new File([new Uint8Array(50)], 'sample.jpg', {
      type: 'image/jpeg',
    })
    const resultBlob = await optimizeImage(inputFile, false)

    expect(resultBlob.type).toBe('image/jpeg')
  })

  it('performs exactly 6 iterations for quality adjustment', async () => {
    const convertSpy = vi.spyOn(MockOffscreenCanvas.prototype, 'convertToBlob')
    const inputFile = new File([new Uint8Array(10)], 'image.png', {
      type: 'image/png',
    })

    await optimizeImage(inputFile, false, 100_000)

    expect(convertSpy).toHaveBeenCalledTimes(6)
    convertSpy.mockRestore()
  })

  it('adjusts quality to ensure resulting blob fits under size limit', async () => {
    class SizeThresholdCanvas extends MockOffscreenCanvas {
      override async convertToBlob({
        type,
        quality,
      }: {
        type: string
        quality: number
      }) {
        const simulatedSize = quality > 0.5 ? 1_500_000 : 100_000
        return new Blob(['x'.repeat(simulatedSize)], { type })
      }
    }

    globalThis.OffscreenCanvas = SizeThresholdCanvas as typeof OffscreenCanvas

    const inputFile = new File([new Uint8Array(10)], 'example.png', {
      type: 'image/png',
    })
    const resultBlob = await optimizeImage(inputFile, false, 200_000)

    expect(resultBlob.size).toBeLessThanOrEqual(200_000)

    globalThis.OffscreenCanvas = MockOffscreenCanvas as typeof OffscreenCanvas
  })
})
