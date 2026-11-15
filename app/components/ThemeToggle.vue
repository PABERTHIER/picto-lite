<template>
  <button class="theme-toggle" type="button" @click="toggleTheme">
    <span class="theme-toggle__icons" aria-hidden="true">
      <Icon class="theme-toggle__moon" name="pl-icon:moon" mode="svg" />
      <Icon class="theme-toggle__sun" name="pl-icon:sun" mode="svg" />
    </span>
    <span>{{ themeLabel }}</span>
  </button>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { theme, setTheme } = useSiteTheme()

const systemDark = ref(false)

const isDark = computed(
  () => theme.value === 'dark' || (theme.value === null && systemDark.value)
)

const themeLabel = computed(() =>
  t(
    isDark.value
      ? 'components.theme_toggle.light'
      : 'components.theme_toggle.dark'
  )
)

let colorScheme: MediaQueryList | undefined

onMounted(() => {
  colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = colorScheme.matches
  colorScheme.addEventListener('change', handleSystemTheme)
})

onBeforeUnmount(() => {
  colorScheme?.removeEventListener('change', handleSystemTheme)
})

function handleSystemTheme(event: MediaQueryListEvent) {
  systemDark.value = event.matches
}

function toggleTheme() {
  setTheme(isDark.value ? 'light' : 'dark')
}
</script>

<style lang="scss" scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-control-border);
  border-radius: 24px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.4;
  cursor: pointer;

  &:hover {
    border-color: var(--color-accent);
    background: var(--color-hover);
  }

  &__icons {
    display: grid;
    flex: none;
    place-items: center;
    width: 18px;
    height: 18px;
    color: var(--color-accent);

    .iconify {
      grid-area: 1 / 1;
      width: 100%;
      height: 100%;
    }
  }

  &__moon {
    visibility: var(--theme-moon-visibility);
  }

  &__sun {
    visibility: var(--theme-sun-visibility);
  }
}

@media (scripting: none) {
  .theme-toggle {
    display: none;
  }
}

@media (forced-colors: active) {
  .theme-toggle {
    border-color: ButtonText;
  }
}
</style>
