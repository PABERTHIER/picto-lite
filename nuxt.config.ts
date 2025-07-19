// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      charset: 'utf-8',
      htmlAttrs: {
        lang: 'fr',
      },
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
      title: 'PictoLite',
      viewport: 'width=device-width, initial-scale=1',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'application-name', content: 'PictoLite' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'PictoLite' },
      ],
      templateParams: {
        separator: '-',
      },
    },
  },
  ssr: true,
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },
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
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxt/test-utils/module',
  ],
  imports: {
    dirs: [],
  },
  runtimeConfig: {
    public: {
      apiBase: '',
      i18n: {
        baseUrl:
          process.env.NODE_ENV !== 'production'
            ? 'http://localhost:3000'
            : 'https://pictolite.vercel.app',
      },
    },
  },
  icon: {
    customCollections: [
      {
        prefix: 'pl-icon',
        dir: './assets/svg',
      },
    ],
  },
  i18n: {
    defaultLocale: 'fr',
    langDir: 'locales',
    lazy: true,
    strategy: 'prefix',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en-US.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr-FR.json' },
    ],
    bundle: {
      optimizeTranslationDirective: false,
    },
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/styles/variables.scss" as *;',
          api: 'modern-compiler',
        },
      },
    },
    plugins: [],
  },
  compatibilityDate: '2025-04-19',
  devtools: {
    enabled: true,
  },
  site: {
    url: 'https://pictolite.vercel.app',
    name: 'PictoLite',
    identity: {
      type: 'Person',
    },
    robots: {
      index: true,
      follow: true,
    },
  },
  schemaOrg: {
    identity: {
      type: 'Person',
      name: 'PictoLite',
      url: 'https://pictolite.vercel.app',
      logo: 'https://pictolite.vercel.app/logo.png',
    },
  },
  ogImage: {
    componentOptions: {
      global: true,
    },
  },
})
