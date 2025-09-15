import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Footer from '@/components/Footer.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'
import { Icon } from '#components'

describe('Footer component', () => {
  it('renders correctly', async () => {
    const wrapper = await mountSuspended(Footer)

    expect(wrapper.exists()).toBe(true)
  })

  it('has the correct footer class and structure', async () => {
    const wrapper = await mountSuspended(Footer)
    const footer = wrapper.find('.footer')

    expect(footer.exists()).toBe(true)
    expect(footer.element.children.length).toEqual(3)

    const [left, github, right] = Array.from(footer.element.children)

    expect(left?.className).toBe('left-part')
    expect(github?.className).toBe('github-link')
    expect(right?.className).toBe('right-part')
  })

  it('renders the LangSwitcher in the left part', async () => {
    const wrapper = await mountSuspended(Footer)
    const left = wrapper.find('.left-part')
    const langSwitcher = left.findComponent(LangSwitcher)

    expect(langSwitcher.exists()).toBe(true)
  })

  it('renders a NuxtLink pointing to the GitHub repo with the Icon inside', async () => {
    const wrapper = await mountSuspended(Footer)
    const githubLinkLabel = useNuxtApp().$i18n.t(
      'components.footer.github_link_label'
    )
    const link = wrapper.find('.github-link a')

    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe(
      'https://github.com/PABERTHIER/picto-lite'
    )
    expect(link.attributes('aria-label')).toBe(githubLinkLabel)
    expect(link.attributes('name')).toBe(githubLinkLabel)
    expect(link.attributes('title')).toBe(githubLinkLabel)
    expect(link.attributes('target')).toBe('_blank')

    const iconWrapper = link.findComponent(Icon)

    expect(iconWrapper.exists()).toBe(true)
    expect(iconWrapper.props()).toMatchObject({
      name: 'pl-icon:github-mark',
      size: '30px',
      mode: 'svg',
    })
    expect(iconWrapper.attributes('aria-hidden')).toBe('true')

    const svg = iconWrapper.find('svg')

    expect(svg.exists()).toBe(true)
    expect(svg.element.style.color).toBe('black')
  })

  it('displays the translated author name and current year in the right part', async () => {
    const wrapper = await mountSuspended(Footer)
    const right = wrapper.find('.right-part')
    const currentYear = new Date().getFullYear()
    const author = useNuxtApp().$i18n.t('about.author')

    expect(right.text()).toBe(`${author} © ${currentYear}`)
  })
})
