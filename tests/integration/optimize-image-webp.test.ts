import { describe, it, afterAll, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { installOffscreenCanvasMock } from '../helpers/offscreen-mock'
import { optimizeImage } from '@/composables/useImageOptimizer'

const FIXTURES_DIR = path.resolve('tests', 'fixtures', 'images')

describe('integration (webp): optimizeImage on real WEBP fixtures', () => {
  const mock = installOffscreenCanvasMock()

  afterAll(() => {
    mock.restore()
  })

  const fileNames = fs.existsSync(FIXTURES_DIR)
    ? fs.readdirSync(FIXTURES_DIR).filter(f => /\.webp$/i.test(f))
    : []

  it.each([...fileNames])(
    `optimizes %s and returns Blob not larger than original`,
    async fileName => {
      const fullpath = path.join(FIXTURES_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'image/webp',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension === 'webp').toBe(true)

      mock.setLastInputFileSize(inputFile.size)

      const result = await optimizeImage(inputFile, false)
      const resultExtension = result.type.split('/').pop()?.toLowerCase()
      expect(resultExtension === 'webp').toBe(true)
      expect(result.type).toEqual(inputFile.type)

      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeLessThan(inputFile.size)
      expect(result.size).toBeGreaterThan(0)
    }
  )

  it.each([...fileNames])(
    `optimizes %s, converts to WebP format and returns Blob not larger than original`,
    async fileName => {
      const fullpath = path.join(FIXTURES_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'image/webp',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension === 'webp').toBe(true)

      mock.setLastInputFileSize(inputFile.size)

      const result = await optimizeImage(inputFile, true)
      const resultExtension = result.type.split('/').pop()?.toLowerCase()
      expect(resultExtension === 'webp').toBe(true)
      expect(result.type).toEqual(inputFile.type)

      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeLessThan(inputFile.size)
      expect(result.size).toBeGreaterThan(0)
    }
  )
})
