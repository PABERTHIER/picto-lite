import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import App from '@/app.vue'

// Override the global useI18n mock: simulate a locale entry that has NO `language` field,
// so we exercise the `?? 'en_US'` fallback branch in availableLocaleAlternates.
mockNuxtImport('useI18n', () => () => ({
  t: (k: string) => k,
  locale: ref('en'),
  locales: ref([
    { code: 'en', language: 'en-US' },
    { code: 'xx' }, // no `language` -> triggers the fallback
  ]),
  baseUrl: ref('https://pictolite.test'),
}))

describe('App component (locale fallback)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('defineOgImageComponent', vi.fn())
  })

  it('falls back to en_US when a locale entry has no language field', async () => {
    const wrapper = await mountSuspended(App)
    const alternates = wrapper.vm.availableLocaleAlternates as string[]

    expect(alternates).toContain('en_US')
  })
})
