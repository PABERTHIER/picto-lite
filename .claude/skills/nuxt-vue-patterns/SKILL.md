---
name: nuxt-vue-patterns
description: >
  Vue 3 + Nuxt 4 conventions for PictoLite: SFC structure, auto-imports,
  TypeScript, SCSS, component patterns.
  Use when writing or reviewing any .vue file.
disable-model-invocation: true
---

Reference for Vue 3 + Nuxt 4 patterns used in PictoLite.

---

## SFC Structure (always in this order)

```vue
<template>
  <!-- markup -->
</template>

<script setup lang="ts">
// 1. Explicit type imports (the only manual imports needed)
import type { ResultItem } from '~/types/result'

// 2. Composables
const { t } = useI18n()

// 3. Reactive state / computed

// 4. Functions
</script>

<style lang="scss" scoped>
/* styles */
</style>
```

Rules:
- Always `<script setup lang="ts">` — never Options API, never `<script>` without `setup`
- Always `<style lang="scss" scoped>` — except `app/layouts/default.vue` (global styles, intentionally unscoped)
- Template first, then script, then style

---

## Auto-Imports (NON-NEGOTIABLE: never import these manually)

Adding a manual import for any of these will cause lint errors:

**Vue reactivity:** `ref`, `computed`, `watch`, `watchEffect`, `reactive`, `readonly`, `toRef`, `toRefs`, `onMounted`, `onBeforeUnmount`, `onUnmounted`

**Nuxt composables:** `useI18n`, `useHead`, `useSeoMeta`, `useRoute`, `useRouter`, `useRuntimeConfig`, `useNuxtApp`, `useState`, `navigateTo`, `definePageMeta`, `useLocalePath`, `defineOgImageComponent`

**Project composables** (from `app/composables/`): `optimizeImage`

**Components:** all components in `app/components/` are auto-imported — never import them in `<script setup>`

---

## What Must Be Manually Imported

```typescript
import type { ResultItem } from '~/types/result'
import type { FileResult } from '~/types/result'
import type { ShowSaveFilePicker } from '~/types/file-picker'
import type { FilePickerOptions } from '~/types/file-picker'
import type { localesType } from '~/types/locales'
```

Types are **never** auto-imported — always use `import type`.

---

## TypeScript Patterns

```typescript
// Always explicitly type reactive state with complex types
const results = ref<ResultItem[]>([])
const input = ref<HTMLInputElement>()

// Let TypeScript infer primitives
const convertToWebp = ref(false)
const totalFiles = ref(0)

// Computed return type is inferred
const progressPercent = computed(() =>
  totalFiles.value > 0
    ? Math.round((processedFiles.value / totalFiles.value) * 100)
    : 0
)
```

`strict: true` is enabled in `tsconfig.json` — no implicit `any`, no unchecked nulls.

---

## Reactive i18n in meta tags (NON-NEGOTIABLE)

Inside `useHead()` and `useSeoMeta()`, **all** `t()` calls must be wrapped in `computed()`:

```typescript
// ✅ Reactive — updates when locale changes
content: computed(() => t('app.meta.description'))

// ❌ Wrong — stale on locale switch
content: t('app.meta.description')
```

Exception: `articleTag` array values resolve with `.value`:
```typescript
articleTag: computed(() => [
  computed(() => t('about.author')).value,
  computed(() => t('app.name')).value,
])
```

---

## SCSS Variables

All variables from `app/styles/variables.scss` are globally injected via Vite — use them directly without `@use`:

```scss
<style lang="scss" scoped>
.my-element {
  color: $primary-text-color;
  background: $background-color;
  border: 1px solid $drop-zone-border-color;

  @media (max-width: $md) {
    font-size: 14px;
  }
}
</style>
```

**Key variables:**

| Category | Variable | Value |
|---|---|---|
| Text | `$primary-text-color` | #000000 |
| Colors | `$blue-color` | #3B82F6 |
| Colors | `$blue-color-2` | #2563EB |
| Colors | `$dark-red-color` | #A00000 |
| Colors | `$grey-blue-color` | #7A9FF0 |
| Background | `$background-color` | #FFFFFF |
| Border | `$drop-zone-border-color` | $dark-grey-color |
| Z-index | `$header-z-index` | 30 |
| Height | `$header-height` | 74px |
| Height | `$footer-height` | 44px |
| Breakpoint | `$sm` | 640px |
| Breakpoint | `$md` | 768px |
| Breakpoint | `$lg` | 1024px |

---

## Icons

Custom SVG icons use the `pl-icon` collection (files in `app/assets/svg/`):
```vue
<Icon name="pl-icon:my-icon" color="black" size="25px" mode="svg" />
```

---

## File Naming

| What | Convention | Example |
|---|---|---|
| Page files | `index.vue` in path directory | `app/pages/index.vue` |
| Component files | PascalCase | `ImageUploader.vue`, `Header.vue` |
| Composable files | camelCase with `use` prefix | `useImageOptimizer.ts` |
| Type files | kebab-case | `result.ts`, `file-picker.ts` |
| SCSS files | kebab-case | `variables.scss`, `default.scss` |
| i18n files | locale code | `fr-FR.json`, `en-US.json` |

---

## Linting

```bash
yarn lint        # check
yarn lint:fix    # auto-fix
```

Rules to be aware of:
- `no-console: warn` — remove `console.log` before committing
- Prettier is integrated — formatting is enforced automatically
