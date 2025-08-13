// Helper to install a typed OffscreenCanvas + createImageBitmap mock
// The mock simulates convertToBlob sizes based on canvas area, mime and quality

export type RestoreFn = () => void

export function installOffscreenCanvasMock(initialInputFileSize = 1_000_000): {
  setLastInputFileSize: (size: number) => void
  restore: RestoreFn
} {
  let lastInputFileSize = initialInputFileSize

  const originalOffscreenCanvas = (
    globalThis as unknown as { OffscreenCanvas?: typeof OffscreenCanvas }
  ).OffscreenCanvas
  const originalCreateImageBitmap = (
    globalThis as unknown as { createImageBitmap?: typeof createImageBitmap }
  ).createImageBitmap

  class MockOffscreenCanvas {
    public width: number
    public height: number
    constructor(width: number, height: number) {
      this.width = width
      this.height = height
    }

    getContext(
      contextType: '2d'
    ): { drawImage: (..._args: unknown[]) => void } | null {
      if (contextType !== '2d') return null
      return {
        drawImage: () => {
          // drawing not needed for test
        },
      }
    }

    async convertToBlob(opts: {
      type: string
      quality: number
    }): Promise<Blob> {
      const { type, quality } = opts
      const targetArea = Math.max(1, this.width * this.height)
      // areaFactor normalizes against a 100x100 baseline to avoid tiny numbers
      const areaFactor = Math.max(1, Math.round(targetArea / (100 * 100)))
      const clampedQuality = Math.max(0, Math.min(1, quality ?? 0.92))

      let simulatedSize = 0

      if (type === 'image/webp') {
        simulatedSize = Math.max(
          1,
          Math.round((lastInputFileSize / 10) * (1 - clampedQuality))
        )
      } else if (type === 'image/png' || type === 'image/gif') {
        simulatedSize =
          lastInputFileSize > 1_000_000
            ? Math.max(
                1,
                Math.round(
                  (lastInputFileSize / 15) * (1 - clampedQuality) * areaFactor
                )
              )
            : Math.max(1, Math.round(targetArea / 4)) // small png -> small constant-ish size
      } else if (type === 'image/jpeg' || type === 'image/jpg') {
        simulatedSize = Math.max(
          1,
          Math.round((lastInputFileSize / 12) * (1 - clampedQuality))
        )
      } else {
        throw new Error(
          `convertToBlob: unsupported/failed to convert type "${type}"`
        )
      }

      // create a blob with that many bytes
      const filler = new Uint8Array(simulatedSize).fill(120) // 'x' ~= 120
      return new Blob([filler], { type })
    }
  }

  // createImageBitmap mock returns an object with width/height and close()
  // Accept Blob/File/ArrayBuffer/Uint8Array — for our tests we only need width/height
  globalThis.createImageBitmap = (async (
    input: ImageBitmapSource
  ): Promise<ImageBitmap> => {
    // Provide simple width/height heuristics
    const fallback = { width: 100, height: 50 }

    try {
      if (input instanceof Blob) {
        if (input.type === 'image/heic') {
          throw new Error(
            `convertToBlob: unsupported/failed to convert type "${input.type}"`
          )
        }
        // infer size roughly from blob: tiny -> small dims, large -> larger dims
        // NOTE: Blob.size is available in test env
        const size = (input as Blob).size
        const width = Math.max(1, Math.round(Math.min(1_000, Math.sqrt(size))))
        const height = Math.max(1, Math.round(width / 2))
        return {
          width,
          height,
          close: () => {},
        } as unknown as ImageBitmap
      }

      if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
        const size =
          input instanceof ArrayBuffer
            ? input.byteLength
            : (input as unknown as Uint8Array).byteLength
        const width = Math.max(1, Math.round(Math.min(1_000, Math.sqrt(size))))
        const height = Math.max(1, Math.round(width / 2))
        return { width, height, close: () => {} } as unknown as ImageBitmap
      }

      // otherwise return fallback
      return {
        width: fallback.width,
        height: fallback.height,
        close: () => {},
      } as unknown as ImageBitmap
    } catch (e) {
      throw new Error(`${e}`)
    }
  }) as unknown as typeof createImageBitmap
  ;(globalThis as unknown as { OffscreenCanvas?: unknown }).OffscreenCanvas =
    MockOffscreenCanvas as unknown as typeof OffscreenCanvas

  function restore(): void {
    if (originalOffscreenCanvas === undefined) {
      delete (
        globalThis as unknown as { OffscreenCanvas?: typeof OffscreenCanvas }
      ).OffscreenCanvas
    } else {
      ;(
        globalThis as unknown as { OffscreenCanvas?: typeof OffscreenCanvas }
      ).OffscreenCanvas = originalOffscreenCanvas
    }

    if (originalCreateImageBitmap === undefined) {
      delete (
        globalThis as unknown as {
          createImageBitmap?: typeof createImageBitmap
        }
      ).createImageBitmap
    } else {
      ;(
        globalThis as unknown as {
          createImageBitmap?: typeof createImageBitmap
        }
      ).createImageBitmap = originalCreateImageBitmap
    }
  }

  function setLastInputFileSize(size: number): void {
    lastInputFileSize = Math.max(0, Math.floor(size))
  }

  return { setLastInputFileSize, restore }
}
