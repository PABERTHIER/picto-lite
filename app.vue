<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { t, locale, locales } = useI18n()
const runtimeConfig = useRuntimeConfig()
const baseUrl = ref(runtimeConfig.public.i18n.baseUrl)
const ogImageEndPath = 'logo.png'

const availableLocaleAlternates = computed(() => {
  const localesFiltered = locales.value.filter(l => l.code !== locale.value)
  const localesFilteredUpdated = localesFiltered.map(
    x => x.language?.replace('-', '_') ?? 'en_US'
  )
  return localesFilteredUpdated.filter(
    (item, index) => localesFilteredUpdated.indexOf(item) === index
  )
})

defineExpose({
  availableLocaleAlternates,
})

useHead({
  titleTemplate: '%siteName',
  meta: [
    { name: 'description', content: computed(() => t('app.meta.description')) },
  ],
  link: [
    { rel: 'canonical', href: `${baseUrl.value}/${locale.value}` },
    { rel: 'alternate', href: `${baseUrl.value}`, hreflang: 'fr-FR' },
    { rel: 'alternate', href: `${baseUrl.value}/fr`, hreflang: 'fr-FR' },
    { rel: 'alternate', href: `${baseUrl.value}/en`, hreflang: 'en-US' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Roboto&display=swap',
      crossorigin: '',
    },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: 'apple-icon.png' },
    { rel: 'apple-touch-icon-precomposed', href: 'apple-icon.png' },
    { rel: 'apple-touch-startup-image', href: 'apple-icon.png' },
    { rel: 'mask-icon', href: 'apple-icon.png', color: '#000000' },
  ],
})

useSeoMeta({
  title: computed(() => t('app.name')),
  ogTitle: computed(() => t('app.name')),
  ogSiteName: computed(() => t('app.name')),
  applicationName: computed(() => t('app.name')),
  description: computed(() => t('app.meta.description')),
  ogDescription: computed(() => t('app.meta.description')),
  ogImage: `${baseUrl.value}/${ogImageEndPath}`,
  ogImageSecureUrl: `${baseUrl.value}/${ogImageEndPath}`,
  ogImageAlt: computed(() => t('app.meta.description')),
  ogImageType: 'image/png',
  ogImageWidth: '1200',
  ogImageHeight: '600',
  ogUrl: `${baseUrl.value}`,
  ogType: 'website',
  ogLocale: locale.value,
  ogLocaleAlternate: availableLocaleAlternates.value,
  twitterCard: 'summary_large_image',
  twitterTitle: computed(() => t('app.name')),
  twitterDescription: computed(() => t('app.meta.description')),
  twitterImage: `${baseUrl.value}/${ogImageEndPath}`,
  twitterImageAlt: computed(() => t('app.meta.description')),
  twitterImageType: 'image/png',
  author: computed(() => t('about.author')),
  creator: computed(() => t('about.author')),
  articleTag: computed(() => [
    computed(() => t('about.author')).value,
    computed(() => t('app.name')).value,
  ]),
  profileFirstName: computed(() => t('about.author')),
  profileLastName: computed(() => t('about.author')),
  profileUsername: computed(() => t('about.author')),
  profileGender: 'male',
  publisher: 'https://vercel.com/',
  generator: 'https://nuxt.com/',
  mobileWebAppCapable: 'yes',
  appleMobileWebAppCapable: 'yes',
  appleMobileWebAppStatusBarStyle: 'default',
  appleMobileWebAppTitle: computed(() => t('app.name')),
  msapplicationTileImage: `${baseUrl.value}/${ogImageEndPath}`,
  msapplicationTileColor: '#ff0000',
})
</script>

<style lang="scss" scoped></style>
