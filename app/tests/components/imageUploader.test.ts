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

const defaultOptimizeImageMockImpl = async (_file: File, _convert: boolean) => {
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

const mockOptimizeImage = vi.hoisted(() => vi.fn())
mockNuxtImport('optimizeImage', () => mockOptimizeImage)

describe('ImageUploader component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockOptimizeImage.mockImplementation(defaultOptimizeImageMockImpl)

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

  it('has totalFiles equal to 0 on mount', async () => {
    const wrapper = await mountSuspended(ImageUploader)

    expect(wrapper.find('.progress-container').exists()).toBe(false)
    expect(wrapper.findAll('.results-list-item').length).toBe(0)
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
    expect(uploaderContainer.element.children).toHaveLength(6) // The progress bar is visible

    const [
      uploaderInput,
      dropZone,
      webpOption,
      progressBar,
      bulkActions,
      resultsList,
    ] = Array.from(uploaderContainer.element.children)

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

    expect(bulkActions?.className).toBe('bulk-actions')
    expect(bulkActions?.children).toHaveLength(2)

    const [downloadAllButton, clearAllButton] = Array.from(
      bulkActions!.children
    )
    expect(downloadAllButton?.className).toBe('download-all-button')
    expect(downloadAllButton?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_all_wording')
    )
    expect(clearAllButton?.className).toBe('clear-all-button')
    expect(clearAllButton?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.clear_all_wording')
    )

    expect(resultsList?.className).toBe('results-list')
    expect(resultsList?.children).toHaveLength(1)

    const [resultsListItem] = Array.from(resultsList!.children)

    expect(resultsListItem?.className).toBe('results-list-item')
    expect(resultsListItem?.children).toHaveLength(2)

    const [itemDetails, itemActions] = Array.from(resultsListItem!.children)

    expect(itemDetails?.className).toBe('item-details')
    expect(itemDetails?.children).toHaveLength(2)

    const [name, size] = Array.from(itemDetails!.children)

    expect(name?.className).toBe('item-name')
    expect(name?.textContent).toBe('image.jpg')
    expect(size?.className).toBe('item-size reduction-good')
    expect(size?.textContent).toBe(
      `19.84 MB → 9.63 MB (51% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')})`
    )

    expect(itemActions?.className).toBe('item-actions')
    expect(itemActions?.children).toHaveLength(3)

    const [previewButton, downloadButton, deleteButton] = Array.from(
      itemActions!.children
    )

    expect(previewButton?.className).toBe('preview-button')
    expect(previewButton?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.preview_image_wording')
    )

    expect(downloadButton?.className).toBe('download-button')
    expect(downloadButton?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )

    expect(deleteButton?.className).toBe('delete-button')
    expect(deleteButton?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.delete_item_wording')
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
    expect(uploaderContainer.element.children).toHaveLength(6) // The progress bar is visible

    const [
      uploaderInput,
      dropZone,
      webpOption,
      progressBar,
      bulkActions,
      resultsList,
    ] = Array.from(uploaderContainer.element.children)

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

    expect(bulkActions?.className).toBe('bulk-actions')
    expect(bulkActions?.children).toHaveLength(2)

    const [downloadAllButton, clearAllButton] = Array.from(
      bulkActions!.children
    )
    expect(downloadAllButton?.className).toBe('download-all-button')
    expect(downloadAllButton?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_all_wording')
    )
    expect(clearAllButton?.className).toBe('clear-all-button')
    expect(clearAllButton?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.clear_all_wording')
    )

    expect(resultsList?.className).toBe('results-list')
    expect(resultsList?.children).toHaveLength(3)

    const [resultsListItemPng, resultsListItemHeic, resultsListItemJpg] =
      Array.from(resultsList!.children)

    expect(resultsListItemPng?.className).toBe('results-list-item')
    expect(resultsListItemPng?.children).toHaveLength(2)

    const [itemDetailsPng, itemActionsPng] = Array.from(
      resultsListItemPng!.children
    )

    expect(itemDetailsPng?.className).toBe('item-details')
    expect(itemDetailsPng?.children).toHaveLength(2)

    const [namePng, sizePng] = Array.from(itemDetailsPng!.children)

    expect(namePng?.className).toBe('item-name')
    expect(namePng?.textContent).toBe('image.png')
    expect(sizePng?.className).toBe('item-size reduction-good')
    expect(sizePng?.textContent).toBe(
      `2.9 KB → 1.5 KB (50% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')})`
    )

    expect(itemActionsPng?.className).toBe('item-actions')
    expect(itemActionsPng?.children).toHaveLength(3)

    const [previewButtonPng, downloadButtonPng, deleteButtonPng] = Array.from(
      itemActionsPng!.children
    )

    expect(previewButtonPng?.className).toBe('preview-button')
    expect(previewButtonPng?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.preview_image_wording')
    )

    expect(downloadButtonPng?.className).toBe('download-button')
    expect(downloadButtonPng?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )

    expect(deleteButtonPng?.className).toBe('delete-button')
    expect(deleteButtonPng?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.delete_item_wording')
    )

    expect(resultsListItemHeic?.className).toBe('results-list-item')
    expect(resultsListItemHeic?.children).toHaveLength(2)

    const [itemDetailsHeic, itemActionsHeic] = Array.from(
      resultsListItemHeic!.children
    )

    expect(itemDetailsHeic?.className).toBe('item-details')
    expect(itemDetailsHeic?.children).toHaveLength(3)

    const [nameHeic, sizeHeic, unsupportedFormatHeic] = Array.from(
      itemDetailsHeic!.children
    )

    expect(nameHeic?.className).toBe('item-name')
    expect(nameHeic?.textContent).toBe('image.heic')
    expect(sizeHeic?.className).toBe('item-size reduction-none')
    expect(sizeHeic?.textContent).toBe(
      `3.4 KB → 3.4 KB (0% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')})`
    )
    expect(unsupportedFormatHeic?.className).toBe('unsupported-format')
    expect(unsupportedFormatHeic?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.unsupported_format')
    )

    expect(itemActionsHeic?.className).toBe('item-actions')
    expect(itemActionsHeic?.children).toHaveLength(2)

    const [downloadButtonHeic, deleteButtonHeic] = Array.from(
      itemActionsHeic!.children
    )

    expect(downloadButtonHeic?.className).toBe('download-button')
    expect(downloadButtonHeic?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )

    expect(deleteButtonHeic?.className).toBe('delete-button')
    expect(deleteButtonHeic?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.delete_item_wording')
    )

    expect(resultsListItemJpg?.className).toBe('results-list-item')
    expect(resultsListItemJpg?.children).toHaveLength(2)

    const [itemDetailsJpg, itemActionsJpg] = Array.from(
      resultsListItemJpg!.children
    )

    expect(itemDetailsJpg?.className).toBe('item-details')
    expect(itemDetailsJpg?.children).toHaveLength(2)

    const [nameJpg, sizeJpg] = Array.from(itemDetailsJpg!.children)

    expect(nameJpg?.className).toBe('item-name')
    expect(nameJpg?.textContent).toBe('image.jpg')
    expect(sizeJpg?.className).toBe('item-size reduction-good')
    expect(sizeJpg?.textContent).toBe(
      `19.17 MB → 9.63 MB (50% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')})`
    )

    expect(itemActionsJpg?.className).toBe('item-actions')
    expect(itemActionsJpg?.children).toHaveLength(3)

    const [previewButtonJpg, downloadButtonJpg, deleteButtonJpg] = Array.from(
      itemActionsJpg!.children
    )

    expect(previewButtonJpg?.className).toBe('preview-button')
    expect(previewButtonJpg?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.preview_image_wording')
    )

    expect(downloadButtonJpg?.className).toBe('download-button')
    expect(downloadButtonJpg?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )

    expect(deleteButtonJpg?.className).toBe('delete-button')
    expect(deleteButtonJpg?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.delete_item_wording')
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
    await webpConvertCheckbox.setValue(true)

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
    expect(uploaderContainer.element.children).toHaveLength(6) // The progress bar is visible

    const [
      uploaderInput,
      dropZone,
      webpOption,
      progressBar,
      bulkActions,
      resultsList,
    ] = Array.from(uploaderContainer.element.children)

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

    expect(bulkActions?.className).toBe('bulk-actions')
    expect(bulkActions?.children).toHaveLength(2)

    const [downloadAllButton, clearAllButton] = Array.from(
      bulkActions!.children
    )
    expect(downloadAllButton?.className).toBe('download-all-button')
    expect(downloadAllButton?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_all_wording')
    )
    expect(clearAllButton?.className).toBe('clear-all-button')
    expect(clearAllButton?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.clear_all_wording')
    )

    expect(resultsList?.className).toBe('results-list')
    expect(resultsList?.children).toHaveLength(2)

    const [resultsListItemJpg, resultsListItemHeic] = Array.from(
      resultsList!.children
    )

    expect(resultsListItemJpg?.className).toBe('results-list-item')
    expect(resultsListItemJpg?.children).toHaveLength(2)

    const [itemDetailsJpg, itemActionsJpg] = Array.from(
      resultsListItemJpg!.children
    )

    expect(itemDetailsJpg?.className).toBe('item-details')
    expect(itemDetailsJpg?.children).toHaveLength(2)

    const [nameJpg, sizeJpg] = Array.from(itemDetailsJpg!.children)

    expect(nameJpg?.className).toBe('item-name')
    expect(nameJpg?.textContent).toBe('image.webp')
    expect(sizeJpg?.className).toBe('item-size reduction-good')
    expect(sizeJpg?.textContent).toBe(
      `19.84 MB → 4.13 MB (79% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')})`
    )

    expect(itemActionsJpg?.className).toBe('item-actions')
    expect(itemActionsJpg?.children).toHaveLength(3)

    const [previewButtonJpg, downloadButtonJpg, deleteButtonJpg] = Array.from(
      itemActionsJpg!.children
    )

    expect(previewButtonJpg?.className).toBe('preview-button')
    expect(previewButtonJpg?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.preview_image_wording')
    )

    expect(downloadButtonJpg?.className).toBe('download-button')
    expect(downloadButtonJpg?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )

    expect(deleteButtonJpg?.className).toBe('delete-button')
    expect(deleteButtonJpg?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.delete_item_wording')
    )

    expect(resultsListItemHeic?.className).toBe('results-list-item')
    expect(resultsListItemHeic?.children).toHaveLength(2)

    const [itemDetailsHeic, itemActionsHeic] = Array.from(
      resultsListItemHeic!.children
    )

    expect(itemDetailsHeic?.className).toBe('item-details')
    expect(itemDetailsHeic?.children).toHaveLength(3)

    const [nameHeic, sizeHeic, unsupportedFormatHeic] = Array.from(
      itemDetailsHeic!.children
    )

    expect(nameHeic?.className).toBe('item-name')
    expect(nameHeic?.textContent).toBe('image.heic')
    expect(sizeHeic?.className).toBe('item-size reduction-none')
    expect(sizeHeic?.textContent).toBe(
      `3.4 KB → 3.4 KB (0% ${useNuxtApp().$i18n.t('components.image_uploader.image_reduction_wording')})`
    )
    expect(unsupportedFormatHeic?.className).toBe('unsupported-format')
    expect(unsupportedFormatHeic?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.unsupported_format')
    )

    expect(itemActionsHeic?.className).toBe('item-actions')
    expect(itemActionsHeic?.children).toHaveLength(2)

    const [downloadButtonHeic, deleteButtonHeic] = Array.from(
      itemActionsHeic!.children
    )

    expect(downloadButtonHeic?.className).toBe('download-button')
    expect(downloadButtonHeic?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.download_image_wording')
    )

    expect(deleteButtonHeic?.className).toBe('delete-button')
    expect(deleteButtonHeic?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_uploader.delete_item_wording')
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

  it('applies webp extension when convertToWebp is enabled for a successful file', async () => {
    const pngFile = new File([new Uint8Array(3000)], 'photo.png', {
      type: 'image/png',
    })
    const wrapper = await mountSuspended(ImageUploader, {
      attachTo: document.body,
    })

    const checkboxEl = wrapper.find('input[id="webp-convert"]')
      .element as HTMLInputElement
    checkboxEl.checked = true

    await wrapper.find('input[id="webp-convert"]').trigger('change')
    await waitForPromises()

    await wrapper.find('.drop-zone').trigger('drop', {
      dataTransfer: { files: [pngFile] },
    })
    await waitForPromises()

    expect(wrapper.find('.item-name').text()).toBe('photo.webp')
  })

  it('applies reduction-moderate class for small savings (1–19%)', async () => {
    // 1700-byte PNG → mock returns 1500 bytes → ~12% reduction → reduction-moderate
    const file = new File([new Uint8Array(1700)], 'image.png', {
      type: 'image/png',
    })
    const wrapper = await mountSuspended(ImageUploader, {
      attachTo: document.body,
    })

    const input = wrapper.find('input[type="file"]')

    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })

    await input.trigger('change')
    await waitForPromises()

    const sizeEl = wrapper.find('.item-size')
    expect(sizeEl.classes()).toContain('reduction-moderate')
  })

  it('hides download-all button and keeps clear-all when all results failed', async () => {
    // image/jpeg is not handled by the mock and returns success=false,
    // covering the &&-short-circuit on shouldUseWebpExt and the v-if false branch on download-all
    const file = new File([new Uint8Array(3_000)], 'image.jpeg', {
      type: 'image/jpeg',
    })
    const wrapper = await mountSuspended(ImageUploader)
    const input = wrapper.find('input[type="file"]')

    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })

    await input.trigger('change')
    await waitForPromises()

    expect(wrapper.findAll('.results-list-item')).toHaveLength(1)
    expect(wrapper.find('.bulk-actions').exists()).toBe(true)
    expect(wrapper.find('.download-all-button').exists()).toBe(false)
    expect(wrapper.find('.clear-all-button').exists()).toBe(true)
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

  it('cancels in-flight processing when a new batch starts', async () => {
    let resolveFirstCall!: (value: { file: Blob; success: boolean }) => void
    mockOptimizeImage.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFirstCall = resolve
        })
    )

    const file1 = new File([new Uint8Array(3_000)], 'first.png', {
      type: 'image/png',
    })
    const file2 = new File([new Uint8Array(3_000)], 'second.png', {
      type: 'image/png',
    })

    const wrapper = await mountSuspended(ImageUploader)
    const input = wrapper.find('input[type="file"]')

    // Start first batch — mock is blocked until we release it
    Object.defineProperty(input.element, 'files', {
      value: [file1],
      configurable: true,
    })

    await input.trigger('change')

    // Start second batch before first resolves, which increments currentBatchId
    Object.defineProperty(input.element, 'files', {
      value: [file2],
      configurable: true,
    })

    await input.trigger('change')
    await waitForPromises()

    // Release first call — handleFiles will find batchId changed and return early
    resolveFirstCall({
      file: new Blob([new Uint8Array(1_500)], { type: 'image/png' }),
      success: true,
    })

    await waitForPromises()

    // Only second batch result should remain
    expect(wrapper.findAll('.results-list-item')).toHaveLength(1)
    expect(wrapper.find('.item-name').text()).toBe('second.png')
  })

  it('processes files when dropped and clears drag hover', async () => {
    const file = new File([new Uint8Array(2048)], 'image.jpg', {
      type: 'image/jpg',
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
    const file = new File([new Uint8Array(3000)], 'image.png', {
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

  it('shows preview button only for successful items', async () => {
    const pngImage = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })
    const heicImage = new File([new Uint8Array(3_500)], 'image.heic', {
      type: 'image/heic',
    })

    const wrapper = await mountSuspended(ImageUploader)

    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()

    dataTransfer.items.add(pngImage)
    dataTransfer.items.add(heicImage)

    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')
    await waitForPromises()

    const items = wrapper.findAll('.results-list-item')
    expect(items).toHaveLength(2)

    // Successful item has preview button
    expect(items[0]!.find('.preview-button').exists()).toBe(true)

    // Unsuccessful item does not have preview button
    expect(items[1]!.find('.preview-button').exists()).toBe(false)
  })

  it('opens preview modal when preview button is clicked', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

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

    expect(document.querySelector('.modal-backdrop')).toBeNull()

    const previewButton = wrapper.find('.preview-button')
    await previewButton.trigger('click')
    await waitForPromises()

    const modal = document.querySelector('.modal-backdrop')
    expect(modal).not.toBeNull()

    const modalTitle = document.querySelector('.modal-title')
    expect(modalTitle?.textContent).toBe('image.png')
  })

  it('closes preview modal when close button is clicked', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

    const wrapper = await mountSuspended(ImageUploader, {
      attachTo: document.body,
    })

    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()

    dataTransfer.items.add(file)

    Object.defineProperty(inputElement, 'files', {
      value: dataTransfer.files,
      configurable: true,
    })

    await input.trigger('change')
    await waitForPromises()

    const previewButton = wrapper.find('.preview-button')
    await previewButton.trigger('click')
    await waitForPromises()

    expect(wrapper.vm.previewItem).not.toBeNull()
    expect(document.querySelector('.modal-backdrop')).not.toBeNull()

    // Escape key uses a document-level listener registered by ImagePreviewModal
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await waitForPromises()

    expect(wrapper.vm.previewItem).toBeNull()
  })

  it('resets preview modal when new files are uploaded', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

    const wrapper = await mountSuspended(ImageUploader, {
      attachTo: document.body,
    })

    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()

    dataTransfer.items.add(file)

    Object.defineProperty(inputElement, 'files', {
      value: dataTransfer.files,
      configurable: true,
    })

    await input.trigger('change')
    await waitForPromises()

    const previewButton = wrapper.find('.preview-button')
    await previewButton.trigger('click')
    await waitForPromises()

    expect(wrapper.vm.previewItem).not.toBeNull()

    // Upload new files — handleFiles resets previewItem
    const newFile = new File([new Uint8Array(2_000)], 'new-image.png', {
      type: 'image/png',
    })
    const newDataTransfer = new DataTransfer()

    newDataTransfer.items.add(newFile)

    Object.defineProperty(inputElement, 'files', {
      value: newDataTransfer.files,
      configurable: true,
    })

    await input.trigger('change')
    await waitForPromises()

    expect(wrapper.vm.previewItem).toBeNull()
  })

  it('removes an item from the list when delete button is clicked', async () => {
    const pngImage = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })
    const jpgImage = new File([new Uint8Array(20_800_800)], 'image.jpg', {
      type: 'image/jpg',
    })

    const wrapper = await mountSuspended(ImageUploader)
    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()

    dataTransfer.items.add(pngImage)
    dataTransfer.items.add(jpgImage)

    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')
    await waitForPromises()

    expect(wrapper.findAll('.results-list-item')).toHaveLength(2)

    const deleteButtons = wrapper.findAll('.delete-button')
    await deleteButtons[0]!.trigger('click')
    await waitForPromises()

    expect(wrapper.findAll('.results-list-item')).toHaveLength(1)
    expect(wrapper.find('.item-name').text()).toBe('image.jpg')
  })

  it('hides progress bar and bulk actions when last item is deleted', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

    const wrapper = await mountSuspended(ImageUploader)
    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()

    dataTransfer.items.add(file)

    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')
    await waitForPromises()

    expect(wrapper.find('.progress-container').exists()).toBe(true)
    expect(wrapper.find('.bulk-actions').exists()).toBe(true)

    const deleteButton = wrapper.find('.delete-button')
    await deleteButton.trigger('click')
    await waitForPromises()

    expect(wrapper.find('.results-list-item').exists()).toBe(false)
    expect(wrapper.find('.progress-container').exists()).toBe(false)
    expect(wrapper.find('.bulk-actions').exists()).toBe(false)
  })

  it('closes preview modal when the previewed item is deleted', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

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

    await wrapper.find('.preview-button').trigger('click')
    await waitForPromises()
    expect(wrapper.vm.previewItem).not.toBeNull()

    await wrapper.find('.delete-button').trigger('click')
    await waitForPromises()
    expect(wrapper.vm.previewItem).toBeNull()
  })

  it('clears all results and resets progress when clear all is clicked', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

    const wrapper = await mountSuspended(ImageUploader)
    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()

    dataTransfer.items.add(file)

    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    await input.trigger('change')
    await waitForPromises()

    expect(wrapper.findAll('.results-list-item')).toHaveLength(1)
    expect(wrapper.find('.bulk-actions').exists()).toBe(true)

    await wrapper.find('.clear-all-button').trigger('click')
    await waitForPromises()

    expect(wrapper.findAll('.results-list-item')).toHaveLength(0)
    expect(wrapper.find('.bulk-actions').exists()).toBe(false)
    expect(wrapper.find('.progress-container').exists()).toBe(false)
  })

  it('closes preview modal when clear all is clicked', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

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

    await wrapper.find('.preview-button').trigger('click')
    await waitForPromises()
    expect(wrapper.vm.previewItem).not.toBeNull()

    await wrapper.find('.clear-all-button').trigger('click')
    await waitForPromises()
    expect(wrapper.vm.previewItem).toBeNull()
    expect(wrapper.findAll('.results-list-item')).toHaveLength(0)
  })

  it('downloadAllImages creates a zip and triggers download', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

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

    const downloadAllButton = wrapper.find('.download-all-button')
    expect(downloadAllButton.exists()).toBe(true)

    await downloadAllButton.trigger('click')
    await waitForPromises()
    await waitForPromises()
    await waitForPromises()
    await waitForPromises()
    await waitForPromises()

    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()

    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('does not fallback to anchor download when showSaveFilePicker is cancelled (AbortError)', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

    globalWithShowSaveFilePicker.showSaveFilePicker = vi.fn(async () => {
      throw new DOMException('The user aborted a request.', 'AbortError')
    }) as unknown as ShowSaveFilePicker

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

    // Set up spy after mounting to avoid capturing the mount's own appendChild call
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    const downloadButton = wrapper.find('.download-button')
    await downloadButton.trigger('click')
    await waitForPromises()

    expect(globalWithShowSaveFilePicker.showSaveFilePicker).toHaveBeenCalled()
    expect(appendSpy).not.toHaveBeenCalled()
    expect(globalThis.URL.createObjectURL).not.toHaveBeenCalled()

    appendSpy.mockRestore()
  })

  it('hides bulk actions while files are being processed', async () => {
    const file = new File([new Uint8Array(3_000)], 'image.png', {
      type: 'image/png',
    })

    const wrapper = await mountSuspended(ImageUploader)
    const input = wrapper.find('input[type="file"]')
    const inputElement = input.element as HTMLInputElement
    const dataTransfer = new DataTransfer()

    dataTransfer.items.add(file)

    Object.defineProperty(inputElement, 'files', { value: dataTransfer.files })

    // Before upload starts, bulk-actions is not visible
    expect(wrapper.find('.bulk-actions').exists()).toBe(false)

    await input.trigger('change')
    await waitForPromises()

    // After processing completes, bulk-actions should be visible
    expect(wrapper.find('.bulk-actions').exists()).toBe(true)
  })
})
