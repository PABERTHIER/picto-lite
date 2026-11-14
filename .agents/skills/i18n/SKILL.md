---
name: i18n
description: Add, update or review PictoLite French and English messages, interpolation, reactive translated UI and locale-aware navigation, including translation-only requests.
---

# PictoLite Internationalization

Follow [AGENTS.md](../../../AGENTS.md) for shared constraints.
Read both locale files and the affected consumers before editing.
Keep translation-only requests within their scope.

## Locale And Message Map

| Route code | Language                                       | Source                                         |
| ---------- | ---------------------------------------------- | ---------------------------------------------- |
| `fr`       | French, source language and configured default | [fr-FR.json](../../../i18n/locales/fr-FR.json) |
| `en`       | English                                        | [en-US.json](../../../i18n/locales/en-US.json) |

The `prefix` strategy includes `/fr` and `/en`.
Read [nuxt.config.ts](../../../nuxt.config.ts) before changing routing or browser-language detection.
The current root detection uses the `i18n_redirected` cookie.

| Namespace                          | Ownership                                    |
| ---------------------------------- | -------------------------------------------- |
| `app.*`                            | App name and global description              |
| `about.*`                          | Author information                           |
| `links.*`                          | Existing external-link namespace             |
| `components.footer.*`              | Repository-link label                        |
| `components.image_uploader.*`      | Upload, conversion, result and download copy |
| `components.image_preview_modal.*` | Comparison, close and zoom labels            |
| `components.lang_switcher.*`       | Language-control label                       |
| `pages.main.*`                     | Existing main-page message namespace         |

Search existing keys and consumers before adding a shared message.
Do not assume a declared message is used simply because it exists in the JSON tree.

## Edit Messages Together

Every change to one locale file must have a matching change in the other in the same edit.
Add, rename and remove identities together, keeping nesting, value types and interpolation names aligned.
Update affected consumers when changing a key.
Search dynamic key construction as well as literal `t()` calls before removing messages.
French fallback can hide missing English entries.

Use `snake_case` keys and preserve existing structure and unrelated ordering.
Keep valid JSON with two-space indentation, no comments and no trailing commas.
Preserve proper names and filenames; write natural English rather than copying French syntax.
Keep action labels concise and errors clear about the user's next step.
Descriptions should explain the actual product without promising visually lossless compression or a guaranteed reduction.
A concise search description is useful; do not treat a fixed character count as a universal search-engine cutoff.

Inspect Vue I18n message syntax before adding literal `|` or `@` characters.
Preserve intentional plural or linked-message syntax and interpolation placeholders.
Keep translated content as text rather than introducing `v-html`.
Draft missing translations when the intended meaning is clear.
Ask for clarification only when unresolved meaning or source facts affect the result.

## Keep UI And Navigation Reactive

Call `t()` in templates or a tracked getter.
For labels, arrays or metadata derived in script, use `computed()` or the receiving API's reactive getter.

```ts
const { t } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

const downloadLabel = computed(() =>
  t('components.image_uploader.download_image_wording')
)
```

Use `localePath('/')` for internal page destinations and `switchLocalePath(code)` for changing the current route's language.
Do not localize public-asset paths or external URLs.
Keep visible language codes within meaningful accessible names.

[LangSwitcher.vue](../../../app/components/LangSwitcher.vue) renders a translated navigation landmark with corresponding-route links, language attributes and an active-locale indicator.
Nuxt I18n owns locale navigation and the `i18n_redirected` preference cookie; the component has no storage, mounted locale override or document-direction side effects.
French and English use the browser's default left-to-right direction.
When changing this behavior, check the URL, rendered language and cookie together.
The [component tests](../../../app/tests/components/langSwitcher.test.ts) exercise real Nuxt I18n navigation and cookie persistence in both directions, including direct localized URLs taking precedence over a previous cookie.
A changed locale ref alone does not prove that navigation or head metadata followed.
Read root and page head blocks when changing localized SEO.

## Verification

Parse both JSON files and compare affected leaf paths, value types and interpolation names.
Keep all locale edits paired, including removals.
Run lint and relevant message-compilation, test or generation checks when messages or consumers change.
Switch FR/EN without reloading and inspect affected labels, accessible names, preview controls and metadata.
Check direct localized URLs and longer labels at narrow widths.
Report pre-existing differences separately and avoid expanding the task into unrelated message cleanup.
