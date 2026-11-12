# PictoLite Project Guidance

PictoLite is a browser-based image optimizer with optional WebP conversion at `https://pictolite.vercel.app`.
It uses Nuxt 4, Vue 3, TypeScript, SCSS and French/English routes, with Vercel hosting.
This is the shared project entry point for Codex, GitHub Copilot and Claude Code.
Use [.agents/README.md](.agents/README.md) to select focused guidance and verify implementation details against the current source.

## Shared Constraints

- Preserve unrelated user changes and keep work within the requested scope.
  Inspect files directly under the Git policy below.
- Keep image processing local to the browser.
  Preserve the original-file fallback, the output-size guarantee and the separate PNG paths.
- Keep French and English locale changes paired in the same edit.
  Preserve matching keys, nesting, value types and interpolation names.
- Prefer existing component contracts and Nuxt auto-imports.
  Import shared types and external library APIs explicitly.
- Keep browser-only operations out of server setup and clean up added listeners, timers and object URLs.
- Treat keyboard access, readable translated labels and mobile operation as part of affected UI work.
- Use the pinned package manager and task-relevant checks.
  Leave generated output and dependency files to their tools.

## Git Policy

Do not run **any Git command** unless the user explicitly lifts this restriction for the task.
This includes read-only inspection and commands that change files, the index, history or remotes.
Use filesystem inspection and direct comparisons instead.

If the user later requests a commit or push, show exactly what is proposed and ask for confirmation before running that command.
Do not treat that request as permission for unrelated Git operations or commit speculatively at the end of a task.

## Build And Dev Commands

Use Node.js 24, matching [CI](.github/workflows/ci.yml), and the Yarn version pinned by `packageManager` in [package.json](package.json).
The [Yarn configuration](.yarnrc.yml) uses the `node-modules` linker.
Enable Corepack when setting up the launcher; use `corepack yarn` if needed, or `yarn.cmd` on PowerShell hosts that block `yarn.ps1`.
Keep dependency changes within scope and let Yarn maintain `yarn.lock`.

| Task                        | Command                    | Notes                                                     |
| --------------------------- | -------------------------- | --------------------------------------------------------- |
| Install locked dependencies | `yarn install --immutable` | Preserve the lockfile during setup                        |
| Start development           | `yarn dev`                 | Normally `http://localhost:3000`                          |
| Check formatting            | `yarn format:check`        | Checks application Vue, TypeScript, SCSS and locale JSON  |
| Format application files    | `yarn format`              | Broad write operation; prefer changed-file scope          |
| Check types                 | `yarn typecheck`           | Nuxt and Vue TypeScript checks                            |
| Lint                        | `yarn lint`                | ESLint with Prettier integration                          |
| Fix lint findings           | `yarn lint:fix`            | Review fixes and keep them within scope                   |
| Run tests once              | `yarn test --run`          | Explicit single run outside CI                            |
| Start Vitest                | `yarn test`                | Watch mode in an interactive development session          |
| Watch tests                 | `yarn test:watch`          | Explicit watch mode                                       |
| Open Vitest UI              | `yarn test:ui`             | Interactive test UI                                       |
| Run coverage                | `yarn test:coverage`       | Single run; coverage is also enabled in the shared config |
| Build production output     | `yarn build`               | Validate the production application                       |
| Generate static output      | `yarn generate`            | Validate prerendering                                     |
| Preview built output        | `yarn preview`             | Run after building or generating                          |
| Prepare Nuxt output         | `yarn postinstall`         | Also runs after dependency installation                   |
| Profile a build             | `yarn profile`             | Use when profiling is requested                           |

CI installs dependencies immutably, runs lint and tests, and uploads coverage.
Its build-named job does not run `yarn build` or `yarn generate`.
The workflow's Corepack preparation version is separate from the package-manager pin; check the actual launcher version when reproducing CI.
Use only scripts present in `package.json`.

`format` and `format:check` exclude Markdown and root configuration files.
Check changed Markdown explicitly with the installed Prettier using `--prose-wrap preserve --end-of-line lf`.
See [README.md](README.md) for the human-facing setup and dependency map.

## Direct Dependencies

Consult [package.json](package.json) for current versions.

| Dependencies                                                                             | Purpose                                                                                   |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `nuxt`                                                                                   | Routing, Vue application build, SSR and prerendering                                      |
| `@nuxtjs/i18n`                                                                           | French/English messages and prefixed routes                                               |
| `@nuxtjs/seo`                                                                            | Site metadata, schema, robots, sitemap and link-checker integration                       |
| `@nuxt/icon`                                                                             | Explicit Icon integration for the custom `pl-icon` SVG collection                         |
| `@nuxt/fonts`                                                                            | Font integration with explicit font-weight defaults                                       |
| `jszip`                                                                                  | Bulk download of successful image results                                                 |
| `sass`                                                                                   | SCSS compilation                                                                          |
| `rolldown`                                                                               | Build tooling satisfying Nuxt's Rolldown peer dependency                                  |
| `vite`                                                                                   | Explicit Vite peer dependency required by Vitest 5 with Yarn                              |
| `vue`                                                                                    | Shared Vue runtime satisfying Nuxt Test Utils and Vue Test Utils peer dependencies        |
| `@vue/compiler-dom`                                                                      | Vue template compiler satisfying Vue Test Utils' peer dependency                          |
| `@nuxt/eslint`, `eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier` | Flat lint configuration and formatting; Nuxt supplies its config and globals transitively |
| `typescript`, `vue-tsc`, `@types/node`                                                   | Nuxt, Vue and Node type checking                                                          |
| `@nuxt/test-utils`, `@vue/test-utils`, `happy-dom`, `vitest`                             | Nuxt runtime mounting, component assertions, DOM environment and runner                   |
| `@vitest/coverage-v8`, `@vitest/ui`                                                      | Enabled V8 coverage, HTML reporting and interactive UI                                    |

## Architecture

```text
picto-lite/
├── .agents/
│   ├── README.md                 # Shared guidance index
│   ├── docs/                     # Agent optimizer reference
│   └── skills/
│       ├── nuxt-vue-patterns/SKILL.md
│       ├── i18n/SKILL.md
│       └── testing/SKILL.md
├── .claude/
│   ├── agents/optimizer-reviewer.md
│   └── commands/                 # Adapters to shared skills
├── .github/
│   ├── copilot-instructions.md   # Copilot entry point
│   ├── instructions/             # Scoped application, locale, test and optimizer rules
│   ├── prompts/                  # Reusable translation prompt
│   └── workflows/ci.yml
├── app/
│   ├── app.vue                   # Root metadata and locale alternates
│   ├── pages/index.vue           # Main page and page-level metadata
│   ├── layouts/default.vue       # Shared shell, global styles and viewport handling
│   ├── components/
│   │   ├── ImageUploader.vue     # Upload, progress, results and downloads
│   │   ├── ImagePreviewModal.vue # Original/optimized comparison and zoom
│   │   ├── Header.vue
│   │   ├── Footer.vue
│   │   ├── LangSwitcher.vue
│   │   └── OgImage/              # Component directory; generation is disabled
│   ├── composables/useImageOptimizer.ts
│   ├── data/
│   │   ├── site.ts               # Site name shared by configuration
│   │   └── seo.ts                # Robots directive values
│   ├── styles/
│   │   ├── variables.scss        # Injected Sass tokens
│   │   └── default.scss          # Base link rules loaded by Nuxt's css option
│   ├── types/
│   │   ├── result.ts             # ResultItem and FileResult
│   │   ├── file-picker.ts        # Native picker contracts
│   │   └── locales.ts            # Locale codes
│   ├── assets/svg/               # pl-icon SVG collection
│   └── tests/
│       ├── setup.ts              # Shared Nuxt i18n mock
│       ├── helpers/offscreen-mock.ts
│       ├── fixtures/             # Image and non-image fixtures
│       ├── components/
│       ├── composables/
│       ├── pages/
│       ├── layouts/
│       └── integration/
├── docs/IMAGE_OPTIMIZER.md        # Developer walkthrough and pipeline diagrams
├── i18n/locales/
│   ├── fr-FR.json
│   └── en-US.json
├── public/                       # Static logo, icons and robots input
├── AGENTS.md                     # Shared project guidance
├── CLAUDE.md                     # Claude entry point
├── README.md
├── nuxt.config.ts
├── vitest.config.mts
├── tsconfig.json
├── eslint.config.mjs
├── package.json
├── yarn.lock
├── .yarnrc.yml
├── .prettierrc
└── .editorconfig
```

| Concern             | Source                                                                                                               | Contract                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Application root    | [app.vue](app/app.vue)                                                                                               | Global metadata, canonical/alternate links and font links                 |
| Main page           | [index.vue](app/pages/index.vue)                                                                                     | Uploader and page-level metadata                                          |
| Shared shell        | [default.vue](app/layouts/default.vue)                                                                               | Header, main landmark, footer, global styles and viewport-height listener |
| Upload and results  | [ImageUploader.vue](app/components/ImageUploader.vue)                                                                | File batches, progress, result IDs, preview, download and ZIP export      |
| Image comparison    | [ImagePreviewModal.vue](app/components/ImagePreviewModal.vue)                                                        | Original/optimized previews, dimensions, zoom and object-URL cleanup      |
| Optimizer           | [useImageOptimizer.ts](app/composables/useImageOptimizer.ts)                                                         | Browser decode/encode and original-file fallback                          |
| Shared types        | [app/types](app/types/)                                                                                              | `ResultItem`, `FileResult`, file-picker contracts and locale codes        |
| Language control    | [LangSwitcher.vue](app/components/LangSwitcher.vue)                                                                  | Corresponding-route links, stored preference and document direction       |
| Sass tokens         | [variables.scss](app/styles/variables.scss)                                                                          | Colors, layers, dimensions and breakpoints injected through Vite          |
| Global base rules   | [default.scss](app/styles/default.scss), [nuxt.config.ts](nuxt.config.ts), [default layout](app/layouts/default.vue) | Nuxt loads base link rules once; the layout owns remaining global rules   |
| Site constants      | [site.ts](app/data/site.ts), [seo.ts](app/data/seo.ts)                                                               | Site name and robots directive values used by configuration               |
| Messages            | [fr-FR.json](i18n/locales/fr-FR.json), [en-US.json](i18n/locales/en-US.json)                                         | French source copy and natural English equivalents                        |
| Tests               | [app/tests](app/tests/), [vitest.config.mts](vitest.config.mts)                                                      | Nuxt runtime, Happy DOM, browser mocks, coverage and reports              |
| Modules and tooling | [nuxt.config.ts](nuxt.config.ts), [package.json](package.json), [eslint.config.mjs](eslint.config.mjs)               | Installed capabilities and actual commands                                |

The layout supplies `<main id="page-container">`; pages using it should not add a nested main.
Component registration uses `pathPrefix: false`, so avoid colliding component basenames.
Components and pages use `<template>`, `<script setup lang="ts">`, then scoped SCSS.
The default layout intentionally has unscoped SCSS for global and shell rules.
Nuxt's `css` option loads `default.scss` once for base link rules; do not repeat its import in layouts or components.
Vite injects `variables.scss`; component styles can use its tokens without repeating the import.
Follow the actual [TypeScript configuration](tsconfig.json), [.editorconfig](.editorconfig) and [.prettierrc](.prettierrc).

## Routes And Page Workflow

I18n uses `prefix`, so French and English home routes are `/fr` and `/en`.
The root `/` is configured for browser-language detection and is explicitly included in Nitro's prerender routes.
Verify generated and deployed redirect behavior when changing routing.

`nuxt.config.ts` resolves one origin for Site Config, I18n, existing root/page metadata consumers and schema identity.
Production and local production builds use build-time `NUXT_SITE_URL`, falling back to `https://pictolite.vercel.app`, without a trailing slash.
Development uses `http://localhost:3000`; Vercel previews use `https://${VERCEL_URL}`, falling back to the production origin if the hostname is absent.
Indexing is disabled in development and Vercel preview/development environments, including when `VERCEL_URL` is absent.
A production build without `VERCEL_ENV` allows indexing.
Scope `NUXT_SITE_URL` to Vercel Production; leave it unset in Preview, Development and local development `.env` files because Site Config reads it independently with higher priority than `site.url`.
Keep Vercel system variables enabled and do not override only I18n's origin at runtime.

Site name and robots directive values live in `app/data/site.ts` and `app/data/seo.ts`.
Nuxt Robots owns the SSR/HTTP indexing policy and merges `public/_robots.txt`, including its `Content-Usage: train-ai=n` preference.
Keep automatic localized sitemap discovery.
SEO v6 bundles AI Ready and Skew Protection; both are explicitly disabled here because the browser optimizer needs no AI content endpoints and Vercel builds do not share Skew Protection's local asset cache.
OG image generation remains disabled; the existing root and page metadata blocks remain the owners of social metadata.

| Area               | Route or owner                                           | Contract                                                                      |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Localized home     | `/fr`, `/en`; [index.vue](app/pages/index.vue)           | Same uploader workflow with translated labels and metadata                    |
| Language change    | [LangSwitcher.vue](app/components/LangSwitcher.vue)      | Corresponding-route links plus stored preference and document direction       |
| Global metadata    | [app.vue](app/app.vue), [nuxt.config.ts](nuxt.config.ts) | Canonical/alternate links, site identity, font links and module configuration |
| Main-page metadata | [index.vue](app/pages/index.vue)                         | Page head values that currently overlap root metadata                         |

For changes to the existing page or its shared components:

1. Read the affected owner, its consumers and matching scoped instructions.
   Preserve upload, preview and download contracts unless the task changes them.
2. Add or update user-facing messages in both locales.
   Keep translated derived values and metadata reactive.
3. Keep browser APIs in client execution paths and preserve lifecycle cleanup.
   Cover changed behavior with the existing test infrastructure.
4. Check both localized URLs and affected user journeys.
   Use generation checks when routes or static delivery change.

## Optimizer And Download Contracts

Read the [agent optimizer reference](.agents/docs/IMAGE_OPTIMIZER.md) before changing compression behavior or reviewing optimizer work.
Use the [developer walkthrough](docs/IMAGE_OPTIMIZER.md) for step-by-step pipeline, helper and metadata diagrams.

- Output must never be larger than the original.
  `chooseBest()` selects a candidate only when it is strictly smaller.
- `success: true` can contain the original file.
  Check actual blob size and MIME type rather than assuming reduction or conversion occurred.
- PNG without conversion returns the original when its size is at most 1,000,000 bytes.
  PNG-to-WebP conversion takes its separate path even below that threshold.
- The PNG progressive loop currently runs four attempts, with indices 0 through 3, followed by a possible forced encode.
  Keep this distinct from the JPEG/WebP quality search.
- Preserve browser download fallback and silent cancellation when the native picker throws `AbortError`.
- `ResultItem` requires a stable string `id`, the original blob and the returned blob.
  Preserve batch invalidation so an old async operation cannot repopulate cleared or replaced results.

The guide distinguishes observed behavior from known limitations and verification requirements.
Do not turn an implementation limitation into a required pattern.

## Internationalization

French (`fr`, `fr-FR`) is the default language; English uses `en`, `en-US`.
The `prefix` strategy produces `/fr` and `/en` routes.
Keep user-facing copy and accessible labels in the two locale files, using `snake_case` keys and the existing namespaces.
Use the [i18n skill](.agents/skills/i18n/SKILL.md) for paired edits, reactive consumers and locale-aware navigation.
Keep translated metadata reactive; read both the root and page head blocks when changing SEO.

## Mobile Experience Acceptance Criteria

Mobile usability is part of completion for affected UI changes.
The following are acceptance criteria, not a claim that every current interaction has passed a browser audit.

| Area               | Check for the affected journey                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Layout and text    | 320px, 375px, 768px and 1280px widths, a short landscape viewport, longer FR/EN labels and enlarged text  |
| Upload and results | Reachable file selection, clear conversion state, readable filenames/progress and wrapping result actions |
| Preview            | Both complete images, reachable close/zoom controls, Escape, keyboard focus and scroll cleanup            |
| Downloads          | Native picker where supported, browser fallback, silent cancellation and useful names                     |
| Shell and motion   | Safe-area clearance, visible focus and reduced-motion handling for changed animations or scrolling        |

Do not hide essential actions or mask the cause of overflow.
Record browser, viewport, locale, input method and actual result.
Report unavailable device or assistive-technology coverage.

## Reference Documentation

Read the relevant guide on demand and keep maintenance context with its owner.
The [.agents index](.agents/README.md) explains guidance ownership and evidence levels.

| Guide                                                        | Read for                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [Agent optimizer reference](.agents/docs/IMAGE_OPTIMIZER.md) | Actual branches, invariants, limitations and review criteria |
| [Developer optimizer walkthrough](docs/IMAGE_OPTIMIZER.md)   | Pipeline diagrams, helper behavior and image metadata        |

## Available Skills

Canonical skills live in `.agents/skills/<name>/SKILL.md`.
Use the skill relevant to the task and read linked references only when needed.

| Skill                | File                                                           | Use for                                                                 |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Nuxt and Vue         | [nuxt-vue-patterns](.agents/skills/nuxt-vue-patterns/SKILL.md) | Component contracts, TypeScript, SSR, styles and lifecycle              |
| Internationalization | [i18n](.agents/skills/i18n/SKILL.md)                           | FR/EN messages, interpolation, reactive copy and localized destinations |
| Testing              | [testing](.agents/skills/testing/SKILL.md)                     | Nuxt mounting, hoisted mocks, browser APIs and meaningful assertions    |

## Task Entry Points

| Task                              | Copilot prompt                                                           | Claude command                                                | Shared owner              |
| --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------- |
| Locale messages only              | [add-translations.prompt.md](.github/prompts/add-translations.prompt.md) | [add-translations.md](.claude/commands/add-translations.md)   | I18n skill                |
| Read-only optimizer source review | Request review using the optimizer reference                             | [optimizer-reviewer.md](.claude/agents/optimizer-reviewer.md) | Optimizer review criteria |

The [Claude entry point](CLAUDE.md#command-adapters) lists all command adapters.
Prompt and command files route to shared workflows.
Availability of the review agent does not require delegation or establish runtime coverage.

## Tool Integration And Scoped Instructions

| Agent          | Project entry point                                                            | Shared skill access                              | Scoped instructions                                                                 |
| -------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Codex          | This `AGENTS.md` and applicable ancestor/current-directory instruction files   | Native repository discovery in `.agents/skills/` | Select and read files from the applicability table below                            |
| GitHub Copilot | [copilot-instructions.md](.github/copilot-instructions.md) and shared guidance | Shared skill catalog                             | `description` and `applyTo` attachment where supported; read explicitly when needed |
| Claude Code    | [CLAUDE.md](CLAUDE.md), importing this file                                    | Command adapters read shared skills              | Read applicable scoped files manually                                               |

For Codex, keep durable project rules here and reusable workflows in the shared skill directory.
Codex's instruction discovery follows its applicable `AGENTS.md`/`AGENTS.override.md` chain; it does not make Copilot's `applyTo` metadata an automatic repository-wide rule.
Before editing application files, **all coding agents, including Codex, must read the applicable scoped files below**.
Use file patterns and task concerns to select them, including overlapping scopes.

| Instruction                                                       | File patterns                                                                                     | Use for                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [Nuxt and Vue](.github/instructions/vue-nuxt.instructions.md)     | `app/**/*.vue`, `app/**/*.ts`, `app/styles/**/*.scss`, `nuxt.config.ts`                           | Application structure, SSR, styles and shared contracts |
| [Internationalization](.github/instructions/i18n.instructions.md) | `i18n/**/*.json`                                                                                  | Paired locale messages and naming                       |
| [Testing](.github/instructions/testing.instructions.md)           | `app/tests/**/*.ts`, `vitest.config.mts`                                                          | Runtime tests, mocks and test configuration             |
| [Optimizer](.github/instructions/optimizer.instructions.md)       | `app/composables/useImageOptimizer.ts`, `app/components/ImageUploader.vue`, `app/types/result.ts` | Compression invariants and result/download behavior     |

Keep shared rules here, focused procedures in skills, file-specific requirements in scoped instructions and maintenance context in guides.
See [official Codex instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and [repository skill discovery](https://learn.chatgpt.com/docs/build-skills) for client behavior.
The [.agents index](.agents/README.md) is navigational, not a separate automatically loaded instruction file.

## Verification

| Change                                  | Relevant checks                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| Markdown only                           | Changed-file Prettier, frontmatter, local links/anchors, catalogs and source accuracy |
| Application implementation              | `yarn format:check`, `yarn typecheck`, `yarn lint` and affected FR/EN behavior        |
| Component or composable behavior        | Focused `yarn test --run <test-path>` and affected user journeys                      |
| Optimizer or downloads                  | Size/fallback/error tests, actual browser encode/decode and picker behavior           |
| SSR or Nuxt configuration               | Relevant production build and hydration checks                                        |
| Routes, prerendering or static delivery | `yarn generate` and affected output                                                   |
| Translated UI or interaction            | Both locales, narrow/desktop layouts, keyboard and affected preview/download states   |

Run type checking and lint sequentially in the same workspace: Nuxt regenerates the ESLint configuration imported by the lint command.
Check Markdown explicitly with the installed Prettier using `--prose-wrap preserve --end-of-line lf`.
Use UTF-8, LF, a final newline, aligned tables and one sentence per source line in prose.
Keep command and code examples valid for their stated language.
Preserve accented text and verify the written bytes; on Windows, use Unicode-safe file APIs or set PowerShell's `$OutputEncoding` explicitly before piping non-ASCII text.
Do not run broad autofixes or change unrelated source during documentation work.
Report checks actually performed and their limits; mocked Canvas tests do not prove image fidelity or real browser compatibility.
