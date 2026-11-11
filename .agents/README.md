# PictoLite Agent Guidance

This folder contains shared references and reusable skills for PictoLite.
Start with [AGENTS.md](../AGENTS.md) for constraints, architecture, commands and verification.
Use this index to load only the context needed for the task.

## Guidance Ownership

| Layer                | Location                                                                         | Purpose                                                  |
| -------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Shared project rules | [AGENTS.md](../AGENTS.md)                                                        | Constraints, source ownership, commands and verification |
| Reference guides     | [docs](docs/)                                                                    | Optimizer behavior and dependency evidence               |
| Task skills          | [skills](skills/)                                                                | Focused implementation and review workflows              |
| Scoped instructions  | [.github/instructions](../.github/instructions/)                                 | File-specific requirements and links to shared workflows |
| Task entry points    | [.github/prompts](../.github/prompts/), [.claude/commands](../.claude/commands/) | Reusable prompt scope and thin command adapters          |

Keep each detailed procedure in its owning skill and each maintenance topic in its guide.
Tool-specific files should link to shared guidance rather than maintain competing copies.

## Evidence And Implementation Status

| Status                  | Meaning                                                       | Use                                                                          |
| ----------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Confirmed content       | Supported by supplied information or authored project content | Preserve product identity, names and claims; verify proposed factual changes |
| Observed implementation | Supported by the inspected source or installed configuration  | Recheck the owner before relying on a contract                               |
| Proposed direction      | A recommendation or acceptance criterion                      | Apply within scope and validate before reporting it as implemented           |
| Verified behavior       | Supported by checks in a stated environment                   | Report the actual coverage and its limits                                    |

Documentation is not proof of runtime behavior.
Mocked Canvas tests do not establish real compression ratios, image fidelity or browser compatibility.
The dependency audit records recommendations without changing the manifest or lockfile.

## Reference Guides

| Guide                                                         | Read for                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Image optimizer](docs/IMAGE_OPTIMIZER.md)                    | Actual pipelines, thresholds, fallback semantics, metadata and review criteria |
| [Developer optimizer walkthrough](../docs/IMAGE_OPTIMIZER.md) | Detailed pipelines, helpers and metadata diagrams                              |

## Shared Skills

| Skill                                                  | Use for                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [nuxt-vue-patterns](skills/nuxt-vue-patterns/SKILL.md) | Vue/Nuxt structure, types, SSR, component contracts and styles                    |
| [i18n](skills/i18n/SKILL.md)                           | Paired locale edits, interpolation, reactive copy and localized navigation        |
| [testing](skills/testing/SKILL.md)                     | Nuxt runtime mounting, hoisted mocks, browser API simulation and async assertions |

Canonical skills live here; Claude command adapters read the same files.

## Scoped Instructions

Use [AGENTS.md's applicability table](../AGENTS.md#tool-integration-and-scoped-instructions) to select matching instructions, including overlapping scopes.
Automatic `applyTo` attachment depends on the client; read matching files explicitly when needed.

| Instruction                                                          | Applies to                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Nuxt and Vue](../.github/instructions/vue-nuxt.instructions.md)     | Vue files, application TypeScript, shared SCSS and Nuxt configuration |
| [Internationalization](../.github/instructions/i18n.instructions.md) | Locale JSON                                                           |
| [Testing](../.github/instructions/testing.instructions.md)           | Test TypeScript and Vitest configuration                              |
| [Optimizer](../.github/instructions/optimizer.instructions.md)       | Optimizer, uploader and result types                                  |

## Task Entry Points

| Entry point                                                               | Scope                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| [Copilot add-translations](../.github/prompts/add-translations.prompt.md) | Both locale files through the i18n workflow       |
| [Claude commands](../CLAUDE.md#command-adapters)                          | Shared Nuxt/Vue, i18n and testing workflows       |
| [Optimizer reviewer](../.claude/agents/optimizer-reviewer.md)             | Read-only source review using the optimizer guide |

Availability of the review agent does not require delegation or imply runtime validation.

## Maintenance

Keep examples grounded in the current source, two locales and installed capabilities.
Update catalogs and local links when moving, adding or removing resources.
Preserve useful diagrams, examples and developer-facing sections when reorganizing guidance.
Use UTF-8, LF, a final newline, aligned tables and one sentence per source line in prose.
Check Markdown with Prettier using `--prose-wrap preserve --end-of-line lf`.
Validate links, anchors, frontmatter and source accuracy after documentation changes.
Keep application checks proportional to actual implementation changes and report checks performed.
