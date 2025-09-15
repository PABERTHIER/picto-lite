import { mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useI18n', () => () => useNuxtApp().$i18n)
