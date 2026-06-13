---
name: nuxt-vue-patterns
description: "Vue 3 + Nuxt 4 best practices for PictoLite: Composition API, auto-imports, TypeScript, SCSS, component conventions. Use this skill when writing or modifying Vue components or pages."
---

# Nuxt & Vue Patterns Skill

This skill documents the Vue 3 / Nuxt 4 conventions used across PictoLite.
Follow these patterns for all new code and when modifying existing files.

---

## SFC Structure (always in this order)

```vue
<template>
  <!-- markup -->
</template>

<script setup lang="ts">
// type imports only — everything else is auto-imported
// composables
// reactive state
// computed properties
// functions
</script>

<style lang="scss" scoped>
/* styles */
</style>
```

**Rules:**
- Always `<script setup lang="ts">` — never Options API, never `<script>` without `setup`
- Always `lang="scss" scoped` on styles — except `app/layouts/default.vue` which uses unscoped global styles
- Template first, then script, then style

---

## Auto-Imports — Do Not Import These

Nuxt auto-imports the following — adding a manual import causes a lint error:

**Vue reactivity:** `ref`, `computed`, `watch`, `watchEffect`, `reactive`, `readonly`,
`toRef`, `toRefs`, `onMounted`, `onBeforeUnmount`, `onUnmounted`

**Nuxt composables:** `useI18n`, `useHead`, `useSeoMeta`, `useRoute`, `useRouter`,
`useRuntimeConfig`, `useNuxtApp`, `useState`, `navigateTo`, `definePageMeta`, `useLocalePath`

**Project composables** (from `app/composables/`): `optimizeImage`

---

## What Must Be Manually Imported

```typescript
// Types always require explicit import
import type { ResultItem } from '~/types/result'
import type { FileResult } from '~/types/result'
import type { ShowSaveFilePicker } from '~/types/file-picker'
import type { FilePickerOptions } from '~/types/file-picker'
import type { localesType } from '~/types/locales'
```

---

## SCSS Variables

Variables from `app/styles/variables.scss` are **globally injected** via Vite's `additionalData`
and are available in every `.vue` scoped style block without any `@use` directive.

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

### Available SCSS variables

**Colors:** `$primary-text-color`, `$white-color`, `$red-color`, `$dark-red-color`,
`$green-color`, `$light-grey-color`, `$grey-color`, `$grey-color-2`, `$dark-grey-color`,
`$light-blue-color`, `$blue-color`, `$blue-color-2`, `$grey-blue-color`

**Backgrounds:** `$background`, `$background-color`, `$header-background-color`,
`$footer-background-color`

**Border:** `$drop-zone-border-color`

**Z-indexes:** `$header-z-index` (30), `$footer-z-index` (30)

**Heights:** `$header-height` (74px), `$footer-height` (44px)

**Breakpoints:** `$sm` (640px), `$md` (768px), `$lg` (1024px)

---

## Responsive Design

Use `$sm`, `$md`, `$lg` breakpoints from `variables.scss` in media queries.

---

## TypeScript Patterns

### Explicit typing for reactive state
```typescript
const results = ref<ResultItem[]>([])
const input = ref<HTMLInputElement>()
const convertToWebp = ref(false)        // TypeScript infers boolean
const totalFiles = ref(0)               // TypeScript infers number
```

### Computed with type inference
```typescript
const progressPercent = computed(() =>
  totalFiles.value > 0
    ? Math.round((processedFiles.value / totalFiles.value) * 100)
    : 0
)
```

### Avoid `any`
The project has `strict: true`. Never use `any` — use proper types or `unknown`.

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

ESLint is configured with `eslint-plugin-prettier`. Rules:
- `no-console: warn` — remove debug logs before committing
