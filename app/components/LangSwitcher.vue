<template>
  <div class="lang-switcher">
    <NuxtLink
      v-for="availableLocale in availableLocales"
      :key="availableLocale.code"
      :class="['btn', { active: availableLocale.code === locale }]"
      :to="switchLocalePath(availableLocale.code)"
      :aria-label="changeLanguageLabel + ' ' + availableLocale.name"
      :aria-current="availableLocale.code === locale ? 'true' : 'false'"
      @click="setLanguagePreference(availableLocale.code)">
      {{ availableLocale.code.toUpperCase() }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { localesType } from '~/types/locales'

const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() =>
  (locales.value as Array<{ code: localesType; name: string }>).map(l => ({
    code: l.code,
    name: l.name,
  }))
)
const changeLanguageLabel = computed(() =>
  t('components.lang_switcher.change_language_label')
)

const setLanguagePreference = (code: localesType) => {
  if (code === locale.value) {
    return
  }

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

<style lang="scss" scoped>
.lang-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: 20px;
  border: 1px solid rgba($grey-blue-color, 0.4);
  background: rgba($white-color, 0.8);

  .btn {
    display: inline-block;
    text-decoration: none;
    color: rgba($primary-text-color, 0.6);
    padding: 0.35rem 0.7rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    border-radius: 20px;
    cursor: pointer;
    transition:
      color 0.2s ease,
      background 0.2s ease;

    &:hover {
      color: $primary-text-color;
    }

    &.active {
      background: linear-gradient(120deg, $blue-color, $grey-blue-color);
      color: $white-color;
      box-shadow: 0 2px 12px rgba($blue-color, 0.3);
      cursor: default;
    }
  }
}
</style>
