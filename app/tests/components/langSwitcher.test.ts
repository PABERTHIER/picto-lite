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

  it('renders all locale links with current locale marked as active', async () => {
    const wrapper = await mountSuspended(LangSwitcher)
    const changeLanguageLabel = useNuxtApp().$i18n.t(
      'components.lang_switcher.change_language_label'
    )
    const links = wrapper.findAll('a')

    expect(links).toHaveLength(2)

    expect(links[0]?.text()).toBe('FR')
    expect(links[0]?.attributes('href')).toBe('/fr')
    expect(links[1]?.text()).toBe('EN')
    expect(links[1]?.attributes('href')).toBe('/en')

    const frLink = links.find(l => l.text() === 'FR')
    const enLink = links.find(l => l.text() === 'EN')

    expect(frLink?.classes()).not.toContain('active')
    expect(frLink?.attributes('aria-current')).toBe('false')
    expect(frLink?.attributes('aria-label')).toBe(
      `${changeLanguageLabel} Français`
    )

    expect(enLink?.classes()).toContain('active')
    expect(enLink?.attributes('aria-current')).toBe('true')
    expect(enLink?.attributes('aria-label')).toBe(
      `${changeLanguageLabel} English`
    )
  })

  it('clicking a locale link saves preference', async () => {
    let wrapper = await mountSuspended(LangSwitcher)
    let links = wrapper.findAll('a')

    expect(links).toHaveLength(2)

    expect(links[0]?.text()).toBe('FR')
    expect(links[0]?.attributes('href')).toBe('/fr')
    expect(links[1]?.text()).toBe('EN')
    expect(links[1]?.attributes('href')).toBe('/en')

    // Current locale is 'en', click FR to switch
    const frLink = links.find(l => l.text() === 'FR')
    await frLink?.trigger('click')
    expect(localStorage.getItem('preferredLanguage')).toBe('fr')

    // Remount: onMounted reads 'fr' from localStorage and sets locale
    wrapper = await mountSuspended(LangSwitcher)
    links = wrapper.findAll('a')

    expect(links).toHaveLength(2)

    // Now locale is 'fr', click EN to switch back
    const enLink = links.find(l => l.text() === 'EN')
    await enLink?.trigger('click')
    expect(localStorage.getItem('preferredLanguage')).toBe('en')
  })

  it('clicking the active locale does nothing', async () => {
    const wrapper = await mountSuspended(LangSwitcher)
    const links = wrapper.findAll('a')

    const frLink = links.find(l => l.text() === 'FR')
    await frLink?.trigger('click')
    expect(localStorage.getItem('preferredLanguage')).toBeNull()
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
