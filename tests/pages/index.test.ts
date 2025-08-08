import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MainPage from '@/pages/index.vue'
import ImageUploader from '@/components/ImageUploader.vue'

const mockDefineOgImageComponent = vi.fn()

describe('Page Component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('defineOgImageComponent', mockDefineOgImageComponent)
  })

  it('renders correctly', async () => {
    const wrapper = await mountSuspended(MainPage)

    expect(wrapper.exists()).toBe(true)
  })

  it('has the correct main class and structure', async () => {
    const wrapper = await mountSuspended(MainPage)
    const headerContainer = wrapper.find('.main')

    expect(headerContainer.exists()).toBe(true)
    expect(headerContainer.element.children.length).toEqual(1)

    const [title] = Array.from(headerContainer.element.children)

    expect(title?.className).toEqual('uploader-container')
  })

  it('renders ImageUploader component', async () => {
    const wrapper = await mountSuspended(MainPage)

    expect(wrapper.findComponent(ImageUploader).exists()).toBe(true)
  })

  it('calls defineOgImageComponent with correct arguments', async () => {
    await mountSuspended(MainPage)

    expect(mockDefineOgImageComponent).toHaveBeenCalledWith('NuxtSeo', {
      theme: '#ff0000',
      colorMode: 'dark',
    })
  })
})
