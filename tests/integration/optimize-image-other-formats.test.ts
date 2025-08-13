import { describe, it, afterAll, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { installOffscreenCanvasMock } from '../helpers/offscreen-mock'
import { optimizeImage } from '@/composables/useImageOptimizer'

const FIXTURES_DIR = path.resolve('tests', 'fixtures')
const FIXTURES_IMG_DIR = path.resolve(FIXTURES_DIR, 'images')

describe('integration (other formats): optimizeImage on real misc fixtures', () => {
  const mock = installOffscreenCanvasMock()

  afterAll(() => {
    mock.restore()
  })

  const textfileNames = fs.existsSync(FIXTURES_DIR)
    ? fs.readdirSync(FIXTURES_DIR).filter(f => /\.txt$/i.test(f))
    : []

  const heicfileNames = fs.existsSync(FIXTURES_IMG_DIR)
    ? fs.readdirSync(FIXTURES_IMG_DIR).filter(f => /\.heic$/i.test(f))
    : []

  const icofileNames = fs.existsSync(FIXTURES_IMG_DIR)
    ? fs.readdirSync(FIXTURES_IMG_DIR).filter(f => /\.ico$/i.test(f))
    : []

  it.each([...textfileNames])(
    `[Txt] does not optimize %s and returns same Blob than original`,
    async fileName => {
      const fullpath = path.join(FIXTURES_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'text/plain',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension).toBe('txt')

      mock.setLastInputFileSize(inputFile.size)

      const fileResult = await optimizeImage(inputFile, false)
      const resultBlob = fileResult.file
      const resultExtension = resultBlob.type.split('/').pop()?.toLowerCase()

      expect(resultExtension).toBe('plain')

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.type).toEqual(inputFile.type)
      expect(resultBlob.size).toBe(inputFile.size)
      expect(fileResult.success).toBe(false)
    }
  )

  it.each([...textfileNames])(
    `[Txt] does not optimize %s, does not convert to WebP format and returns same Blob than original`,
    async fileName => {
      const fullpath = path.join(FIXTURES_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'text/plain',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension).toBe('txt')

      mock.setLastInputFileSize(inputFile.size)

      const fileResult = await optimizeImage(inputFile, false)
      const resultBlob = fileResult.file
      const resultExtension = resultBlob.type.split('/').pop()?.toLowerCase()

      expect(resultExtension).toBe('plain')

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.type).toEqual(inputFile.type)
      expect(resultBlob.size).toBe(inputFile.size)
      expect(fileResult.success).toBe(false)
    }
  )

  it.each([...heicfileNames])(
    `[Heic] does not optimize %s and returns same Blob than original`,
    async fileName => {
      const fullpath = path.join(FIXTURES_IMG_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'image/heic',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension).toBe('heic')

      mock.setLastInputFileSize(inputFile.size)

      const fileResult = await optimizeImage(inputFile, false)
      const resultBlob = fileResult.file
      const resultExtension = resultBlob.type.split('/').pop()?.toLowerCase()

      expect(resultExtension).toBe('heic')

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.type).toEqual(inputFile.type)
      expect(resultBlob.size).toBe(inputFile.size)
      expect(fileResult.success).toBe(false)
    }
  )

  it.only.each([...heicfileNames])(
    `[Heic] does not optimize %s, does not convert to WebP format and returns same Blob than original`,
    async fileName => {
      const fullpath = path.join(FIXTURES_IMG_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'image/heic',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension).toBe('heic')

      mock.setLastInputFileSize(inputFile.size)

      const fileResult = await optimizeImage(inputFile, true)
      const resultBlob = fileResult.file
      const resultExtension = resultBlob.type.split('/').pop()?.toLowerCase()

      expect(resultExtension).toBe('heic')

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.type).toEqual(inputFile.type)
      expect(resultBlob.size).toBe(inputFile.size)
      expect(fileResult.success).toBe(false)
    }
  )

  it.each([...icofileNames])(
    `[Ico] does not optimize %s and returns same Blob than original`,
    async fileName => {
      const fullpath = path.join(FIXTURES_IMG_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'image/x-icon',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension).toBe('ico')

      mock.setLastInputFileSize(inputFile.size)

      const fileResult = await optimizeImage(inputFile, false)
      const resultBlob = fileResult.file
      const resultExtension = resultBlob.type.split('/').pop()?.toLowerCase()

      expect(resultExtension).toBe('x-icon')

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.type).toEqual(inputFile.type)
      expect(resultBlob.size).toBe(inputFile.size)
      expect(fileResult.success).toBe(false)
    }
  )

  it.each([...icofileNames])(
    `[Ico] does not optimize %s, converts to WebP format and returns same Blob than original`,
    async fileName => {
      const fullpath = path.join(FIXTURES_IMG_DIR, fileName)
      const buffer = fs.readFileSync(fullpath)
      const inputFile = new File([new Uint8Array(buffer)], fileName, {
        type: 'image/x-icon',
      })

      const fileNameExtension = fileName.split('.').pop()?.toLowerCase()
      expect(fileNameExtension).toBe('ico')

      mock.setLastInputFileSize(inputFile.size)

      const fileResult = await optimizeImage(inputFile, true)
      const resultBlob = fileResult.file
      const resultExtension = resultBlob.type.split('/').pop()?.toLowerCase()

      expect(resultExtension).toBe('webp')

      expect(resultBlob).toBeInstanceOf(Blob)
      expect(resultBlob.type).not.toEqual(inputFile.type)
      expect(resultBlob.size).toBeLessThanOrEqual(inputFile.size)
      expect(resultBlob.size).toBeGreaterThan(0)
      expect(fileResult.success).toBe(true)
    }
  )
})
