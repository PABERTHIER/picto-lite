---
applyTo: "app/**/*.vue"
---

# Vue & Nuxt File Instructions

## Script Block

Always use `<script setup lang="ts">`. Never use Options API or `<script>` without `setup`.

### Auto-imports — NEVER import these manually

```typescript
// ❌ These will trigger lint errors (unnecessary imports)
import { ref, computed, watch, watchEffect, reactive } from 'vue'
import { onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead, useSeoMeta } from '#imports'
import { defineOgImageComponent } from 'nuxt-og-image'
```

Nuxt auto-imports: `ref`, `computed`, `watch`, `watchEffect`, `reactive`, `readonly`,
`toRef`, `toRefs`, `onMounted`, `onBeforeUnmount`, `onUnmounted`, `useI18n`, `useHead`,
`useSeoMeta`, `useRoute`, `useRouter`, `useRuntimeConfig`, `useNuxtApp`, `useState`,
`navigateTo`, `definePageMeta`, `useLocalePath`, `defineOgImageComponent`

Auto-imported from `app/composables/`:
`optimizeImage` — do NOT import manually

### DO import types explicitly

```typescript
import type { ResultItem } from '~/types/result'
import type { FileResult } from '~/types/result'
import type { ShowSaveFilePicker } from '~/types/file-picker'
import type { FilePickerOptions } from '~/types/file-picker'
import type { localesType } from '~/types/locales'
```

---

## Template Block

- Components are auto-imported — never manually register or import them in `<script setup>`
- Always use `localePath()` for internal navigation links:
  ```vue
  <NuxtLink :to="localePath('/')">...</NuxtLink>
  ```
- Use `:prop="value"` (v-bind shorthand) for dynamic props
- Use `v-show` instead of `v-if` for elements that toggle visibility without being removed from DOM

---

## Style Block

Always `<style lang="scss" scoped>`. Never:
- Plain CSS (`<style>`)
- Unscoped styles (`<style lang="scss">` without `scoped`)
- Inline styles on elements

SCSS variables from `app/styles/variables.scss` are globally injected — use them without `@use`:
```scss
.my-class {
  color: $primary-text-color;     // ✅ correct
  background: $background-color;
  height: $header-height;

  @media (max-width: $sm) {
    font-size: 14px;
  }
}
```

Exception: `app/layouts/default.vue` uses `<style lang="scss">` (unscoped) for global reset
and layout styles — this is intentional. Other layout and page styles use `scoped`.

---

## Reactive Values in Meta Tags

i18n values used in `useHead()` and `useSeoMeta()` must be wrapped in `computed()`:

```typescript
// ✅ correct — reactive
content: computed(() => t('app.meta.description'))

// ❌ wrong — not reactive, won't update on locale switch
content: t('app.meta.description')
```

Exception: `articleTag` array values use `.value` directly (already resolved):
```typescript
articleTag: computed(() => [
  computed(() => t('about.author')).value,
  computed(() => t('app.name')).value,
])
```

---

## TypeScript Strictness

- `strict: true` is enabled — no implicit `any`
- Always type reactive variables when TypeScript cannot infer: `const results = ref<ResultItem[]>([])`
- Use `const` for everything that doesn't need reassignment
- Prefer explicit type annotations on function parameters over inference
