<template>
  <div class="lang-switcher">
    <NuxtLink
      v-for="availableLocale in availableLocales"
      :key="availableLocale.code"
      :to="switchLocalePath(availableLocale.code)"
      :title="changeLanguageLabel"
      @click="setLanguagePreference(availableLocale.code)">
      {{ availableLocale.name }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { localesType } from '~/types/locales'

const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() => {
  return locales.value.filter(l => l.code !== locale.value)
})
const changeLanguageLabel = computed(() =>
  t('components.lang_switcher.change_language_label')
)

const setLanguagePreference = (code: string) => {
  localStorage.setItem('preferredLanguage', code)
}

const updateDirAttribute = (newLocale: string) => {
  const currentLocale = locales.value.find(l => l.code === newLocale)
  document.documentElement.setAttribute('dir', currentLocale?.dir || 'ltr')
}

watch(locale, newLocale => {
  updateDirAttribute(newLocale)
})

onMounted(() => {
  const savedLanguage = localStorage.getItem('preferredLanguage') as localesType

  if (
    savedLanguage &&
    locales.value.some(locale => locale.code === savedLanguage)
  ) {
    locale.value = savedLanguage
  }

  updateDirAttribute(locale.value)
})
</script>

<style lang="scss" scoped></style>
