import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { enableAutoUnmount } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { injectHead, useNuxtApp } from '#imports'
import { useThemeHead } from '~/composables/useThemeHead'

const preference = vi.hoisted(() => ({
  theme: undefined as unknown as Ref<'light' | 'dark' | null>,
  restoreTheme: vi.fn(),
}))

mockNuxtImport('useSiteTheme', () => () => preference)

enableAutoUnmount(afterEach)

const ThemeHeadHarness = defineComponent({
  setup() {
    useThemeHead()

    return () => null
  },
})

async function mountThemeHead() {
  const wrapper = await mountSuspended(ThemeHeadHarness)
  const head = await useNuxtApp().runWithContext(injectHead)
  head.render()

  return wrapper
}

function themeColors() {
  return Array.from(
    document.querySelectorAll('meta[name="theme-color"]'),
    meta => ({
      color: meta.getAttribute('content'),
      media: meta.getAttribute('media'),
    })
  )
}

describe('useThemeHead composable', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    preference.theme = ref(null)
  })

  it('leaves the document in automatic mode with OS-specific browser colors', async () => {
    await mountThemeHead()

    await vi.waitFor(() => {
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
      expect(themeColors()).toEqual([
        { color: '#ffffff', media: '(prefers-color-scheme: light)' },
        { color: '#111827', media: '(prefers-color-scheme: dark)' },
      ])
    })
  })

  it.each(['light', 'dark'] as const)(
    'applies the explicit %s choice to the document and browser chrome',
    async theme => {
      preference.theme.value = theme

      await mountThemeHead()

      await vi.waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme)
        expect(themeColors()).toEqual([
          { color: '#ffffff', media: theme === 'light' ? 'all' : 'not all' },
          { color: '#111827', media: theme === 'dark' ? 'all' : 'not all' },
        ])
      })
    }
  )

  it('updates the existing head entries when switching themes and returning to automatic', async () => {
    await mountThemeHead()

    for (const [theme, media] of [
      ['dark', ['not all', 'all']],
      ['light', ['all', 'not all']],
      [null, ['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)']],
    ] as const) {
      preference.theme.value = theme

      await vi.waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme)
        expect(themeColors()).toEqual([
          {
            color: '#ffffff',
            media: media[0],
          },
          {
            color: '#111827',
            media: media[1],
          },
        ])
      })
    }
  })

  it('restores the preference on mount and reflects the restored value', async () => {
    preference.restoreTheme.mockImplementation(() => {
      preference.theme.value = 'dark'
    })

    await mountThemeHead()

    expect(preference.restoreTheme).toHaveBeenCalledOnce()

    await vi.waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      expect(themeColors()).toContainEqual({ color: '#111827', media: 'all' })
    })

    preference.theme.value = 'light'
    await nextTick()

    expect(preference.restoreTheme).toHaveBeenCalledOnce()
  })

  it('disposes its head entries when the owner unmounts', async () => {
    const previousColors = themeColors()
    const previousTheme = document.documentElement.getAttribute('data-theme')

    preference.theme.value = 'dark'

    const wrapper = await mountThemeHead()

    await vi.waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    wrapper.unmount()

    await vi.waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe(
        previousTheme
      )
      expect(themeColors()).toEqual(previousColors)
    })
  })
})
