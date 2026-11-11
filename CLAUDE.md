# Claude Code Entry Point

@AGENTS.md

Follow the shared project rules and Git restriction in [AGENTS.md](AGENTS.md).
Read applicable [scoped instructions](AGENTS.md#tool-integration-and-scoped-instructions) manually when the client does not attach them.
Use [.agents/README.md](.agents/README.md) to select focused context.

## Project References

| File                                                       | Purpose                                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                     | Shared constraints, architecture, commands, scope selection and verification |
| [.agents/README.md](.agents/README.md)                     | Guidance ownership, evidence levels and catalogs                             |
| [README.md](README.md)                                     | Product overview, development, coverage and deployment context               |
| [copilot-instructions.md](.github/copilot-instructions.md) | Copilot entry point to the same shared workflows                             |

## Reference Documentation

| Guide                                                        | Read for                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [Agent optimizer reference](.agents/docs/IMAGE_OPTIMIZER.md) | Pipelines, original-file fallback, browser APIs and review criteria     |
| [Developer optimizer walkthrough](docs/IMAGE_OPTIMIZER.md)   | Detailed pipeline, helper and metadata diagrams                         |

## Shared Skills

| Skill                | Shared file                                                    | Command              |
| -------------------- | -------------------------------------------------------------- | -------------------- |
| Nuxt and Vue         | [nuxt-vue-patterns](.agents/skills/nuxt-vue-patterns/SKILL.md) | `/nuxt-vue-patterns` |
| Internationalization | [i18n](.agents/skills/i18n/SKILL.md)                           | `/i18n`              |
| Testing              | [testing](.agents/skills/testing/SKILL.md)                     | `/testing`           |

Canonical skills live in `.agents/skills/`.
The command files below preserve shortcuts and read the same shared guidance.

## Scoped Instructions

| Instruction                                                       | File patterns                                                                                     | Use for                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [Nuxt and Vue](.github/instructions/vue-nuxt.instructions.md)     | `app/**/*.vue`, `app/**/*.ts`, `app/styles/**/*.scss`, `nuxt.config.ts`                           | Components, SSR, shared contracts and styles        |
| [Internationalization](.github/instructions/i18n.instructions.md) | `i18n/**/*.json`                                                                                  | French and English messages, keys and interpolation |
| [Testing](.github/instructions/testing.instructions.md)           | `app/tests/**/*.ts`, `vitest.config.mts`                                                          | Runtime tests, mocks and configuration              |
| [Optimizer](.github/instructions/optimizer.instructions.md)       | `app/composables/useImageOptimizer.ts`, `app/components/ImageUploader.vue`, `app/types/result.ts` | Compression invariants, results and downloads       |

Select matching files using [AGENTS.md's applicability rules](AGENTS.md#tool-integration-and-scoped-instructions).
Keep detailed requirements in their owning guide, skill or scoped file rather than duplicating them in Claude-only rules.

## Command Adapters

| Command              | File                                                          | Scope                                                    |
| -------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| `/add-translations`  | [add-translations.md](.claude/commands/add-translations.md)   | Edit both locale files within a translation-only request |

## Reusable Task Prompts

| Prompt specification | File                                                                     | Matching Claude workflow                      |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------------- |
| Locale messages only | [add-translations.prompt.md](.github/prompts/add-translations.prompt.md) | `/add-translations` and the shared i18n skill |

The Copilot prompt defines the reusable task scope.
Claude uses the command adapter for the same shared workflow.

## Review Agent

[optimizer-reviewer](.claude/agents/optimizer-reviewer.md) reviews optimizer and uploader source without modifying files.
Its availability does not require delegation for ordinary work.
Its read-only tools cannot establish test, build or browser results.

## Local Execution

Use the Yarn version pinned in `package.json`, with Node.js 24 as in CI.
Use PowerShell on Windows; `yarn.cmd` avoids a blocked `yarn.ps1` launcher.
Follow [shared verification](AGENTS.md#verification) and report checks actually performed.
