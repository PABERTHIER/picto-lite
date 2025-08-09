import { describe, it, expect, beforeAll, afterAll } from 'vitest'

class MockOffscreenCanvas {
  constructor(
    public width: number,
    public height: number
  ) {}

  getContext(contextType: '2d') {
    if (contextType !== '2d') {
      return null
    }

    return { drawImage: () => {} }
  }

  async convertToBlob({
    type,
    quality,
  }: {
    type: string
    quality: number
  }): Promise<Blob> {
    // Simulate compression behavior
    const areaFactor = Math.max(
      1,
      Math.round((this.width * this.height) / (100 * 100))
    )

    if (type === 'image/webp') {
      const simulatedSize = Math.max(
        1,
        Math.round((1 - quality) * 800_000 * areaFactor)
      )
      return new Blob(['x'.repeat(simulatedSize)], { type })
    }

    if (type === 'image/png') {
      // Simulate two behaviors:
      // - For small images (areaFactor small), PNG output = original size
      // - For large images (areaFactor large), PNG shrinks with lower quality
      const baseSize =
        this.width * this.height > 1_000_000
          ? Math.round((1 - quality) * 800_000 * areaFactor) // shrink for big
          : this.width * this.height // unchanged for small
      return new Blob(['x'.repeat(Math.max(1, baseSize))], { type })
    }

    return new Blob(['x'], { type })
  }
}

let originalOffscreenCanvas: typeof globalThis.OffscreenCanvas
let originalCreateImageBitmap: typeof globalThis.createImageBitmap

beforeAll(() => {
  originalOffscreenCanvas = globalThis.OffscreenCanvas
  originalCreateImageBitmap = globalThis.createImageBitmap

  globalThis.OffscreenCanvas =
    MockOffscreenCanvas as unknown as typeof OffscreenCanvas
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
  it('returns a Blob below max size with correct MIME type', async () => {
    const inputFile = new File([new Uint8Array(100)], 'sample.webp', {
      type: 'image/webp',
    })
    const maxBytes = 1_000_000

    const resultBlob = await optimizeImage(inputFile, true, maxBytes)

    expect(resultBlob).toBeInstanceOf(Blob)
    expect(resultBlob.size).toBeLessThanOrEqual(maxBytes)
    expect(resultBlob.type).toBe('image/webp')
  })

  it('preserves MIME type if convertToWebp is false', async () => {
    const inputFile = new File([new Uint8Array(50)], 'sample.jpg', {
      type: 'image/jpeg',
    })
    const resultBlob = await optimizeImage(inputFile, false)

    expect(resultBlob.type).toBe('image/jpeg')
  })

  it('adjusts quality to fit under size limit', async () => {
    class SizeThresholdCanvas extends MockOffscreenCanvas {
      override async convertToBlob({
        type,
        quality,
      }: {
        type: string
        quality: number
      }) {
        return new Blob(['x'.repeat(quality > 0.5 ? 1_500_000 : 100_000)], {
          type,
        })
      }
    }

    globalThis.OffscreenCanvas =
      SizeThresholdCanvas as unknown as typeof OffscreenCanvas

    const inputFile = new File([new Uint8Array(10)], 'example.jpg', {
      type: 'image/jpg',
    })
    const resultBlob = await optimizeImage(inputFile, false, 200_000)

    expect(resultBlob.size).toBeLessThanOrEqual(200_000)

    // Restore main mock
    globalThis.OffscreenCanvas =
      MockOffscreenCanvas as unknown as typeof OffscreenCanvas
  })

  it.each([
    ['small (below 1MB)', 500_000, false],
    ['exactly 1MB', 1_000_000, false],
    ['slightly above 1MB', 1_500_000, true],
    ['large (7.18MB)', 7_180_000, true],
  ])('%s input size %d', async (_label, inputSize, expectSmaller) => {
    const inputFile = new File([new Uint8Array(inputSize)], 'big.png', {
      type: 'image/png',
    })
    const resultBlob = await optimizeImage(inputFile, false)

    if (expectSmaller) {
      expect(resultBlob.size).toBeLessThan(inputFile.size)
    } else {
      expect(resultBlob.size).toBe(inputFile.size)
    }
  })
})
