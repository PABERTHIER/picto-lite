import { describe, it, expect, afterAll } from 'vitest'

class MockOffscreenCanvas {
  inputFileSize: number

  constructor(
    public width: number,
    public height: number,
    inputFileSize = 1_000_000
  ) {
    this.inputFileSize = inputFileSize
  }

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
    // Use the inputFileSize to influence the simulated size,
    // e.g. scale output size proportionally but reduce with quality

    // Clamp quality for safe behavior:
    const clampedQuality = Math.min(Math.max(quality, 0), 1)

    let simulatedSize = 0

    if (type === 'image/webp') {
      simulatedSize = Math.max(
        1,
        Math.round((this.inputFileSize / 10) * (1 - clampedQuality))
      )
    } else if (type === 'image/png') {
      // PNG less compressible: mostly depends on area, slightly on quality for big images
      // Simulate two behaviors:
      // - For small images (areaFactor small), PNG output = original size
      // - For large images (areaFactor large), PNG shrinks with lower quality
      simulatedSize =
        this.inputFileSize > 1_000_000
          ? Math.max(
              1,
              Math.round((this.inputFileSize / 15) * (1 - clampedQuality)) // shrink for big
            )
          : this.width * this.height // unchanged for small
    } else if (type === 'image/jpg' || type === 'image/jpeg') {
      simulatedSize = Math.max(
        1,
        Math.round((this.inputFileSize / 12) * (1 - clampedQuality))
      )
    } else {
      // Fallback: small constant size
      simulatedSize = 1000
    }

    return new Blob(['x'.repeat(simulatedSize)], { type })
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class OffscreenCanvasFactory {
  constructor(width: number, height: number) {
    return new MockOffscreenCanvas(width, height, lastInputFileSize)
  }
}

let originalOffscreenCanvas: typeof globalThis.OffscreenCanvas
let originalCreateImageBitmap: typeof globalThis.createImageBitmap
let lastInputFileSize = 1_000_000

beforeEach(() => {
  globalThis.OffscreenCanvas =
    OffscreenCanvasFactory as unknown as typeof OffscreenCanvas
  originalOffscreenCanvas = globalThis.OffscreenCanvas
  originalCreateImageBitmap = globalThis.createImageBitmap

  globalThis.createImageBitmap = async () => ({
    width: 100,
    height: 50,
    close: () => {},
  })
})

afterAll(() => {
  globalThis.OffscreenCanvas = originalOffscreenCanvas
  globalThis.createImageBitmap = originalCreateImageBitmap
  lastInputFileSize = 1_000_000
})

describe('useImageOptimizer composable optimizeImage method', () => {
  it.each([
    ['webp'],
    ['png'],
    ['jpg'],
    ['jpeg'],
    ['WEBP'],
    ['PNG'],
    ['JPG'],
    ['JPEG'],
  ])(
    'returns a compressed Blob with preserved MIME type (%s)',
    async extension => {
      const inputFile = new File(
        [new Uint8Array(1_000_000)],
        `image.${extension}`,
        {
          type: `image/${extension}`,
        }
      )

      const resultBlob = await optimizeImage(inputFile, false)

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.size).toBeLessThanOrEqual(inputFile.size)
      expect(resultBlob.type).toBe(`image/${extension.toLowerCase()}`)
    }
  )

  it.each([
    ['webp'],
    ['png'],
    ['jpg'],
    ['jpeg'],
    ['WEBP'],
    ['PNG'],
    ['JPG'],
    ['JPEG'],
  ])('returns a compressed Blob with webp MIME type (%s)', async extension => {
    const inputFile = new File(
      [new Uint8Array(1_000_000)],
      `image.${extension}`,
      {
        type: `image/${extension}`,
      }
    )

    const resultBlob = await optimizeImage(inputFile, true)

    expect(resultBlob).toBeInstanceOf(Blob)
    expect(resultBlob.size).toBeLessThanOrEqual(inputFile.size)
    expect(resultBlob.type).toBe('image/webp')
  })

  it.each([
    [true, 'webp'],
    [false, 'jpg'],
  ])(
    'adjusts quality to fit under size limit (output %s)',
    async (shouldConvertToWebp, expectedExtension) => {
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

      const inputFile = new File([new Uint8Array(1_000_000)], 'example.jpg', {
        type: 'image/jpg',
      })
      const resultBlob = await optimizeImage(inputFile, shouldConvertToWebp)

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.size).toBeLessThanOrEqual(200_000)
      expect(resultBlob.type).toBe(`image/${expectedExtension}`)

      // Restore main mock
      globalThis.OffscreenCanvas =
        MockOffscreenCanvas as unknown as typeof OffscreenCanvas
    }
  )

  it.each([
    ['small (below 1MB)', 500_000, 3_737],
    ['exactly 1MB', 1_000_000, 7_474],
    ['slightly above 1MB', 1_500_000, 11_211],
    ['large (7.18MB)', 7_180_000, 53_663],
  ])('JPG %s input size %d', async (_label, inputSize, expectedSize) => {
    lastInputFileSize = inputSize
    const inputFile = new File([new Uint8Array(inputSize)], 'image.jpg', {
      type: 'image/jpg',
    })

    const resultBlob = await optimizeImage(inputFile, false)

    expect(resultBlob.size).toBe(expectedSize)
    expect(resultBlob.type).toBe('image/jpg')
  })

  it.each([
    ['small (below 1MB)', 500_000, 4_484],
    ['exactly 1MB', 1_000_000, 8_969],
    ['slightly above 1MB', 1_500_000, 13_453],
    ['large (7.18MB)', 7_180_000, 64_396],
  ])(
    'JPG %s input size %d with webp conversion',
    async (_label, inputSize, expectedSize) => {
      lastInputFileSize = inputSize
      const inputFile = new File([new Uint8Array(inputSize)], 'image.jpg', {
        type: 'image/jpg',
      })

      const resultBlob = await optimizeImage(inputFile, true)

      expect(resultBlob.size).toBe(expectedSize)
      expect(resultBlob.type).toBe('image/webp')
    }
  )

  it.each([
    ['small (below 1MB)', 500_000, 3_737],
    ['exactly 1MB', 1_000_000, 7_474],
    ['slightly above 1MB', 1_500_000, 11_211],
    ['large (7.18MB)', 7_180_000, 53_663],
  ])('JPEG %s input size %d', async (_label, inputSize, expectedSize) => {
    lastInputFileSize = inputSize
    const inputFile = new File([new Uint8Array(inputSize)], 'image.jpeg', {
      type: 'image/jpeg',
    })

    const resultBlob = await optimizeImage(inputFile, false)

    expect(resultBlob.size).toBe(expectedSize)
    expect(resultBlob.type).toBe('image/jpeg')
  })

  it.each([
    ['small (below 1MB)', 500_000, 4_484],
    ['exactly 1MB', 1_000_000, 8_969],
    ['slightly above 1MB', 1_500_000, 13_453],
    ['large (7.18MB)', 7_180_000, 64_396],
  ])(
    'JPEG %s input size %d with webp conversion',
    async (_label, inputSize, expectedSize) => {
      lastInputFileSize = inputSize
      const inputFile = new File([new Uint8Array(inputSize)], 'image.jpeg', {
        type: 'image/jpeg',
      })

      const resultBlob = await optimizeImage(inputFile, true)

      expect(resultBlob.size).toBe(expectedSize)
      expect(resultBlob.type).toBe('image/webp')
    }
  )

  it.each([
    ['small (below 1MB)', 500_000, 4_484],
    ['exactly 1MB', 1_000_000, 8_969],
    ['slightly above 1MB', 1_500_000, 13_453],
    ['large (7.18MB)', 7_180_000, 64_396],
  ])('WEBP %s input size %d', async (_label, inputSize, expectedSize) => {
    lastInputFileSize = inputSize
    const inputFile = new File([new Uint8Array(inputSize)], 'image.webp', {
      type: 'image/webp',
    })

    const resultBlob = await optimizeImage(inputFile, false)

    expect(resultBlob.size).toBe(expectedSize)
    expect(resultBlob.type).toBe('image/webp')
  })

  it.each([
    ['small (below 1MB)', 500_000, 4_484],
    ['exactly 1MB', 1_000_000, 8_969],
    ['slightly above 1MB', 1_500_000, 13_453],
    ['large (7.18MB)', 7_180_000, 64_396],
  ])(
    'WEBP %s input size %d with webp conversion',
    async (_label, inputSize, expectedSize) => {
      lastInputFileSize = inputSize
      const inputFile = new File([new Uint8Array(inputSize)], 'image.webp', {
        type: 'image/webp',
      })

      const resultBlob = await optimizeImage(inputFile, true)

      expect(resultBlob.size).toBe(expectedSize)
      expect(resultBlob.type).toBe('image/webp')
    }
  )

  it.each([
    ['small (below 1MB)', 500_000, false, 500_000],
    ['exactly 1MB', 1_000_000, false, 1_000_000],
    ['slightly above 1MB', 1_500_000, true, 8_656],
    ['large (7.18MB)', 7_180_000, true, 41_435],
  ])(
    'PNG %s input size %d',
    async (_label, inputSize, expectSmaller, expectedSize) => {
      lastInputFileSize = inputSize
      const inputFile = new File([new Uint8Array(inputSize)], 'image.png', {
        type: 'image/png',
      })

      const resultBlob = await optimizeImage(inputFile, false)

      if (expectSmaller) {
        expect(resultBlob.size).toBe(expectedSize)
      } else {
        expect(resultBlob.size).toBe(inputFile.size)
      }

      expect(resultBlob.type).toBe('image/png')
    }
  )

  it.each([
    ['small (below 1MB)', 500_000, 4_000],
    ['exactly 1MB', 1_000_000, 8_000],
    ['slightly above 1MB', 1_500_000, 12_000],
    ['large (7.18MB)', 7_180_000, 57_440],
  ])(
    'PNG %s input size %d with webp conversion',
    async (_label, inputSize, expectedSize) => {
      lastInputFileSize = inputSize
      const inputFile = new File([new Uint8Array(inputSize)], 'image.png', {
        type: 'image/png',
      })

      const resultBlob = await optimizeImage(inputFile, true)

      expect(resultBlob.size).toBe(expectedSize)
      expect(resultBlob.type).toBe('image/webp')
    }
  )

  it('ignores errors when closing imageBitmap', async () => {
    globalThis.createImageBitmap = async () => ({
      width: 100,
      height: 50,
      close: () => {
        throw new Error('close fail')
      },
    })

    const inputFile = new File([new Uint8Array(1_500_000)], 'image.jpg', {
      type: 'image/jpeg',
    })

    const result = await optimizeImage(inputFile, false)

    expect(result).toBeInstanceOf(Blob)
  })

  it('uses final forced attempt if all compressImageAtScale attempts fail', async () => {
    class AlwaysNullCanvas extends MockOffscreenCanvas {
      override async convertToBlob() {
        return new Blob(['x'.repeat(1_000_000)], { type: 'image/jpeg' })
      }
    }
    globalThis.OffscreenCanvas =
      AlwaysNullCanvas as unknown as typeof OffscreenCanvas

    const inputFile = new File([new Uint8Array(2_000_000)], 'image.jpg', {
      type: 'image/jpeg',
    })

    const result = await optimizeImage(inputFile, false)

    expect(result).toBeInstanceOf(Blob)
    expect(result.size).toBeLessThan(inputFile.size)
  })

  it('skips compression if getContext returns null', async () => {
    class NullContextCanvas extends MockOffscreenCanvas {
      override getContext(_contextType: '2d') {
        return null
      }
    }

    globalThis.OffscreenCanvas =
      NullContextCanvas as unknown as typeof OffscreenCanvas

    const inputFile = new File([new Uint8Array(1_500_000)], 'image.jpg', {
      type: 'image/jpeg',
    })

    const result = await optimizeImage(inputFile, false)

    expect(result).toBe(inputFile)
  })

  it.skip('falls back to original if final forced compressed blob cannot be decoded', async () => {
    let callCount = 0

    globalThis.createImageBitmap = (async (
      image: ImageBitmapSource,
      _options?: ImageBitmapOptions
    ): Promise<ImageBitmap> => {
      callCount++
      if (
        callCount > 1 &&
        image instanceof Blob &&
        image.type === 'image/webp'
      ) {
        throw new Error('Decode fail')
      }
      return {
        width: 100,
        height: 50,
        close: () => {},
      } as unknown as ImageBitmap
    }) as typeof createImageBitmap

    const inputFile = new File([new Uint8Array(2_000_000)], 'large.webp', {
      type: 'image/webp',
    })

    const result = await optimizeImage(inputFile, true)

    expect(result).toBe(inputFile)
  })

  it('handles empty jpg image', async () => {
    const tinyFile = new File([], 'tiny.jpg', { type: 'image/jpg' })

    const result = await optimizeImage(tinyFile, false)

    expect(result.size).toEqual(0)
  })

  it('returns original not handled image format', async () => {
    const inputFile = new File([new Uint8Array(1_500_000)], 'image.heic', {
      type: 'image/heic',
    })

    const result = await optimizeImage(inputFile, false)

    expect(result.size).toEqual(1000)
    expect(result.type).toBe('image/heic')
  })

  it.each([
    [30_500_000, 53_663],
    [20_500_000, 53_663],
  ])(
    'handles very large jpg files (%s MB)',
    async (inputSize, expectedSize) => {
      const inputFile = new File([new Uint8Array(inputSize)], 'image.jpg', {
        type: 'image/jpg',
      })

      const result = await optimizeImage(inputFile, false)

      expect(result.size).toEqual(expectedSize)
      expect(result.type).toBe('image/jpg')
    }
  )

  it.each([
    [30_500_000, 41_435],
    [20_500_000, 41_435],
  ])(
    'handles very large png files (%s MB)',
    async (inputSize, expectedSize) => {
      const inputFile = new File([new Uint8Array(inputSize)], 'image.png', {
        type: 'image/png',
      })

      const result = await optimizeImage(inputFile, false)

      expect(result.size).toEqual(expectedSize)
      expect(result.type).toBe('image/png')
    }
  )
})
