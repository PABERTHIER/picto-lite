// https://nuxt.com/docs/api/configuration/nuxt-config
import { robotsContent } from './app/data/seo'
import { siteName } from './app/data/site'

// Production can override the Vercel fallback with NUXT_SITE_URL at build time
const prodUrl = (
  process.env.NUXT_SITE_URL || 'https://pictolite.vercel.app'
).replace(/\/$/, '')

const siteUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.VERCEL_ENV === 'production'
      ? prodUrl
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : prodUrl

const indexable =
  process.env.NODE_ENV !== 'development' &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production')

export default defineNuxtConfig({
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
      title: siteName,
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'application-name', content: siteName },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: siteName },
      ],
      templateParams: {
        separator: '-',
      },
    },
  },
  ssr: true,
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
  plugins: [],
  build: {
    transpile: [],
  },
  typescript: {
    strict: true,
  },
  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/seo',
    '@nuxt/icon',
    '@nuxt/fonts',
    '@nuxt/test-utils/module',
    '@nuxt/eslint',
  ],
  imports: {
    dirs: [],
  },
  runtimeConfig: {
    public: {
      apiBase: '',
      i18n: {
        baseUrl: siteUrl,
      },
    },
  },
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
    },
  },
  icon: {
    clientBundle: {
      includeCustomCollections: true,
    },
    customCollections: [
      {
        prefix: 'pl-icon',
        dir: './app/assets/svg',
      },
    ],
  },
  i18n: {
    baseUrl: siteUrl,
    defaultLocale: 'fr',
    langDir: 'locales',
    strategy: 'prefix',
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr-FR.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en-US.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
  },
  css: ['~/styles/default.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/styles/variables.scss" as *;',
        },
      },
    },
    optimizeDeps: {
      include: [
        '@unhead/schema-org/vue',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'jszip',
      ],
    },
    plugins: [],
  },
  compatibilityDate: '2026-10-28',
  devtools: {
    enabled: true,
  },
  site: {
    url: siteUrl,
    name: siteName,
    defaultLocale: 'fr-FR',
    trailingSlash: false,
    indexable,
  },
  robots: {
    robotsEnabledValue: robotsContent.indexable,
    robotsDisabledValue: robotsContent.blocked,
  },
  aiReady: false, // The browser optimizer does not publish AI content endpoints
  skewProtection: false, // Vercel builds do not share the local asset cache required by this module
  schemaOrg: {
    reactive: true,
    identity: {
      type: 'Person',
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      image: `${siteUrl}/logo.png`,
    },
  },
  ogImage: {
    enabled: false,
  },
})
