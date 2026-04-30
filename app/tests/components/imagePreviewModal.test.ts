import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ImagePreviewModal from '@/components/ImagePreviewModal.vue'
import type { ResultItem } from '~/types/result'
import type { VueWrapper } from '@vue/test-utils'

const waitForPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

function createResultItem(overrides: Partial<ResultItem> = {}): ResultItem {
  return {
    name: 'test-image.png',
    blob: new Blob([new Uint8Array(1_500)], { type: 'image/png' }),
    originalBlob: new Blob([new Uint8Array(3_000)], { type: 'image/png' }),
    originalSize: 3_000,
    optimizedSize: 1_500,
    success: true,
    ...overrides,
  }
}

describe('ImagePreviewModal component', () => {
  let wrapper: VueWrapper<InstanceType<typeof ImagePreviewModal>>

  beforeEach(() => {
    vi.resetAllMocks()

    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
    globalThis.URL.revokeObjectURL = vi.fn()

    document.body.style.overflow = ''
  })

  afterEach(() => {
    wrapper?.unmount()
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove())
  })

  it('renders correctly with item prop', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    expect(wrapper.exists()).toBe(true)

    const backdrop = document.querySelector('.modal-backdrop')
    expect(backdrop).not.toBeNull()
  })

  it('displays the image name in the modal title', async () => {
    const item = createResultItem({ name: 'photo.jpg' })
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const title = document.querySelector('.modal-title')
    expect(title?.textContent).toBe('photo.jpg')
  })

  it('shows close button with correct label', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const closeButton = document.querySelector('.close-button')
    expect(closeButton).not.toBeNull()
    expect(closeButton?.textContent).toBe(
      useNuxtApp().$i18n.t('components.image_preview_modal.close_label')
    )
  })

  it('displays two preview panels with correct labels', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const panels = document.querySelectorAll('.preview-panel')
    expect(panels).toHaveLength(2)

    const labels = document.querySelectorAll('.panel-label')
    expect(labels[0]?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_preview_modal.original_label')
    )
    expect(labels[1]?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_preview_modal.optimized_label')
    )
  })

  it('displays correct sizes for both panels', async () => {
    const item = createResultItem({
      originalSize: 3_000,
      optimizedSize: 1_500,
    })
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const sizes = document.querySelectorAll('.panel-size')
    expect(sizes[0]?.textContent).toBe('2.9 KB')
    expect(sizes[1]?.textContent).toBe('1.5 KB')
  })

  it('displays MB format for large files', async () => {
    const item = createResultItem({
      originalSize: 5_242_880,
      optimizedSize: 2_621_440,
    })
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const sizes = document.querySelectorAll('.panel-size')
    expect(sizes[0]?.textContent).toBe('5.00 MB')
    expect(sizes[1]?.textContent).toBe('2.50 MB')
  })

  it('shows both images with correct alt text', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const images = document.querySelectorAll('.image-container img')
    expect(images).toHaveLength(2)

    expect(images[0]?.getAttribute('alt')).toBe(
      useNuxtApp().$i18n.t('components.image_preview_modal.original_label')
    )
    expect(images[1]?.getAttribute('alt')).toBe(
      useNuxtApp().$i18n.t('components.image_preview_modal.optimized_label')
    )
  })

  it('calls URL.createObjectURL for both blobs on mount', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(2)
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(
      item.originalBlob
    )
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(item.blob)
  })

  it('calls URL.revokeObjectURL on unmount', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    wrapper.unmount()

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('sets body overflow to hidden on mount', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body overflow on unmount', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()

    expect(document.body.style.overflow).toBe('')
  })

  it('emits close when close button is clicked', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const closeButton = document.querySelector('.close-button') as HTMLElement
    closeButton.click()

    await waitForPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when backdrop is clicked', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const backdrop = document.querySelector('.modal-backdrop') as HTMLElement
    backdrop.click()

    await waitForPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not emit close when modal content is clicked', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const content = document.querySelector('.modal-content') as HTMLElement
    content.click()

    await waitForPromises()

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('emits close when Escape key is pressed', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    await waitForPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not emit close for non-Escape keys', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    await waitForPromises()

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('removes keydown listener on unmount', async () => {
    const item = createResultItem()
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener')

    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    wrapper.unmount()

    expect(removeListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    )

    removeListenerSpy.mockRestore()
  })

  it('shows zoom-in label by default for both panels', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const zoomButtons = document.querySelectorAll('.zoom-button')
    expect(zoomButtons).toHaveLength(2)

    const zoomInLabel = useNuxtApp().$i18n.t(
      'components.image_preview_modal.zoom_in_label'
    )
    expect(zoomButtons[0]?.textContent?.trim()).toBe(zoomInLabel)
    expect(zoomButtons[1]?.textContent?.trim()).toBe(zoomInLabel)
  })

  it('toggles zoom on original image when zoom button is clicked', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const zoomButtons = document.querySelectorAll('.zoom-button')

    expect(containers[0]?.classList.contains('zoomed')).toBe(false)
    ;(zoomButtons[0] as HTMLElement).click()

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(true)
    expect(zoomButtons[0]?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_preview_modal.zoom_out_label')
    )

    // Second panel should remain unzoomed
    expect(containers[1]?.classList.contains('zoomed')).toBe(false)
  })

  it('toggles zoom on optimized image when zoom button is clicked', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const zoomButtons = document.querySelectorAll('.zoom-button')

    expect(containers[1]?.classList.contains('zoomed')).toBe(false)
    ;(zoomButtons[1] as HTMLElement).click()

    await waitForPromises()

    expect(containers[1]?.classList.contains('zoomed')).toBe(true)
    expect(zoomButtons[1]?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_preview_modal.zoom_out_label')
    )

    // First panel should remain unzoomed
    expect(containers[0]?.classList.contains('zoomed')).toBe(false)
  })

  it('toggles zoom on original image when image is clicked', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLElement>

    expect(containers[0]?.classList.contains('zoomed')).toBe(false)

    images[0]!.click()

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(true)
  })

  it('toggles zoom on optimized image when image is clicked', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLElement>

    expect(containers[1]?.classList.contains('zoomed')).toBe(false)

    images[1]!.click()

    await waitForPromises()

    expect(containers[1]?.classList.contains('zoomed')).toBe(true)
  })

  it('toggles zoom back to unzoomed on double click', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const zoomButtons = document.querySelectorAll('.zoom-button')

    ;(zoomButtons[0] as HTMLElement).click()

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(true)
    ;(zoomButtons[0] as HTMLElement).click()

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(false)

    expect(zoomButtons[0]?.textContent?.trim()).toBe(
      useNuxtApp().$i18n.t('components.image_preview_modal.zoom_in_label')
    )
  })

  it('zooms out when clicking a zoomed original image', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const zoomButtons = document.querySelectorAll('.zoom-button')

    ;(zoomButtons[0] as HTMLElement).click()

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(true)

    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLElement>
    images[0]!.click()

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(false)
  })

  it('zooms optimized panel in then back out', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const zoomButtons = document.querySelectorAll('.zoom-button')

    ;(zoomButtons[1] as HTMLElement).click()

    await waitForPromises()

    expect(containers[1]?.classList.contains('zoomed')).toBe(true)
    ;(zoomButtons[1] as HTMLElement).click()

    await waitForPromises()

    expect(containers[1]?.classList.contains('zoomed')).toBe(false)
  })

  it('scrolls to click position when zooming in via image click', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLElement>

    vi.spyOn(images[0]!, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      width: 400,
      height: 300,
      right: 500,
      bottom: 350,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    })

    Object.defineProperty(images[0]!, 'naturalWidth', {
      value: 3000,
      configurable: true,
    })
    Object.defineProperty(images[0]!, 'naturalHeight', {
      value: 2000,
      configurable: true,
    })
    Object.defineProperty(images[0]!, 'offsetWidth', {
      value: 2000,
      configurable: true,
    })
    Object.defineProperty(images[0]!, 'offsetHeight', {
      value: 1500,
      configurable: true,
    })
    Object.defineProperty(containers[0]!, 'clientWidth', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(containers[0]!, 'clientHeight', {
      value: 300,
      configurable: true,
    })

    // Click at center of image (clientX=300, clientY=200 → relX=0.5, relY=0.5)
    const clickEvent = new MouseEvent('click', {
      clientX: 300,
      clientY: 200,
      bubbles: true,
    })

    images[0]!.dispatchEvent(clickEvent)

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(true)
    // scrollLeft = 0.5 * 2000 - 400/2 = 800
    // scrollTop = 0.5 * 1500 - 300/2 = 600
    expect(containers[0]!.scrollLeft).toBe(800)
    expect(containers[0]!.scrollTop).toBe(600)
  })

  it('has correct modal structure', async () => {
    const item = createResultItem()
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item },
      attachTo: document.body,
    })

    const backdrop = document.querySelector('.modal-backdrop')
    expect(backdrop).not.toBeNull()

    const content = backdrop?.querySelector('.modal-content')
    expect(content).not.toBeNull()
    expect(content?.children).toHaveLength(2)

    const [header, body] = Array.from(content!.children)

    expect(header?.className).toBe('modal-header')
    expect(header?.children).toHaveLength(2)

    const [title, closeBtn] = Array.from(header!.children)
    expect(title?.className).toBe('modal-title')
    expect(closeBtn?.className).toBe('close-button')

    expect(body?.className).toBe('modal-body')
    expect(body?.children).toHaveLength(2)

    const [panel1, panel2] = Array.from(body!.children)
    expect(panel1?.className).toBe('preview-panel')
    expect(panel2?.className).toBe('preview-panel')

    // Each panel has: panel-header, image-container, zoom-button
    expect(panel1?.children).toHaveLength(3)
    expect(panel2?.children).toHaveLength(3)
  })

  it('shows zoom button and zoom-in cursor after loading a large image', async () => {
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item: createResultItem() },
      attachTo: document.body,
    })

    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLImageElement>

    Object.defineProperty(images[0]!, 'naturalWidth', {
      value: 300,
      configurable: true,
    })
    Object.defineProperty(images[0]!, 'offsetWidth', {
      value: 150,
      configurable: true,
    })

    images[0]!.dispatchEvent(new Event('load'))

    await waitForPromises()

    const panels = document.querySelectorAll('.preview-panel')
    expect(panels[0]!.querySelector('.zoom-button')).not.toBeNull()
    expect(images[0]!.style.cursor).toBe('zoom-in')
  })

  it('hides zoom button and sets default cursor after loading a small image', async () => {
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item: createResultItem() },
      attachTo: document.body,
    })

    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLImageElement>

    Object.defineProperty(images[0]!, 'naturalWidth', {
      value: 100,
      configurable: true,
    })
    Object.defineProperty(images[0]!, 'offsetWidth', {
      value: 100,
      configurable: true,
    })

    images[0]!.dispatchEvent(new Event('load'))

    await waitForPromises()

    const panels = document.querySelectorAll('.preview-panel')
    expect(panels[0]!.querySelector('.zoom-button')).toBeNull()
    expect(images[0]!.style.cursor).toBe('default')
  })

  it('hides zoom button on optimized panel after loading a small optimized image', async () => {
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item: createResultItem() },
      attachTo: document.body,
    })

    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLImageElement>

    Object.defineProperty(images[1]!, 'naturalWidth', {
      value: 100,
      configurable: true,
    })
    Object.defineProperty(images[1]!, 'offsetWidth', {
      value: 100,
      configurable: true,
    })

    images[1]!.dispatchEvent(new Event('load'))

    await waitForPromises()

    const panels = document.querySelectorAll('.preview-panel')
    expect(panels[1]!.querySelector('.zoom-button')).toBeNull()
    expect(images[1]!.style.cursor).toBe('default')
  })

  it('treats image as non-zoomable when load fires with naturalWidth of 0', async () => {
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item: createResultItem() },
      attachTo: document.body,
    })

    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLImageElement>

    // naturalWidth defaults to 0 (not mocked) — image did not load correctly
    images[0]!.dispatchEvent(new Event('load'))

    await waitForPromises()

    const panels = document.querySelectorAll('.preview-panel')
    expect(panels[0]!.querySelector('.zoom-button')).toBeNull()
  })

  it('zooms in via button when image is large (zoom guard allows it)', async () => {
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item: createResultItem() },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const zoomButtons = document.querySelectorAll('.zoom-button')
    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLImageElement>

    Object.defineProperty(images[0]!, 'naturalWidth', {
      value: 300,
      configurable: true,
    })
    Object.defineProperty(images[0]!, 'offsetWidth', {
      value: 150,
      configurable: true,
    })
    ;(zoomButtons[0] as HTMLElement).click()

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(true)
  })

  it('does not zoom image on click if image is already at its natural size', async () => {
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item: createResultItem() },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLImageElement>

    Object.defineProperty(images[0]!, 'naturalWidth', {
      value: 100,
      configurable: true,
    })
    Object.defineProperty(images[0]!, 'offsetWidth', {
      value: 100,
      configurable: true,
    })

    images[0]!.click()

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(false)
  })

  it('does not zoom via button if image is already at its natural size', async () => {
    wrapper = await mountSuspended(ImagePreviewModal, {
      props: { item: createResultItem() },
      attachTo: document.body,
    })

    const containers = document.querySelectorAll('.image-container')
    const zoomButtons = document.querySelectorAll('.zoom-button')
    const images = document.querySelectorAll(
      '.image-container img'
    ) as NodeListOf<HTMLImageElement>

    Object.defineProperty(images[0]!, 'naturalWidth', {
      value: 100,
      configurable: true,
    })
    Object.defineProperty(images[0]!, 'offsetWidth', {
      value: 100,
      configurable: true,
    })
    ;(zoomButtons[0] as HTMLElement).click()

    await waitForPromises()

    expect(containers[0]?.classList.contains('zoomed')).toBe(false)
  })
})
