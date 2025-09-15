<template>
  <div class="main">
    <ImageUploader />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const baseUrl = ref(runtimeConfig.public.i18n.baseUrl)
const ogImageEndPath = 'logo.png'

useHead({
  meta: [
    { name: 'description', content: computed(() => t('app.meta.description')) },
  ],
})

useSeoMeta({
  ogTitle: '%siteName',
  description: computed(() => t('app.meta.description')),
  ogDescription: computed(() => t('app.meta.description')),
  ogImage: `${baseUrl.value}/${ogImageEndPath}`,
  ogImageSecureUrl: `${baseUrl.value}/${ogImageEndPath}`,
  ogImageAlt: computed(() => t('app.meta.description')),
  ogImageType: 'image/png',
  ogImageWidth: '1200',
  ogImageHeight: '600',
  twitterTitle: '%siteName',
  twitterDescription: computed(() => t('app.meta.description')),
  twitterImage: `${baseUrl.value}/${ogImageEndPath}`,
  twitterImageAlt: computed(() => t('app.meta.description')),
  twitterImageType: 'image/png',
  appleMobileWebAppTitle: '%siteName',
  msapplicationTileImage: `${baseUrl.value}/${ogImageEndPath}`,
})

defineOgImageComponent('NuxtSeo', { theme: '#ff0000', colorMode: 'dark' })
</script>

<style lang="scss" scoped></style>
