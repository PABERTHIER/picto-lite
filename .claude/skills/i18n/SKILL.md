---
name: i18n
description: >
  Manage translation entries in fr-FR.json and en-US.json.
  Use when adding, modifying, or reviewing i18n keys for any component or page.
disable-model-invocation: true
argument-hint: "<key location> (e.g. components.image_uploader)"
---

You are managing i18n translations for: $ARGUMENTS

The project has two locale files that must always be kept in sync.
Read existing entries in `i18n/locales/fr-FR.json` and `i18n/locales/en-US.json` before editing.

---

## The Two-File Rule (NON-NEGOTIABLE)

**Every change to `fr-FR.json` MUST have a matching change in `en-US.json` in the same edit.**
Never add a key to one file without the other. Never leave a key untranslated.

---

## Key Structure

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

## JSON Template for a New Key

```json
// fr-FR.json
{
  "components": {
    "image_uploader": {
      "my_new_key": "Mon texte en français"
    }
  }
}

// en-US.json — natural English, not a literal translation
{
  "components": {
    "image_uploader": {
      "my_new_key": "My English text"
    }
  }
}
```

---

## Field Quality Rules

| Field | Rule |
|---|---|
| `app.meta.description` | ≤160 chars. Clear description of the app's purpose. |
| Component labels | Short, action-oriented. FR: imperative or noun phrase. EN: match FR tone. |
| `pages.main.tab_name` | App name or short descriptor. |

---

## JSON Formatting Rules

- 2-space indent (matches `.editorconfig`)
- No trailing commas (strict JSON)
- `snake_case` for all keys — never camelCase or kebab-case
- Do not reformat or reorder unrelated sections when editing
- Preserve existing nesting depth and style
