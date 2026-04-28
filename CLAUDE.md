# CLAUDE.md

This file provides project context for Claude Code.

## Core Reference

@AGENTS.md

---

## Claude Code — Specific Notes

### Environment

- **OS**: Windows. Use PowerShell commands (not bash).
- **Package manager**: Yarn 4 — always use `yarn`, never `npm`.
- **Dev server**: `yarn dev` (port 3000). After changes, `yarn lint` to verify.

### Auto-imports in this project

Nuxt auto-imports mean you must **never** manually import these in `.vue` or `.ts` files:

```typescript
// ❌ These are auto-imported — adding them manually will trigger lint errors
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead, useSeoMeta } from '#imports'
import { defineOgImageComponent } from 'nuxt-og-image'
```

Auto-imported from `app/composables/`:

```typescript
// ❌ Do NOT import — Nuxt auto-imports named exports from app/composables/
import { optimizeImage } from '~/composables/useImageOptimizer'
```

### What must be manually imported

Types always require explicit import:

```typescript
import type { ResultItem } from '~/types/result'
import type { FileResult } from '~/types/result'
import type { ShowSaveFilePicker } from '~/types/file-picker'
import type { FilePickerOptions } from '~/types/file-picker'
import type { localesType } from '~/types/locales'
```

### Where things live

| What | Where |
|---|---|
| Main page | `app/pages/index.vue` |
| Root SEO/i18n | `app/app.vue` — global `useHead`, `useSeoMeta`, hreflang, OG |
| Image optimizer | `app/composables/useImageOptimizer.ts` |
| Upload UI | `app/components/ImageUploader.vue` |
| FR translations | `i18n/locales/fr-FR.json` |
| EN translations | `i18n/locales/en-US.json` |
| SCSS variables | `app/styles/variables.scss` (auto-injected — use directly, no `@use` needed in `.vue`) |
| TypeScript types | `app/types/result.ts`, `app/types/file-picker.ts`, `app/types/locales.ts` |
| Test helpers | `app/tests/helpers/offscreen-mock.ts` |
| Test setup | `app/tests/setup.ts` |

### SEO architecture note

Global SEO metadata (`useHead`, `useSeoMeta`, hreflang alternates, OG) is set in `app/app.vue`,
not in `app/pages/index.vue`. Page-level SEO additions go in the page component only if they
differ from or supplement the global defaults set in `app.vue`.

---

## Available Skills

Invoke with `/skill-name [arguments]` in Claude Code. Skills live in `.claude/skills/`.

| Skill | Invocation | When to use |
|---|---|---|
| nuxt-vue-patterns | `/nuxt-vue-patterns` | Vue/Nuxt conventions: Composition API, SCSS, auto-imports |
| i18n | `/i18n "key location"` | Add or fix translation entries in both locale files |
| testing | `/testing "what to test"` | Vitest + @nuxt/test-utils patterns, mocking, async flows |

## Available Agents

Agents live in `.claude/agents/`.

| Agent | When to use |
|---|---|
| `optimizer-reviewer` | Review image optimizer changes for correctness, invariants, and test coverage |

## Available Commands

Commands live in `.claude/commands/`. Invoke with `/command-name` in Claude Code.

| Command | Invocation | When to use |
|---|---|---|
| add-translations | `/add-translations` | Add i18n entries to both locale files only |
