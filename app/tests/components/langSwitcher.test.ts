import { nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { afterEach, describe, it, beforeEach, expect, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LangSwitcher from '@/components/LangSwitcher.vue'

enableAutoUnmount(afterEach)

const mountSwitcher = (route = '/en') =>
  mountSuspended(LangSwitcher, {
    route,
    global: { components: { RouterLink } }, // Use real navigation: mountSuspended's RouterLink prevents default clicks
  })

describe('LangSwitcher component', () => {
  beforeEach(async () => {
    const nuxt = useNuxtApp()

    await nuxt.$i18n.loadLocaleMessages('fr')
    await nuxt.$router.push('/en')

    nuxt.$i18n.setLocaleCookie('en')
  })

  it('renders correctly', async () => {
    const wrapper = await mountSuspended(LangSwitcher)

    expect(wrapper.exists()).toBe(true)
  })

  it.each([
    ['fr', 'Changer de langue'],
    ['en', 'Change language'],
  ] as const)(
    'renders accessible locale links in %s',
    async (locale, label) => {
      const wrapper = await mountSwitcher(`/${locale}`)
      const navigation = wrapper.get('nav.lang-switcher')

      expect(navigation.attributes('aria-label')).toBe(label)
      expect(navigation.findAll('a')).toHaveLength(2)

      for (const [code, language, name] of [
        ['fr', 'fr-FR', 'Français'],
        ['en', 'en-US', 'English'],
      ] as const) {
        const link = navigation.get(`a[href="/${code}"]`)

        expect(link.text()).toBe(code.toUpperCase())
        expect(link.attributes('lang')).toBe(language)
        expect(link.attributes('hreflang')).toBe(language)
        expect(link.attributes('aria-label')).toBe(`${label} ${name}`)
        expect(link.classes().includes('active')).toBe(code === locale)
        expect(link.attributes('aria-current')).toBe(
          code === locale ? 'true' : undefined
        )
      }
    }
  )

  it('updates translated labels and the active link without remounting', async () => {
    const wrapper = await mountSwitcher()

    await useNuxtApp().$router.push('/fr')
    await nextTick()

    const changeLanguageLabel = useNuxtApp().$i18n.t(
      'components.lang_switcher.change_language_label'
    )

    expect(wrapper.attributes('aria-label')).toBe(changeLanguageLabel)
    expect(wrapper.get('a[href="/fr"]').attributes('aria-label')).toBe(
      `${changeLanguageLabel} Français`
    )
    expect(wrapper.get('a[href="/en"]').attributes('aria-label')).toBe(
      `${changeLanguageLabel} English`
    )
    expect(wrapper.get('a.active').text()).toBe('FR')
  })

  it('switches routes and persists the locale in the i18n cookie in both directions', async () => {
    const nuxt = useNuxtApp()
    const wrapper = await mountSwitcher()

    for (const locale of ['fr', 'en']) {
      await wrapper.get(`a[href="/${locale}"]`).trigger('click')

      await vi.waitFor(() => {
        expect(nuxt.$router.currentRoute.value.path).toBe(`/${locale}`)
        expect(nuxt.$i18n.locale.value).toBe(locale)
        expect(nuxt.$i18n.getLocaleCookie()).toBe(locale)
        expect(document.cookie.split('; ')).toContain(
          `i18n_redirected=${locale}`
        )
        expect(wrapper.get('a.active').text()).toBe(locale.toUpperCase())
      })
    }
  })

  it('keeps the current route and cookie when clicking the active locale', async () => {
    const nuxt = useNuxtApp()
    const wrapper = await mountSwitcher()

    await wrapper.get('a[href="/en"]').trigger('click')

    expect(nuxt.$router.currentRoute.value.path).toBe('/en')
    expect(nuxt.$i18n.locale.value).toBe('en')
    expect(nuxt.$i18n.getLocaleCookie()).toBe('en')
  })

  it('respects a direct localized URL over an existing preference cookie', async () => {
    const nuxt = useNuxtApp()

    expect(nuxt.$i18n.getLocaleCookie()).toBe('en')

    const wrapper = await mountSwitcher('/fr')

    expect(nuxt.$router.currentRoute.value.path).toBe('/fr')
    expect(nuxt.$i18n.locale.value).toBe('fr')
    expect(nuxt.$i18n.getLocaleCookie()).toBe('fr')
    expect(wrapper.get('a.active').text()).toBe('FR')
  })
})
