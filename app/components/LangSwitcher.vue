<template>
  <nav class="lang-switcher" :aria-label="changeLanguageLabel">
    <NuxtLink
      v-for="availableLocale in locales"
      :key="availableLocale.code"
      :class="['btn', { active: availableLocale.code === locale }]"
      :to="switchLocalePath(availableLocale.code)"
      :lang="availableLocale.language"
      :hreflang="availableLocale.language"
      :aria-label="changeLanguageLabel + ' ' + availableLocale.name"
      :aria-current="availableLocale.code === locale ? 'true' : undefined">
      {{ availableLocale.code.toUpperCase() }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const changeLanguageLabel = computed(() =>
  t('components.lang_switcher.change_language_label')
)
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
