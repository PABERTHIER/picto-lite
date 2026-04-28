---
name: i18n
description: "i18n management for PictoLite: key structure, naming conventions, two-locale rule, and translation quality guidelines. Use this skill when adding or modifying translation entries."
---

# i18n Skill

The project uses `@nuxtjs/i18n` v10 with **two locales** — French (default) and English.
All user-visible text lives in the translation files. Never hardcode French or English strings
in Vue files.

---

## Configuration

```typescript
// nuxt.config.ts
i18n: {
  defaultLocale: 'fr',          // French is default
  langDir: 'locales',           // relative to i18n/
  strategy: 'prefix',           // /fr/path and /en/path
  locales: [
    { code: 'en', language: 'en-US', name: 'English', file: 'en-US.json' },
    { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr-FR.json' },
  ],
}
```

**Files:** `i18n/locales/fr-FR.json` and `i18n/locales/en-US.json`

---

## Top-Level Key Structure

```
app.*                        — app name, meta description
  app.name                   — "PictoLite"
  app.meta.description       — SEO meta description (≤160 chars)
about.*                      — author info
  about.author               — "P-A"
links.*                      — external link labels
components.*                 — component-level copy
  components.footer.*
  components.image_uploader.*
    drop_zone_description
    drop_zone_supported_formats
    webp_option_checkbox_name
    image_reduction_wording
    unsupported_format
    download_image_wording
  components.lang_switcher.*
    change_language_label
pages.*                      — page-specific metadata
  pages.main.*
    tab_name
    meta.content
```

---

## The Two-File Rule (NON-NEGOTIABLE)

**Every change to `fr-FR.json` must have a matching change in `en-US.json`.**
Never add a key to one file without adding it to the other.
The English translation must be a proper natural English adaptation — not a word-for-word
literal translation.

---

## In Vue Files

```typescript
const { t } = useI18n()

// Simple usage
t('app.name')
t('components.image_uploader.download_image_wording')

// Reactive (for meta tags — must be wrapped in computed())
computed(() => t('app.meta.description'))

// In template
{{ t('components.image_uploader.drop_zone_description') }}
```

---

## Translation Quality Guidelines

| Field | FR guideline | EN guideline |
|---|---|---|
| `app.meta.description` | ≤160 chars, clear and descriptive | ≤160 chars, natural English |
| Component labels | Short, action-oriented | Concise, match FR tone |
| `pages.main.tab_name` | App name or short description | Same |

---

## JSON Formatting

- 2-space indent
- No trailing commas (valid JSON)
- `snake_case` for all keys
- Preserve existing structure — do not reformat unrelated sections
