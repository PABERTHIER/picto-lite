---
description: 'Use when editing PictoLite Vue components, pages, layouts, application TypeScript, shared SCSS or Nuxt configuration.'
applyTo: 'app/**/*.vue,app/**/*.ts,app/styles/**/*.scss,nuxt.config.ts'
---

# Vue And Nuxt Instructions

Use [nuxt-vue-patterns](../../.agents/skills/nuxt-vue-patterns/SKILL.md) for component contracts, TypeScript, SSR, lifecycle and styles.
Read the affected implementation before choosing a new abstraction.

## Implementation Rules

- Keep SFC order: `<template>`, `<script setup lang="ts">`, then scoped SCSS.
  Preserve the default layout's intentional unscoped global styles.
  Nuxt's `css` option loads `default.scss` once; do not import it again in layouts or components.
  Vite injects only `variables.scss` tokens.
- Prefer Nuxt auto-imports for registered composables and components.
  Import project types and external library APIs explicitly; tests may also need explicit imports.
- Use braces for conditionals and blank lines between guards, state changes, derived values and returns.
  Group declarations and helpers by responsibility.
- Keep browser globals and DOM access in mounted hooks or user-event paths.
  Preserve stable SSR markup and clean up listeners, timers and object URLs.
- Keep translated script-side values and metadata reactive with tracked getters or `computed()`.
  Use the [i18n skill](../../.agents/skills/i18n/SKILL.md) for localized destinations and messages.
- Reuse the layout's main landmark, injected Sass tokens and actual component contracts.
  Dynamic progress and preview measurements can use inline bindings; static appearance belongs in SCSS.
- Preserve result IDs, batch invalidation and original blobs when changing uploader state.
  Read [optimizer instructions](optimizer.instructions.md) when changing result or download behavior.

## Select Additional Guidance

| Concern in the task                          | Guidance                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Locale messages or translated consumers      | [i18n](../../.agents/skills/i18n/SKILL.md)                                                                           |
| Tests, mocks or async assertions             | [testing](../../.agents/skills/testing/SKILL.md) and [test instructions](testing.instructions.md)                    |
| Compression, results or downloads            | [optimizer instructions](optimizer.instructions.md) and [optimizer reference](../../.agents/docs/IMAGE_OPTIMIZER.md) |
| Appearance, responsive layout or interaction | [Mobile acceptance](../../AGENTS.md#mobile-experience-acceptance-criteria) and the Nuxt/Vue skill                    |

Load only the guidance needed for the change.
Follow [shared verification](../../AGENTS.md#verification), including affected French/English and mobile/keyboard journeys.
