import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ImageUploader from '@/components/ImageUploader.vue'
import type { FilePickerOptions, ShowSaveFilePicker } from '~/types/file-picker'

const globalWithShowSaveFilePicker = global as typeof globalThis & {
  showSaveFilePicker?: ShowSaveFilePicker
}

// Wait for microtasks/macrotasks used in the component async flows
const waitForPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

mockNuxtImport('optimizeImage', () => {
  return async (_file: File, _convert: boolean) => {
    let mimeType = _file.type
    let blobSize = 0
    let success = false

    if (mimeType === 'image/png' || mimeType === 'image/webp') {
      blobSize = 1_500
      success = true
    } else if (mimeType === 'image/jpg') {
      blobSize = 10_100_500
      success = true
    } else {
      blobSize = 3_500
      success = false
    }

    if (_convert && success) {
      mimeType = 'image/webp'
      blobSize = Math.floor(blobSize / 2.33)
    }

    return {
      file: new Blob([new Uint8Array(blobSize)], { type: mimeType }),
      success,
    }
  }
})

describe('ImageUploader component', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Ensure FS Access API is unset by default
    delete globalWithShowSaveFilePicker.showSaveFilePicker

    // Stub URL.createObjectURL to avoid real blob URL creation side-effects
    globalWithShowSaveFilePicker.URL = globalWithShowSaveFilePicker.URL ?? URL
    globalWithShowSaveFilePicker.URL.createObjectURL = vi.fn(
      () => 'blob:fake-url'
    )
  })

  it('renders correctly', async () => {
    const wrapper = await mountSuspended(ImageUploader)

    expect(wrapper.exists()).toBe(true)
  })

  it('has the correct structure', async () => {
    const wrapper = await mountSuspended(ImageUploader)

    const uploaderContainer = wrapper.find('.uploader-container')

    expect(uploaderContainer.exists()).toBe(true)
    expect(uploaderContainer.element.children).toHaveLength(4) // The progress bar is hidden by default

    const [input, dropZone, webpOption, resultsList] = Array.from(
      uploaderContainer.element.children
    )

    expect(input).toBeTruthy()
    expect(input?.id).toBe('upload-input')

    expect(dropZone?.className).toBe('drop-zone')
    expect(dropZone?.children).toHaveLength(2)

    const [description, supportedFormats] = Array.from(dropZone!.children)

    expect(description?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.drop_zone_description')
    )

    expect(supportedFormats?.className).toBe('supported-formats')
    expect(supportedFormats?.textContent).toBe(
      useNuxtApp().$i18n.t(
        'components.image_uploader.drop_zone_supported_formats'
      )
    )

    expect(webpOption?.className).toBe('webp-option-container')
    expect(webpOption?.children).toHaveLength(2)

    const [webpInput, webpInputName] = Array.from(webpOption!.children)

    expect(webpInput?.id).toBe('webp-convert')

    expect(webpInputName?.className).toBe('name')
    expect(webpInputName?.textContent).toBe(
      useNuxtApp().$i18n.t(
        'components.image_uploader.webp_option_checkbox_name'
      )
    )

    expect(resultsList?.className).toBe('results-list')
    expect(resultsList?.children).toHaveLength(0)
  })

  it('handles file input change and populates results, progress and sizes', async () => {
    const file = new File([new Uint8Array(20_800_800)], 'image.jpg', {
      type: 'image/jpg',
    })

    const wrapper = await mountSuspended(ImageUploader)

    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    const inputElement = input.element as HTMLInputElement

    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')

    await waitForPromises()

    const uploaderContainer = wrapper.find('.uploader-container')

    expect(uploaderContainer.exists()).toBe(true)
    expect(uploaderContainer.element.children).toHaveLength(5) // The progress bar is visible

    const [uploaderInput, dropZone, webpOption, progressBar, resultsList] =
      Array.from(uploaderContainer.element.children)

    expect(uploaderInput).toBeTruthy()
    expect(uploaderInput?.id).toBe('upload-input')

    expect(dropZone?.className).toBe('drop-zone')
    expect(dropZone?.children).toHaveLength(2)

    const [description, supportedFormats] = Array.from(dropZone!.children)

    expect(description?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.drop_zone_description')
    )

    expect(supportedFormats?.className).toBe('supported-formats')
    expect(supportedFormats?.textContent).toBe(
      useNuxtApp().$i18n.t(
        'components.image_uploader.drop_zone_supported_formats'
      )
    )

    expect(webpOption?.className).toBe('webp-option-container')
    expect(webpOption?.children).toHaveLength(2)

    const [webpInput, webpInputName] = Array.from(webpOption!.children)

    expect(webpInput?.id).toBe('webp-convert')

    expect(webpInputName?.className).toBe('name')
    expect(webpInputName?.textContent).toBe(
      useNuxtApp().$i18n.t(
        'components.image_uploader.webp_option_checkbox_name'
      )
    )

    expect(progressBar?.className).toBe('progress-container')
    expect(progressBar?.children).toHaveLength(2)

    const [progressBarContainer, progressBarText] = Array.from(
      progressBar!.children
    )

    expect(progressBarContainer?.className).toBe('progress-bar-container')
    expect(progressBarContainer?.children).toHaveLength(1)

    const [progress] = Array.from(progressBarContainer!.children)

    expect(progress?.className).toBe('progress-bar')
    const progressBarElement = wrapper.find('.progress-bar')
      .element as HTMLElement
    expect(progressBarElement.style.width).toBe('100%')

    expect(progressBarText?.className).toBe('progress-text')
    expect(progressBarText?.textContent).toBe('1 / 1')

    expect(resultsList?.className).toBe('results-list')
    expect(resultsList?.children).toHaveLength(1)

    const [resultsListItem] = Array.from(resultsList!.children)

    expect(resultsListItem?.className).toBe('results-list-item')
    expect(resultsListItem?.children).toHaveLength(2)

    const [itemDetails, downloadButton] = Array.from(resultsListItem!.children)

    expect(itemDetails?.className).toBe('item-details')
    expect(itemDetails?.children).toHaveLength(2)

    const [name, size] = Array.from(itemDetails!.children)

    expect(name?.className).toBe('item-name')
    expect(name?.textContent).toBe('image.jpg')
    expect(size?.className).toBe('item-size')
    expect(size?.textContent).toBe(
      `19.84 MB → 9.63 MB (51% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')}) `
    )

    expect(downloadButton?.className).toBe('download-button')
    expect(downloadButton?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )
  })

  it('handles multi files input change and populates results, progress and sizes', async () => {
    const pngImage = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

    // Not supported format
    const heicImage = new File([new Uint8Array(3_500)], 'image.heic', {
      type: 'image/heic',
    })

    const jpgImage = new File([new Uint8Array(20_100_000)], 'image.jpg', {
      type: 'image/jpg',
    })

    const wrapper = await mountSuspended(ImageUploader)

    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    const inputElement = input.element as HTMLInputElement

    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(pngImage)
    dataTransfer.items.add(heicImage)
    dataTransfer.items.add(jpgImage)
    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')

    await waitForPromises()

    const uploaderContainer = wrapper.find('.uploader-container')

    expect(uploaderContainer.exists()).toBe(true)
    expect(uploaderContainer.element.children).toHaveLength(5) // The progress bar is visible

    const [uploaderInput, dropZone, webpOption, progressBar, resultsList] =
      Array.from(uploaderContainer.element.children)

    expect(uploaderInput).toBeTruthy()
    expect(uploaderInput?.id).toBe('upload-input')

    expect(dropZone?.className).toBe('drop-zone')
    expect(dropZone?.children).toHaveLength(2)

    const [description, supportedFormats] = Array.from(dropZone!.children)

    expect(description?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.drop_zone_description')
    )

    expect(supportedFormats?.className).toBe('supported-formats')
    expect(supportedFormats?.textContent).toBe(
      useNuxtApp().$i18n.t(
        'components.image_uploader.drop_zone_supported_formats'
      )
    )

    expect(webpOption?.className).toBe('webp-option-container')
    expect(webpOption?.children).toHaveLength(2)

    const [webpInput, webpInputName] = Array.from(webpOption!.children)

    expect(webpInput?.id).toBe('webp-convert')

    expect(webpInputName?.className).toBe('name')
    expect(webpInputName?.textContent).toBe(
      useNuxtApp().$i18n.t(
        'components.image_uploader.webp_option_checkbox_name'
      )
    )

    expect(progressBar?.className).toBe('progress-container')
    expect(progressBar?.children).toHaveLength(2)

    const [progressBarContainer, progressBarText] = Array.from(
      progressBar!.children
    )

    expect(progressBarContainer?.className).toBe('progress-bar-container')
    expect(progressBarContainer?.children).toHaveLength(1)

    const [progress] = Array.from(progressBarContainer!.children)

    expect(progress?.className).toBe('progress-bar')
    const progressBarElement = wrapper.find('.progress-bar')
      .element as HTMLElement
    expect(progressBarElement.style.width).toBe('100%')

    expect(progressBarText?.className).toBe('progress-text')
    expect(progressBarText?.textContent).toBe('3 / 3')

    expect(resultsList?.className).toBe('results-list')
    expect(resultsList?.children).toHaveLength(3)

    const [resultsListItemPng, resultsListItemHeic, resultsListItemJpg] =
      Array.from(resultsList!.children)

    expect(resultsListItemPng?.className).toBe('results-list-item')
    expect(resultsListItemPng?.children).toHaveLength(2)

    const [itemDetailsPng, downloadButtonPng] = Array.from(
      resultsListItemPng!.children
    )

    expect(itemDetailsPng?.className).toBe('item-details')
    expect(itemDetailsPng?.children).toHaveLength(2)

    const [namePng, sizePng] = Array.from(itemDetailsPng!.children)

    expect(namePng?.className).toBe('item-name')
    expect(namePng?.textContent).toBe('image.png')
    expect(sizePng?.className).toBe('item-size')
    expect(sizePng?.textContent).toBe(
      `2.9 KB → 1.5 KB (50% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')}) `
    )

    expect(downloadButtonPng?.className).toBe('download-button')
    expect(downloadButtonPng?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )

    expect(resultsListItemHeic?.className).toBe('results-list-item')
    expect(resultsListItemHeic?.children).toHaveLength(2)

    const [itemDetailsHeic, downloadButtonHeic] = Array.from(
      resultsListItemHeic!.children
    )

    expect(itemDetailsHeic?.className).toBe('item-details')
    expect(itemDetailsHeic?.children).toHaveLength(3)

    const [nameHeic, sizeHeic, unsupportedFormatHeic] = Array.from(
      itemDetailsHeic!.children
    )

    expect(nameHeic?.className).toBe('item-name')
    expect(nameHeic?.textContent).toBe('image.heic')
    expect(sizeHeic?.className).toBe('item-size')
    expect(sizeHeic?.textContent).toBe(
      `3.4 KB → 3.4 KB (0% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')}) `
    )
    expect(unsupportedFormatHeic?.className).toBe('unsupported-format')
    expect(unsupportedFormatHeic?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.unsupported_format')
    )

    expect(downloadButtonHeic?.className).toBe('download-button')
    expect(downloadButtonHeic?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )

    expect(resultsListItemJpg?.className).toBe('results-list-item')
    expect(resultsListItemJpg?.children).toHaveLength(2)

    const [itemDetailsJpg, downloadButtonJpg] = Array.from(
      resultsListItemJpg!.children
    )

    expect(itemDetailsJpg?.className).toBe('item-details')
    expect(itemDetailsJpg?.children).toHaveLength(2)

    const [nameJpg, sizeJpg] = Array.from(itemDetailsJpg!.children)

    expect(nameJpg?.className).toBe('item-name')
    expect(nameJpg?.textContent).toBe('image.jpg')
    expect(sizeJpg?.className).toBe('item-size')
    expect(sizeJpg?.textContent).toBe(
      `19.17 MB → 9.63 MB (50% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')}) `
    )

    expect(downloadButtonJpg?.className).toBe('download-button')
    expect(downloadButtonJpg?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )
  })

  it('converts file into WebP format', async () => {
    const jpgImage = new File([new Uint8Array(20_800_800)], 'image.jpg', {
      type: 'image/jpg',
    })

    // Not supported format
    const heicImage = new File([new Uint8Array(3_500)], 'image.heic', {
      type: 'image/heic',
    })

    const wrapper = await mountSuspended(ImageUploader)

    const webpConvertCheckbox = wrapper.find('input[id="webp-convert"]')
    expect(webpConvertCheckbox.exists()).toBe(true)
    webpConvertCheckbox.setValue(true)

    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    const inputElement = input.element as HTMLInputElement

    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(jpgImage)
    dataTransfer.items.add(heicImage)
    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')

    await waitForPromises()

    const uploaderContainer = wrapper.find('.uploader-container')

    expect(uploaderContainer.exists()).toBe(true)
    expect(uploaderContainer.element.children).toHaveLength(5) // The progress bar is visible

    const [uploaderInput, dropZone, webpOption, progressBar, resultsList] =
      Array.from(uploaderContainer.element.children)

    expect(uploaderInput).toBeTruthy()
    expect(uploaderInput?.id).toBe('upload-input')

    expect(dropZone?.className).toBe('drop-zone')
    expect(dropZone?.children).toHaveLength(2)

    const [description, supportedFormats] = Array.from(dropZone!.children)

    expect(description?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.drop_zone_description')
    )

    expect(supportedFormats?.className).toBe('supported-formats')
    expect(supportedFormats?.textContent).toBe(
      useNuxtApp().$i18n.t(
        'components.image_uploader.drop_zone_supported_formats'
      )
    )

    expect(webpOption?.className).toBe('webp-option-container')
    expect(webpOption?.children).toHaveLength(2)

    const [webpInput, webpInputName] = Array.from(webpOption!.children)

    expect(webpInput?.id).toBe('webp-convert')

    expect(webpInputName?.className).toBe('name')
    expect(webpInputName?.textContent).toBe(
      useNuxtApp().$i18n.t(
        'components.image_uploader.webp_option_checkbox_name'
      )
    )

    expect(progressBar?.className).toBe('progress-container')
    expect(progressBar?.children).toHaveLength(2)

    const [progressBarContainer, progressBarText] = Array.from(
      progressBar!.children
    )

    expect(progressBarContainer?.className).toBe('progress-bar-container')
    expect(progressBarContainer?.children).toHaveLength(1)

    const [progress] = Array.from(progressBarContainer!.children)

    expect(progress?.className).toBe('progress-bar')
    const progressBarElement = wrapper.find('.progress-bar')
      .element as HTMLElement
    expect(progressBarElement.style.width).toBe('100%')

    expect(progressBarText?.className).toBe('progress-text')
    expect(progressBarText?.textContent).toBe('2 / 2')

    expect(resultsList?.className).toBe('results-list')
    expect(resultsList?.children).toHaveLength(2)

    const [resultsListItemJpg, resultsListItemHeic] = Array.from(
      resultsList!.children
    )

    expect(resultsListItemJpg?.className).toBe('results-list-item')
    expect(resultsListItemJpg?.children).toHaveLength(2)

    const [itemDetailsJpg, downloadButtonJpg] = Array.from(
      resultsListItemJpg!.children
    )

    expect(itemDetailsJpg?.className).toBe('item-details')
    expect(itemDetailsJpg?.children).toHaveLength(2)

    const [nameJpg, sizeJpg] = Array.from(itemDetailsJpg!.children)

    expect(nameJpg?.className).toBe('item-name')
    expect(nameJpg?.textContent).toBe('image.webp')
    expect(sizeJpg?.className).toBe('item-size')
    expect(sizeJpg?.textContent).toBe(
      `19.84 MB → 4.13 MB (79% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')}) `
    )

    expect(downloadButtonJpg?.className).toBe('download-button')
    expect(downloadButtonJpg?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )

    expect(resultsListItemHeic?.className).toBe('results-list-item')
    expect(resultsListItemHeic?.children).toHaveLength(2)

    const [itemDetailsHeic, downloadButtonHeic] = Array.from(
      resultsListItemHeic!.children
    )

    expect(itemDetailsHeic?.className).toBe('item-details')
    expect(itemDetailsHeic?.children).toHaveLength(3)

    const [nameHeic, sizeHeic, unsupportedFormatHeic] = Array.from(
      itemDetailsHeic!.children
    )

    expect(nameHeic?.className).toBe('item-name')
    expect(nameHeic?.textContent).toBe('image.heic')
    expect(sizeHeic?.className).toBe('item-size')
    expect(sizeHeic?.textContent).toBe(
      `3.4 KB → 3.4 KB (0% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')}) `
    )
    expect(unsupportedFormatHeic?.className).toBe('unsupported-format')
    expect(unsupportedFormatHeic?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.unsupported_format')
    )

    expect(downloadButtonHeic?.className).toBe('download-button')
    expect(downloadButtonHeic?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )
  })

  it('toggles drag hover class on dragover/dragleave', async () => {
    const wrapper = await mountSuspended(ImageUploader)
    const dropZone = wrapper.find('.drop-zone')

    await dropZone.trigger('dragover')
    expect(dropZone.classes()).toContain('drag-hover')

    await dropZone.trigger('dragleave')
    expect(dropZone.classes()).not.toContain('drag-hover')
  })

  it('does nothing when input change contains no files', async () => {
    const wrapper = await mountSuspended(ImageUploader, {
      attachTo: document.body,
    })
    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement

    const dataTransfer = new DataTransfer()
    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')
    await waitForPromises()

    const items = wrapper.findAll('.results-list-item')
    expect(items.length).toBe(0)
  })

  it('processes files when dropped and clears drag hover', async () => {
    const file = new File([new Uint8Array(2048)], 'dropped.png', {
      type: 'image/png',
    })
    const wrapper = await mountSuspended(ImageUploader, {
      attachTo: document.body,
    })
    const zone = wrapper.find('.drop-zone')

    await zone.trigger('dragover')
    expect(zone.classes()).toContain('drag-hover')

    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)

    await zone.trigger('drop', { dataTransfer: dataTransfer })

    await waitForPromises()

    const items = wrapper.findAll('.results-list-item')
    expect(items.length).toBe(1)

    expect(zone.classes()).not.toContain('drag-hover')
  })

  it('does not process when no file dropped', async () => {
    const wrapper = await mountSuspended(ImageUploader, {
      attachTo: document.body,
    })
    const zone = wrapper.find('.drop-zone')

    await zone.trigger('dragover')
    expect(zone.classes()).toContain('drag-hover')

    const dataTransfer = new DataTransfer()

    await zone.trigger('drop', { dataTransfer: dataTransfer })

    await waitForPromises()

    const items = wrapper.findAll('.results-list-item')
    expect(items.length).toBe(0)

    expect(zone.classes()).not.toContain('drag-hover')
  })

  it('drop zone click triggers input click and input attributes are correct', async () => {
    const wrapper = await mountSuspended(ImageUploader, {
      attachTo: document.body,
    })
    const input = wrapper.find('input[type="file"]')
    const clickSpy = vi.fn()
    ;(input.element as HTMLInputElement).click = clickSpy

    const zone = wrapper.find('.drop-zone')
    await zone.trigger('click')

    expect(clickSpy).toHaveBeenCalled()
    expect(input.attributes('accept')).toBe('image/*')
    expect((input.element as HTMLInputElement).multiple).toBe(true)
    expect((input.element as HTMLInputElement).hidden).toBe(true)
  })

  it('uses File System Access API when available for downloadImage', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.jpg', {
      type: 'image/jpg',
    })

    // Mock the FS Access API objects
    const writeSpy = vi.fn(async () => undefined)
    const closeSpy = vi.fn(async () => undefined)
    const createWritableSpy = vi.fn(async () => ({
      write: writeSpy,
      close: closeSpy,
    }))
    const handleMock = { createWritable: createWritableSpy }
    const showSaveFilePickerMock = vi.fn(
      async (_opts?: FilePickerOptions) => handleMock
    )
    globalWithShowSaveFilePicker.showSaveFilePicker =
      showSaveFilePickerMock as unknown as ShowSaveFilePicker

    const wrapper = await mountSuspended(ImageUploader)

    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')
    await waitForPromises()

    const button = wrapper.find('.download-button')
    await button.trigger('click')

    await waitForPromises()

    expect(globalWithShowSaveFilePicker.showSaveFilePicker).toHaveBeenCalled()
    expect(createWritableSpy).toHaveBeenCalled()
    expect(writeSpy).toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalled()
  })

  it('falls back to anchor download when FS Access API is not available', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.jpg', {
      type: 'image/jpg',
    })

    // Ensure FS API is not present
    delete globalWithShowSaveFilePicker.showSaveFilePicker

    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')

    const wrapper = await mountSuspended(ImageUploader)

    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')
    await waitForPromises()

    const button = wrapper.find('.download-button')
    await button.trigger('click')

    await waitForPromises()

    expect(appendSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()

    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('downloadImage falls back to anchor when showSaveFilePicker throws', async () => {
    const file = new File([new Uint8Array(3000)], 'photo.png', {
      type: 'image/png',
    })

    ;(
      globalThis as unknown as { showSaveFilePicker?: unknown }
    ).showSaveFilePicker = vi.fn(async () => {
      throw new Error('Simulated File System Access API not supported')
    })

    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')

    const wrapper = await mountSuspended(ImageUploader, {
      attachTo: document.body,
    })

    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')
    await waitForPromises()

    const downloadButton = wrapper.find('.download-button')
    await downloadButton.trigger('click')

    await waitForPromises()

    expect(
      (globalThis as unknown as { showSaveFilePicker?: { apply?: unknown } })
        .showSaveFilePicker
    ).toHaveBeenCalled()

    // Fallback should have been used
    expect(appendSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(
      (globalThis as unknown as { URL: { createObjectURL: unknown } }).URL
        .createObjectURL
    ).toHaveBeenCalled()

    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
