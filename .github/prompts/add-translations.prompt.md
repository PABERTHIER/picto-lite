---
description: "Add i18n translation keys to both fr-FR.json and en-US.json without modifying any other files."
---

# Add Translations

You are adding i18n translation entries to PictoLite.

## Required Information

Before starting, you **must** have:

1. **Location** — which section of the JSON tree (e.g., `components.image_uploader`, `pages.main`)
2. **Key name(s)** — in `snake_case` (e.g., `my_new_label`)
3. **French text** (`fr-FR`) — the actual French string
4. **English text** (`en-US`) — natural English (not a literal word-for-word translation)

If any is missing, ask for it before editing.

## What to produce

Edit **both** `i18n/locales/fr-FR.json` and `i18n/locales/en-US.json`.

Add the new key(s) at the correct nesting level. Example for a new label in `components.image_uploader`:

```json
// fr-FR.json
{
  "components": {
    "image_uploader": {
      "my_new_label": "Mon nouveau libellé"
    }
  }
}

// en-US.json
{
  "components": {
    "image_uploader": {
      "my_new_label": "My new label"
    }
  }
}
```

## Rules

- Key = `snake_case`, never camelCase or kebab-case
- Add to **both** files in the same edit — never one without the other
- `app.meta.description` must be ≤160 characters
- Preserve existing JSON structure — do not reformat or reorder unrelated sections
- Use 2-space indent, no trailing commas (valid JSON)

## Key Structure Reference

```
app.*                        — app name, meta description
about.*                      — author info
links.*                      — external link labels
components.footer.*
components.image_uploader.*
components.lang_switcher.*
pages.main.*
```
