export function useThemeHead() {
  const { theme, restoreTheme } = useSiteTheme()

  onMounted(restoreTheme)

  // Follow the OS until the visitor chooses a theme, then keep browser chrome aligned with that choice, including in server-rendered HTML
  useHead(() => ({
    htmlAttrs: { 'data-theme': theme.value ?? undefined },
    meta: [
      { mode: 'light', color: '#ffffff' },
      { mode: 'dark', color: '#111827' },
    ].map(({ mode, color }) => ({
      name: 'theme-color',
      content: color,
      media:
        theme.value === null
          ? `(prefers-color-scheme: ${mode})`
          : theme.value === mode
            ? 'all'
            : 'not all',
    })),
  }))
}
