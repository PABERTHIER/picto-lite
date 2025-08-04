import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Header from '@/components/Header.vue'

describe('Header component', () => {
  it('renders correctly', async () => {
    const wrapper = await mountSuspended(Header)

    expect(wrapper.exists()).toBe(true)
  })

  it('has the correct header container class and structure', async () => {
    const wrapper = await mountSuspended(Header)
    const headerContainer = wrapper.find('.header-container')

    expect(headerContainer.exists()).toBe(true)
    expect(headerContainer.element.children.length).toEqual(1)

    const [title] = Array.from(headerContainer.element.children)

    expect(title?.className).toEqual('title')
  })

  it('displays the translated title', async () => {
    const wrapper = await mountSuspended(Header)
    const titleElement = wrapper.find('.title')

    expect(titleElement.exists()).toBe(true)
    expect(titleElement.text()).toBe('PictoLite')
  })
})
