import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { clearNuxtState, useState } from '#imports'
import { useSiteTheme } from '~/composables/useSiteTheme'

describe('useSiteTheme composable', () => {
  beforeEach(() => {
    clearNuxtState('site-theme')
    document.cookie = 'pictolite-theme=; Max-Age=0; Path=/'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearNuxtState('site-theme')
    document.cookie = 'pictolite-theme=; Max-Age=0; Path=/'
  })

  it('starts in automatic mode without creating a preference cookie', () => {
    expect(useSiteTheme().theme.value).toBeNull()
    expect(document.cookie).not.toContain('pictolite-theme=')
  })

  it.each(['light', 'dark'] as const)(
    'initializes from a saved %s cookie',
    theme => {
      document.cookie = `pictolite-theme=${theme}; Path=/`

      expect(useSiteTheme().theme.value).toBe(theme)
    }
  )

  it.each(['system', 'true', '%7B%22theme%22%3A%22dark%22%7D'])(
    'ignores an unsupported cookie value: %s',
    value => {
      document.cookie = `pictolite-theme=${value}; Path=/`

      expect(useSiteTheme().theme.value).toBeNull()
    }
  )

  it('shares reactive state between consumers and persists both choices', async () => {
    const first = useSiteTheme()
    const second = useSiteTheme()

    for (const [writer, reader, theme] of [
      [first, second, 'dark'],
      [second, first, 'light'],
    ] as const) {
      writer.setTheme(theme)

      expect(reader.theme.value).toBe(theme)

      await nextTick()

      expect(document.cookie.split('; ')).toContain(`pictolite-theme=${theme}`)
    }

    clearNuxtState('site-theme')

    expect(useSiteTheme().theme.value).toBe('light')
  })

  it('saves the preference with a one-year lifetime and SameSite=Lax', async () => {
    const writeCookie = vi.spyOn(document, 'cookie', 'set')

    useSiteTheme().setTheme('dark')
    await nextTick()

    expect(writeCookie).toHaveBeenCalledWith(
      expect.stringMatching(
        /pictolite-theme=dark;.*Max-Age=31536000;.*SameSite=Lax/
      )
    )
  })

  it.each(['light', 'dark'] as const)(
    'restores a saved %s choice over an automatic prerendered state',
    theme => {
      useState('site-theme', () => null)

      document.cookie = `pictolite-theme=${theme}; Path=/`

      const state = useSiteTheme()

      expect(state.theme.value).toBeNull()

      state.restoreTheme()

      expect(state.theme.value).toBe(theme)
    }
  )

  it('keeps automatic mode when restoration finds no valid preference', () => {
    document.cookie = 'pictolite-theme=invalid; Path=/'
    const state = useSiteTheme()

    state.restoreTheme()

    expect(state.theme.value).toBeNull()
  })

  it('does not replace a current choice with a different saved cookie', () => {
    const state = useSiteTheme()
    state.setTheme('light')

    document.cookie = 'pictolite-theme=dark; Path=/'

    const otherConsumer = useSiteTheme()
    otherConsumer.restoreTheme()

    expect(otherConsumer.theme.value).toBe('light')
    expect(state.theme.value).toBe('light')
  })
})
