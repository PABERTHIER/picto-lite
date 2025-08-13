import { describe, it, afterAll, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { installOffscreenCanvasMock } from '../helpers/offscreen-mock'
import { optimizeImage } from '@/composables/useImageOptimizer'

const FIXTURES_DIR = path.resolve('tests', 'fixtures', 'images')
const PNG_SIZE_LIMIT = 1_000_000

describe('integration (png): optimizeImage on real PNG fixtures', () => {
  const mock = installOffscreenCanvasMock()

  afterAll(() => {
    mock.restore()
  })

  const fileNames = fs.existsSync(FIXTURES_DIR)
    ? fs.readdirSync(FIXTURES_DIR).filter(f => /\.png$/i.test(f))
    : []

  it.each([...fileNames])(
    `optimizes %s and returns Blob (or original)`,
    async fileName => {
      const fullpath = path.join(FIXTURES_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'image/png',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension).toBe('png')

      mock.setLastInputFileSize(inputFile.size)

      const fileResult = await optimizeImage(inputFile, false)
      const resultBlob = fileResult.file
      const resultExtension = resultBlob.type.split('/').pop()?.toLowerCase()

      expect(resultExtension).toBe('png')

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.type).toEqual(inputFile.type)
      expect(fileResult.success).toBe(true)

      if (inputFile.size <= PNG_SIZE_LIMIT) {
        expect(resultBlob.size).toEqual(inputFile.size)
      } else {
        expect(resultBlob.size).toBeLessThan(inputFile.size)
        expect(resultBlob.size).toBeGreaterThan(0)
      }
    }
  )

  it.each([...fileNames])(
    `optimizes %s, converts to WebP format and returns Blob (or original)`,
    async fileName => {
      const fullpath = path.join(FIXTURES_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'image/png',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension).toBe('png')

      mock.setLastInputFileSize(inputFile.size)

      const fileResult = await optimizeImage(inputFile, true)
      const resultBlob = fileResult.file
      const resultExtension = resultBlob.type.split('/').pop()?.toLowerCase()

      expect(resultExtension).toBe('webp')

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.type).not.toEqual(inputFile.type)
      expect(fileResult.success).toBe(true)

      if (inputFile.size <= PNG_SIZE_LIMIT) {
        expect(resultBlob.size).not.toEqual(inputFile.size)
        expect(resultBlob.size).toBeLessThan(PNG_SIZE_LIMIT)
        expect(resultBlob.size).toBeGreaterThan(0)
      } else {
        expect(resultBlob.size).toBeLessThan(inputFile.size)
        expect(resultBlob.size).toBeGreaterThan(0)
      }
    }
  )
})
