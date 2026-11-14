---
name: nuxt-vue-patterns
description: Implement or review PictoLite Nuxt 4 and Vue 3 components, pages, composables and configuration using its TypeScript, SSR, lifecycle and SCSS contracts.
---

# PictoLite Nuxt And Vue Patterns

Follow [AGENTS.md](../../../AGENTS.md) for shared constraints.
Read the affected implementation, [nuxt.config.ts](../../../nuxt.config.ts) and [package.json](../../../package.json) before choosing APIs or adding dependencies.

## Existing Building Blocks

| Concern            | Owner                                                                  | Contract                                                                         |
| ------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Shared shell       | [default.vue](../../../app/layouts/default.vue)                        | Header, one main landmark, footer, global SCSS and cleaned-up viewport listener  |
| Main page          | [index.vue](../../../app/pages/index.vue)                              | Upload surface and page metadata                                                 |
| File processing UI | [ImageUploader.vue](../../../app/components/ImageUploader.vue)         | Sequential batch processing, progress, result IDs, preview and downloads         |
| Image comparison   | [ImagePreviewModal.vue](../../../app/components/ImagePreviewModal.vue) | Required `item: ResultItem`, `close` event, independent panel zoom and blob URLs |
| Compression        | [useImageOptimizer.ts](../../../app/composables/useImageOptimizer.ts)  | Auto-imported `optimizeImage(file, shouldConvertToWebp)` returning `FileResult`  |
| Language links     | [LangSwitcher.vue](../../../app/components/LangSwitcher.vue)           | Accessible corresponding-route links; Nuxt I18n owns the preference cookie       |
| Shared types       | [app/types](../../../app/types/)                                       | Explicitly imported result, picker and locale contracts                          |
| Sass tokens        | [variables.scss](../../../app/styles/variables.scss)                   | Colors, layers, heights and `$sm`/`$md`/`$lg` breakpoints                        |

Check the actual component contract instead of assuming that arbitrary attributes reach nested elements.
Preserve required result IDs and original blobs when constructing or replacing results.
Batch invalidation prevents cleared or replaced uploads from being repopulated by an earlier async operation.

## Components And Types

Use `<template>`, `<script setup lang="ts">`, then `<style lang="scss" scoped>` for components and pages.
The default layout intentionally uses unscoped SCSS for global and shell rules.
It already supplies the main landmark; do not add a nested main in a page using that layout.
Use braces for conditionals and blank lines between guards, state changes, derived values and returns.
Group declarations and helpers by responsibility rather than compressing control flow.

Prefer Nuxt auto-imports for registered Vue/Nuxt composables, lifecycle hooks and components.
This includes `ref`, `computed`, `watch`, `useI18n`, `useHead`, `useSeoMeta` and `optimizeImage`.
Component registration uses `pathPrefix: false`; avoid colliding basenames.
Explicitly import external library APIs such as `JSZip` and project types with `import type`.
Do not assume all non-type imports are forbidden or that valid explicit imports inherently cause a lint error.
Tests may import components, Vue helpers and the optimizer directly when exercising those modules.

```ts
import JSZip from 'jszip'
import type { ResultItem } from '~/types/result'

const results = ref<ResultItem[]>([])
const previewItem = ref<ResultItem | null>(null)
const convertToWebp = ref(false)
```

Use strict types, typed props/emits and explicit handling of optional DOM refs.
Let primitives infer their types and annotate complex state or function contracts where inference is insufficient.
Prefer `unknown` with narrowing over `any`.
Use PascalCase component filenames, `use`-prefixed composable filenames and the existing type-file naming.

### SFC Structure

The following shape uses the existing conversion label and injected Sass tokens.

```vue
<template>
  <label class="webp-option">
    <input v-model="convertToWebp" type="checkbox" />
    {{ t('components.image_uploader.webp_option_checkbox_name') }}
  </label>
</template>

<script setup lang="ts">
const { t } = useI18n()
const convertToWebp = ref(false)
</script>

<style lang="scss" scoped>
.webp-option {
  color: $primary-text-color;
}
</style>
```

## State, Localization And SSR

Use [i18n](../i18n/SKILL.md) for messages and localized navigation.
Keep translated script-side arrays, labels and metadata inside `computed()` or a tracked getter.
Reading a computed value once into a static object still produces a snapshot.
A translated array can be derived with one computed getter; nested computed values are unnecessary.

Keep browser globals, storage access, canvas work and object URLs in client execution paths.
Render stable initial markup on the server and client.
Do not hide entire pages behind `ClientOnly` to mask hydration problems.
Keep mutable visitor state component-owned rather than introducing shared module-level state.

Clean up added listeners, timers, observers and object URLs.
Choose `v-if` or `v-show` according to mounting and state needs.
The preview currently uses `v-if` so its unmount hook revokes URLs, removes its Escape listener and resets body overflow.
Do not change that lifecycle without preserving cleanup.

Read both [app.vue](../../../app/app.vue) and the page head block for metadata changes.
They currently overlap; follow the requested scope and verify the effective rendered head.
Prefer reactive values for new metadata rather than copying setup-time URL or locale snapshots.

## Styling, Icons And Controls

Vite injects `variables.scss` through `additionalData`.
Use its existing tokens without repeating their import in component styles.
Sass built-ins still need their own `@use` when used.
Nuxt's `css` option loads `default.scss` once for base link rules; the default layout owns the remaining global and shell rules.
Keep CSS-emitting base rules out of repeated layout or component imports; Vite injects only `variables.scss` tokens.
Keep static appearance in scoped SCSS and allow inline bindings for dynamic progress or preview geometry.

| Token group | Current examples                                                            |
| ----------- | --------------------------------------------------------------------------- |
| Colors      | `$primary-text-color`, `$blue-color`, `$dark-red-color`, `$grey-blue-color` |
| Surfaces    | `$background-color`, `$header-background-color`, `$footer-background-color` |
| Layers      | `$header-z-index`, `$footer-z-index`, `$modal-z-index`                      |
| Heights     | `$header-height`, `$footer-height`                                          |
| Breakpoints | `$sm: 640px`, `$md: 768px`, `$lg: 1024px`                                   |

Check actual token values before extending styles.
Preserve safe-area clearance and essential upload, preview and download controls at narrow widths.
Use native buttons for actions and links for destinations, visible focus and translated accessible names.
Do not copy a click-only container as the pattern for new controls.
Respect reduced motion when changing animation or scrolling.

The footer uses `<Icon name="pl-icon:github-mark">` from the custom SVG collection.
It is supplied by the explicitly registered `@nuxt/icon` module.
Preserve that module and the `pl-icon` custom collection when changing dependencies.
Keep decorative icons hidden from assistive technology when their parent control supplies the name.

## Verification

Use [shared verification](../../../AGENTS.md#verification).
Run lint and relevant focused tests for behavior changes, with build/generation checks when SSR, configuration or delivery changes.
Exercise affected FR/EN upload, preview or download states at narrow and desktop widths.
Report actual checks separately from unavailable browser or device coverage.
