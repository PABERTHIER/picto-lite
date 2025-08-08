import { describe, it, expect } from 'vitest'
import { h, defineComponent } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DefaultLayout from '@/layouts/default.vue'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const PageStub = defineComponent({
  name: 'PageStub',
  template: '<div id="test-page">Hello from slot</div>',
})

describe('Default Layout', () => {
  it('renders correctly', async () => {
    const wrapper = await mountSuspended(DefaultLayout)

    expect(wrapper.exists()).toBe(true)
  })

  it('renders the layout correctly with slot content', async () => {
    const wrapper = await mountSuspended(DefaultLayout, {
      slots: {
        default: () => h(PageStub),
      },
    })

    expect(wrapper.find('#layoutContainer').exists()).toBe(true)

    const slotContent = wrapper.find('#page-container #test-page')
    expect(slotContent.exists()).toBe(true)
    expect(slotContent.text()).toBe('Hello from slot')
  })

  it('has header, page container and footer', async () => {
    const wrapper = await mountSuspended(DefaultLayout, {
      slots: {
        default: () => h(PageStub),
      },
    })

    const headerContainer = wrapper.find('#header-container')
    const pageContainer = wrapper.find('#page-container')
    const footerContainer = wrapper.find('#footer-container')

    expect(headerContainer.exists()).toBe(true)
    expect(headerContainer.element.children.length).toEqual(1)
    const [headerTitle] = Array.from(headerContainer.element.children)
    expect(headerTitle?.className).toEqual('header-container')

    expect(pageContainer.exists()).toBe(true)
    expect(pageContainer.element.children.length).toEqual(1)
    const [pageTitle] = Array.from(pageContainer.element.children)
    expect(pageTitle?.className).toEqual('')

    expect(footerContainer.exists()).toBe(true)
    expect(footerContainer.element.children.length).toEqual(1)
    const [footerTitle] = Array.from(footerContainer.element.children)
    expect(footerTitle?.className).toEqual('footer')
  })

  it('renders the Header component', async () => {
    const wrapper = await mountSuspended(DefaultLayout, {
      slots: {
        default: () => h(PageStub),
      },
    })

    expect(wrapper.findComponent(Header).exists()).toBe(true)
  })

  it('renders the Footer component', async () => {
    const wrapper = await mountSuspended(DefaultLayout, {
      slots: {
        default: () => h(PageStub),
      },
    })

    expect(wrapper.findComponent(Footer).exists()).toBe(true)
  })
})
