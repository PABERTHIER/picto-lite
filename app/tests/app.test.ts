import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { injectHead } from '#imports'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '@/app.vue'

enableAutoUnmount(afterEach)

describe('App component', () => {
  // The root's head must be tested separately from the routed page's overrides
  async function mountApp() {
    const wrapper = await mountSuspended(App, {
      global: {
        stubs: {
          NuxtLayout: {
            name: 'NuxtLayout',
            template: '<div class="nuxt-layout"><slot /></div>',
          },
          NuxtPage: {
            name: 'NuxtPage',
            template: '<div class="nuxt-page">stubbed page</div>',
          },
        },
      },
    })

    const head = await useNuxtApp().runWithContext(injectHead)
    head.render()

    return wrapper
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders correctly', async () => {
    const wrapper = await mountApp()

    expect(wrapper.exists()).toBe(true)
  })

  it('renders NuxtLayout and NuxtPage components', async () => {
    const wrapper = await mountApp()

    const layout = wrapper.findComponent({ name: 'NuxtLayout' })
    expect(layout.exists()).toBe(true)

    const page = wrapper.findComponent({ name: 'NuxtPage' })
    expect(page.exists()).toBe(true)
  })

  it('computes correctly availableLocaleAlternates', async () => {
    const wrapper = await mountApp()
    const alternates = wrapper.vm.availableLocaleAlternates

    expect(alternates).toEqual(['fr_FR'])
  })

  it('applies the titleTemplate and sets document.title', async () => {
    await mountApp()

    await vi.waitFor(() => {
      expect(document.title).toBeTruthy()
      expect(document.title).toEqual('%siteName')
    })
  })

  it('injects a meta description tag via useHead', async () => {
    await mountApp()

    await vi.waitFor(() => {
      const metaDesc = document.querySelector('meta[name="description"]')
      expect(metaDesc).toBeTruthy()
      const metaDescContent = metaDesc?.getAttribute('content')
      expect(metaDescContent).toEqual(
        useNuxtApp().$i18n.t('app.meta.description')
      )
    })
  })

  it('injects all link tags declared in useHead', async () => {
    await mountApp()

    await vi.waitFor(() => {
      const baseUrl = useNuxtApp().$i18n.baseUrl.value
      const locale = useNuxtApp().$i18n.locale.value

      // canonical
      const canonical = document.querySelector('link[rel="canonical"]')
      expect(canonical).toBeTruthy()
      expect(canonical!.getAttribute('href')).toEqual(`${baseUrl}/${locale}`)

      // alternates
      const alternateFr = document.querySelector(
        `link[rel="alternate"][hreflang="fr-FR"][href="${baseUrl}/fr"]`
      )
      expect(alternateFr).toBeTruthy()

      const alternateEn = document.querySelector(
        `link[rel="alternate"][hreflang="en-US"][href="${baseUrl}/en"]`
      )
      expect(alternateEn).toBeTruthy()

      // icon
      const icon = document.querySelector(
        'link[rel="icon"][type="image/x-icon"][href="/favicon.ico"]'
      )
      expect(icon).toBeTruthy()

      // apple icons / startup
      const appleTouch = document.querySelector(
        'link[rel="apple-touch-icon"][href="apple-icon.png"]'
      )
      expect(appleTouch).toBeTruthy()

      const appleStartup = document.querySelector(
        'link[rel="apple-touch-startup-image"][href="apple-icon.png"]'
      )
      expect(appleStartup).toBeTruthy()

      // mask icon
      const mask = document.querySelector(
        'link[rel="mask-icon"][href="apple-icon.png"][color="#000000"]'
      )
      expect(mask).toBeTruthy()
    })
  })

  it('sets seo meta tags via useSeoMeta', async () => {
    await mountApp()

    await vi.waitFor(() => {
      const baseUrl = useNuxtApp().$i18n.baseUrl.value
      const expectedOgImage = `${baseUrl}/logo.png`
      const locale = useNuxtApp().$i18n.locale.value
      const expectedAppName = useNuxtApp().$i18n.t('app.name')
      const expectedDescription = useNuxtApp().$i18n.t('app.meta.description')
      const expectedAuthor = useNuxtApp().$i18n.t('about.author')
      const locales = useNuxtApp().$i18n.locales?.value ?? []
      const currentLocale = useNuxtApp().$i18n.locale?.value ?? ''

      // OG: title
      const ogTitle = document.querySelector('meta[property="og:title"]')
      expect(ogTitle).toBeTruthy()
      expect(ogTitle!.getAttribute('content')).toEqual(expectedAppName)

      // OG: description
      const ogDesc = document.querySelector('meta[property="og:description"]')
      expect(ogDesc).toBeTruthy()
      expect(ogDesc!.getAttribute('content')).toEqual(expectedDescription)

      // OG: image
      const ogImage = document.querySelector('meta[property="og:image"]')
      expect(ogImage).toBeTruthy()
      expect(ogImage!.getAttribute('content')).toEqual(expectedOgImage)

      // OG: image secure url
      const ogImageSecure = document.querySelector(
        'meta[property="og:image:secure_url"]'
      )
      if (ogImageSecure) {
        expect(ogImageSecure.getAttribute('content')).toEqual(expectedOgImage)
      }

      // OG: url
      const ogUrl = document.querySelector('meta[property="og:url"]')
      expect(ogUrl).toBeTruthy()
      expect(ogUrl!.getAttribute('content')).toEqual(
        `${baseUrl}/${currentLocale}`
      )

      // OG: type
      const ogType = document.querySelector('meta[property="og:type"]')
      expect(ogType).toBeTruthy()
      expect(ogType!.getAttribute('content')).toEqual('website')

      // OG: locale
      const ogLocale = document.querySelector('meta[property="og:locale"]')
      expect(ogLocale).toBeTruthy()
      expect(ogLocale!.getAttribute('content')).toEqual(locale)

      const localesFiltered = locales.filter(l => l.code !== currentLocale)
      const localesFilteredUpdated = localesFiltered.map(
        x => x.language?.replace('-', '_') ?? 'en_US'
      )

      // OG: locale alternate(s)
      const alternates = localesFilteredUpdated.filter(
        (item: string, index: number) =>
          localesFilteredUpdated.indexOf(item) === index
      )

      for (const alt of alternates) {
        const metaAlt = document.querySelector(
          `meta[property="og:locale:alternate"][content="${alt}"]`
        )
        expect(metaAlt).toBeTruthy()
      }

      // Author & Creator
      const metaAuthor = document.querySelector('meta[name="author"]')
      expect(metaAuthor).toBeTruthy()
      expect(metaAuthor!.getAttribute('content')).toEqual(expectedAuthor)

      const metaCreator = document.querySelector('meta[name="creator"]')
      expect(metaCreator).toBeTruthy()
      expect(metaCreator!.getAttribute('content')).toEqual(expectedAuthor)

      // article:tag
      const expectedArticleTags = [
        useNuxtApp().$i18n.t('about.author'),
        useNuxtApp().$i18n.t('app.name'),
      ]

      for (const tag of expectedArticleTags) {
        const tagMeta = document.querySelector(
          `meta[property="article:tag"][content="${tag}"]`
        )
        expect(tagMeta).toBeTruthy()
      }
    })
  })

  it('forwards slot to NuxtLayout and renders NuxtPage content', async () => {
    const wrapper = await mountApp()

    const layout = wrapper.find('.nuxt-layout')
    expect(layout.exists()).toBe(true)

    const page = wrapper.find('.nuxt-page')
    expect(page.exists()).toBe(true)
    expect(page.text()).toEqual('stubbed page')
  })
})
