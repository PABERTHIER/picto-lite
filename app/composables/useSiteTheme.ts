type SiteTheme = 'light' | 'dark'

export function useSiteTheme() {
  const savedTheme = useCookie<SiteTheme>('pictolite-theme', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  function readSavedTheme(): SiteTheme | null {
    return savedTheme.value === 'light' || savedTheme.value === 'dark'
      ? savedTheme.value
      : null
  }

  const theme = useState<SiteTheme | null>('site-theme', readSavedTheme)

  function restoreTheme() {
    // Prerendered payloads cannot contain the visitor's cookie; restore after hydration
    theme.value ??= readSavedTheme()
  }

  function setTheme(value: SiteTheme) {
    theme.value = value
    savedTheme.value = value
  }

  return { theme, setTheme, restoreTheme }
}
