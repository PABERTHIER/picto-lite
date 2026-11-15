import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { enableAutoUnmount } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { clearNuxtState, useSiteTheme, useThemeHead } from '#imports'
import { Icon } from '#components'
import ThemeToggle from '~/components/ThemeToggle.vue'
import '~/styles/default.scss'

enableAutoUnmount(afterEach)

describe('ThemeToggle component', () => {
  let media: MediaQueryList
  let systemDark: boolean

  function changeSystemTheme(dark: boolean) {
    systemDark = dark
    media.dispatchEvent(Object.assign(new Event('change'), { matches: dark }))
  }

  beforeEach(async () => {
    clearNuxtState('site-theme')

    document.cookie = 'pictolite-theme=; Max-Age=0; Path=/'
    systemDark = false

    media = Object.assign(new EventTarget(), {
      media: '(prefers-color-scheme: dark)',
    }) as MediaQueryList

    Object.defineProperty(media, 'matches', { get: () => systemDark })
    vi.spyOn(window, 'matchMedia').mockImplementation(() => media)

    await useNuxtApp().$i18n.loadLocaleMessages('fr')
    await useNuxtApp().$router.push('/en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.cookie = 'pictolite-theme=; Max-Age=0; Path=/'
    clearNuxtState('site-theme')
  })

  it('offers the opposite of the OS theme and follows changes before a choice', async () => {
    const wrapper = await mountSuspended(ThemeToggle)
    const button = wrapper.get('button')

    expect(button.attributes('type')).toBe('button')
    expect(button.text()).toBe('Dark mode')

    expect(wrapper.get('.theme-toggle__icons').attributes('aria-hidden')).toBe(
      'true'
    )

    expect(window.matchMedia).toHaveBeenCalledWith(
      '(prefers-color-scheme: dark)'
    )

    changeSystemTheme(true)
    await nextTick()

    expect(button.text()).toBe('Light mode')
    expect(useSiteTheme().theme.value).toBeNull()
    expect(document.cookie).not.toContain('pictolite-theme=')

    changeSystemTheme(false)
    await nextTick()

    expect(button.text()).toBe('Dark mode')
  })

  it('reads an initially dark OS preference on mount', async () => {
    systemDark = true

    const wrapper = await mountSuspended(ThemeToggle)

    expect(wrapper.get('button').text()).toBe('Light mode')
  })

  it.each(['light', 'dark'] as const)(
    'renders the theme icons and shows the matching action in %s mode',
    async theme => {
      document.cookie = `pictolite-theme=${theme}; Path=/`

      const ThemeHarness = defineComponent({
        setup() {
          useThemeHead()

          return () => h(ThemeToggle)
        },
      })

      const wrapper = await mountSuspended(ThemeHarness, {
        attachTo: document.body,
      })
      const icons = wrapper.get('.theme-toggle__icons')

      expect(icons.attributes('aria-hidden')).toBe('true')
      expect(icons.findAllComponents(Icon)).toHaveLength(2)

      for (const name of ['moon', 'sun']) {
        const icon = icons.findComponent<typeof Icon>(`.theme-toggle__${name}`)

        expect(icon.exists()).toBe(true)
        expect(icon.props()).toMatchObject({
          name: `pl-icon:${name}`,
          mode: 'svg',
        })
        expect(icon.find('svg').exists()).toBe(true)
        expect(icon.find('[stroke="currentColor"]').exists()).toBe(true)
      }

      const moon = icons.get('.theme-toggle__moon')
      const sun = icons.get('.theme-toggle__sun')

      await vi.waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme)
        expect(getComputedStyle(moon.element).visibility).toBe(
          theme === 'light' ? 'visible' : 'hidden'
        )
        expect(getComputedStyle(sun.element).visibility).toBe(
          theme === 'dark' ? 'visible' : 'hidden'
        )
      })

      await wrapper.get('button').trigger('click')

      await vi.waitFor(() => {
        expect(getComputedStyle(moon.element).visibility).toBe(
          theme === 'light' ? 'hidden' : 'visible'
        )
        expect(getComputedStyle(sun.element).visibility).toBe(
          theme === 'dark' ? 'hidden' : 'visible'
        )
      })
    }
  )

  it('toggles both ways, persists the choice and ignores later OS changes', async () => {
    const wrapper = await mountSuspended(ThemeToggle)
    const button = wrapper.get('button')

    await button.trigger('click')

    expect(useSiteTheme().theme.value).toBe('dark')
    expect(document.cookie.split('; ')).toContain('pictolite-theme=dark')
    expect(button.text()).toBe('Light mode')

    changeSystemTheme(true)
    await button.trigger('click')

    expect(useSiteTheme().theme.value).toBe('light')
    expect(document.cookie.split('; ')).toContain('pictolite-theme=light')
    expect(button.text()).toBe('Dark mode')

    changeSystemTheme(false)
    changeSystemTheme(true)
    await nextTick()

    expect(button.text()).toBe('Dark mode')
    expect(useSiteTheme().theme.value).toBe('light')

    wrapper.unmount()
    clearNuxtState('site-theme')
    const reloaded = await mountSuspended(ThemeToggle)

    expect(reloaded.get('button').text()).toBe('Dark mode')
    expect(useSiteTheme().theme.value).toBe('light')
  })

  it('switches from the effective dark system theme to saved light', async () => {
    systemDark = true

    const wrapper = await mountSuspended(ThemeToggle)

    await wrapper.get('button').trigger('click')

    expect(useSiteTheme().theme.value).toBe('light')
    expect(document.cookie.split('; ')).toContain('pictolite-theme=light')
  })

  it.each(['light', 'dark'] as const)(
    'restores a saved %s theme',
    async theme => {
      document.cookie = `pictolite-theme=${theme}; Path=/`
      systemDark = theme === 'light'

      const wrapper = await mountSuspended(ThemeToggle)

      expect(useSiteTheme().theme.value).toBe(theme)
      expect(wrapper.get('button').text()).toBe(
        theme === 'dark' ? 'Light mode' : 'Dark mode'
      )
    }
  )

  it('ignores an invalid cookie', async () => {
    document.cookie = 'pictolite-theme=invalid; Path=/'

    const wrapper = await mountSuspended(ThemeToggle)

    expect(useSiteTheme().theme.value).toBeNull()
    expect(wrapper.get('button').text()).toBe('Dark mode')
  })

  it('updates both French and English action labels without remounting', async () => {
    const wrapper = await mountSuspended(ThemeToggle, { route: '/fr' })

    expect(wrapper.get('button').text()).toBe('Mode sombre')

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').text()).toBe('Mode clair')

    await useNuxtApp().$router.push('/en')
    await nextTick()

    expect(wrapper.get('button').text()).toBe('Light mode')

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').text()).toBe('Dark mode')
  })

  it('removes the OS listener on unmount', async () => {
    const add = vi.spyOn(media, 'addEventListener')
    const remove = vi.spyOn(media, 'removeEventListener')
    const wrapper = await mountSuspended(ThemeToggle)
    const listener = add.mock.calls.find(([event]) => event === 'change')?.[1]

    expect(listener).toEqual(expect.any(Function))

    wrapper.unmount()

    expect(remove).toHaveBeenCalledWith('change', listener)
  })
})
