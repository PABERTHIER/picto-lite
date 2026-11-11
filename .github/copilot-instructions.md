# GitHub Copilot Entry Point

[AGENTS.md](../AGENTS.md) owns shared constraints, architecture, commands and verification.
Its Git policy prohibits every Git command unless the user explicitly lifts the restriction for the task.
Use [.agents/README.md](../.agents/README.md) to select focused context.

## Copilot Conventions

- Treat [mobile acceptance](../AGENTS.md#mobile-experience-acceptance-criteria) as part of UI completion.
  Check affected FR/EN journeys, longer labels, keyboard/touch operation and short viewports.
- Follow the nearest implementation and the Nuxt/Vue skill.
  The default layout owns the main landmark and intentional global styles; component appearance uses scoped SCSS.
- Keep translated derived state and metadata reactive.
  Read both root and page head blocks, and use locale-aware destinations without localizing asset URLs.
- Preserve optimizer size/fallback behavior, result IDs, original blobs and async batch invalidation.
  Native picker cancellation must not start a browser fallback download.
- Read matching scoped instructions and load only relevant guide and skill bodies.

## Reference Documentation

| Guide                                                           | Read for                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| [Agent optimizer reference](../.agents/docs/IMAGE_OPTIMIZER.md) | Actual branches, invariants, limitations and review criteria |
| [Developer optimizer walkthrough](../docs/IMAGE_OPTIMIZER.md)   | Detailed pipeline, helper and metadata diagrams              |

## Shared Skills

| Skill                | File                                                              | Use for                                                |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| Nuxt and Vue         | [nuxt-vue-patterns](../.agents/skills/nuxt-vue-patterns/SKILL.md) | Components, TypeScript, SSR, styles and lifecycle      |
| Internationalization | [i18n](../.agents/skills/i18n/SKILL.md)                           | Paired FR/EN messages and reactive localized consumers |
| Testing              | [testing](../.agents/skills/testing/SKILL.md)                     | Nuxt mounting, browser mocks and async behavior        |

Keep canonical skill content in `.agents/skills/`.
The catalog is a discovery aid; load only the guidance needed for the task.

## Scoped Instructions

| Instruction                                               | File patterns                                                                                     | Use for                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [Nuxt and Vue](instructions/vue-nuxt.instructions.md)     | `app/**/*.vue`, `app/**/*.ts`, `app/styles/**/*.scss`, `nuxt.config.ts`                           | Structure, SSR, component contracts and styling |
| [Internationalization](instructions/i18n.instructions.md) | `i18n/**/*.json`                                                                                  | Locale keys, copy and interpolation             |
| [Testing](instructions/testing.instructions.md)           | `app/tests/**/*.ts`, `vitest.config.mts`                                                          | Runtime tests and configuration                 |
| [Optimizer](instructions/optimizer.instructions.md)       | `app/composables/useImageOptimizer.ts`, `app/components/ImageUploader.vue`, `app/types/result.ts` | Compression, results and downloads              |

Each scoped file declares `description` and `applyTo` metadata.
Read matching files explicitly when automatic attachment is unavailable.
Use the [shared applicability rules](../AGENTS.md#tool-integration-and-scoped-instructions) when scopes overlap.

## Reusable Prompts

| Prompt              | File                                                             | Scope                                              |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| `/add-translations` | [add-translations.prompt.md](prompts/add-translations.prompt.md) | Both locale files through the shared i18n workflow |

Keep tool-specific files focused on routing to shared guidance.
Use [AGENTS.md verification](../AGENTS.md#verification) and report checks actually performed.
