import { nextTick } from 'vue'
import { describe, it, beforeEach, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LangSwitcher from '@/components/LangSwitcher.vue'

describe('LangSwitcher component', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('dir')
  })

  it('renders correctly', async () => {
    const wrapper = await mountSuspended(LangSwitcher)

    expect(wrapper.exists()).toBe(true)
  })

  it('renders only non-current locale links', async () => {
    const wrapper = await mountSuspended(LangSwitcher)
    const changeLanguageLabel = useNuxtApp().$i18n.t(
      'components.lang_switcher.change_language_label'
    )
    const links = wrapper.findAll('a')

    expect(links).toHaveLength(1)
    expect(links[0]?.text()).toBe('Français')
    expect(links[0]?.attributes('href')).toBe('/fr')
    expect(links[0]?.attributes('title')).toBe(changeLanguageLabel)
  })

  it('clicking a locale link saves preference', async () => {
    let wrapper = await mountSuspended(LangSwitcher)
    let links = wrapper.findAll('a')

    await wrapper.find('a').trigger('click')

    expect(localStorage.getItem('preferredLanguage')).toBe('fr')
    expect(links).toHaveLength(1)
    expect(links[0]?.text()).toBe('Français')
    expect(links[0]?.attributes('href')).toBe('/fr')

    wrapper = await mountSuspended(LangSwitcher)
    links = wrapper.findAll('a')

    await wrapper.find('a').trigger('click')

    expect(localStorage.getItem('preferredLanguage')).toBe('en')
    expect(links).toHaveLength(1)
    expect(links[0]?.text()).toBe('English')
    expect(links[0]?.attributes('href')).toBe('/en')
  })

  it('applies valid saved preference on mount', async () => {
    localStorage.setItem('preferredLanguage', 'fr')
    const wrapper = await mountSuspended(LangSwitcher)
    await nextTick()

    expect(wrapper.vm.$i18n.locale).toBe('fr')
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
  })

  it('does not apply invalid saved preference on mount', async () => {
    localStorage.setItem('preferredLanguage', 'de')
    const wrapper = await mountSuspended(LangSwitcher)
    await nextTick()

    expect(wrapper.vm.$i18n.locale).toBe('fr')
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
  })

  it('updates dir attribute when locale changes', async () => {
    const wrapper = await mountSuspended(LangSwitcher)
    wrapper.vm.$i18n.locale = 'fr'

    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
  })
})
