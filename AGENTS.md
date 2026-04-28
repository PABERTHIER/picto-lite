# AGENTS.md

This file provides shared guidance for AI coding agents (Claude Code, GitHub Copilot, and others)
when working with code in this repository.

---

## Project Overview

**PictoLite** is a browser-based image optimizer and compressor. Users drop or select image files
(JPG, JPEG, PNG, WebP), optionally convert them to WebP, and download the optimized versions.
Built with **Nuxt 4** (Vue 3 + TypeScript), deployed on **Vercel** as a statically pre-rendered site.

The primary development workflows are:

1. **Enhancing the image optimizer** — adjusting compression logic, adding format support, tuning parameters
2. **Adding or updating components** — UI changes to the uploader, results list, layout, header, footer
3. **Adding i18n translations** — adding keys to both locale files
4. **Writing tests** — unit and integration tests for composables and components

---

## Repository Layout

```
picto-lite/
├── app/
│   ├── pages/
│   │   └── index.vue              # Main page (SEO meta + ImageUploader)
│   ├── components/
│   │   ├── ImageUploader.vue      # Core UI: drag-drop, progress, results, download
│   │   ├── Header.vue
│   │   ├── Footer.vue
│   │   ├── LangSwitcher.vue
│   │   └── OgImage/               # OG image components
│   ├── composables/
│   │   └── useImageOptimizer.ts   # Image compression logic (OffscreenCanvas-based)
│   ├── layouts/
│   │   └── default.vue            # Header + main + footer layout with safe-area handling
│   ├── app.vue                    # Root: global SEO, hreflang, OG tags, locale alternates
│   ├── styles/
│   │   ├── variables.scss         # SCSS variables (auto-injected via Vite)
│   │   └── default.scss           # Global base styles
│   ├── types/
│   │   ├── result.ts              # ResultItem, FileResult
│   │   ├── file-picker.ts         # ShowSaveFilePicker, FilePickerOptions
│   │   └── locales.ts             # localesType
│   ├── assets/svg/                # SVG icon sources (pl-icon collection)
│   ├── tests/
│   │   ├── setup.ts               # Vitest global setup (useI18n mock)
│   │   ├── helpers/
│   │   │   └── offscreen-mock.ts  # OffscreenCanvas + createImageBitmap mock
│   │   ├── components/            # Component tests: {ComponentName}.test.ts
│   │   ├── composables/           # Composable tests: {composableName}.test.ts
│   │   ├── pages/                 # Page-level tests
│   │   ├── layouts/               # Layout tests
│   │   └── integration/           # Cross-component integration tests
│   ├── coverage/                  # Generated coverage reports (gitignored)
│   └── tests_output/              # Test reporter output (gitignored)
├── i18n/locales/
│   ├── fr-FR.json                 # French (default locale)
│   └── en-US.json                 # English
├── public/                        # Static assets (favicon, logo, apple-icon)
├── nuxt.config.ts
├── vitest.config.mts
├── package.json
├── eslint.config.mjs
└── .editorconfig
```

---

## Tech Stack

| Purpose            | Technology                          |
|--------------------|-------------------------------------|
| Framework          | Nuxt 4 (Vue 3 + TypeScript)        |
| Styling            | SCSS with global variables          |
| i18n               | @nuxtjs/i18n (prefix strategy)     |
| SEO                | @nuxtjs/seo (OG, Twitter, Schema)  |
| UI components      | @nuxt/ui                            |
| Fonts              | @nuxt/fonts (Google Fonts)          |
| Testing            | Vitest + @nuxt/test-utils           |
| Linting            | ESLint + Prettier                   |
| Package manager    | Yarn 4.13.0                         |
| Deployment         | Vercel (static pre-rendering)       |

---

## Git Policy — AI Agents Must Never Commit or Push

**AI agents (Claude Code, GitHub Copilot, and any other tool) are strictly forbidden from running
any destructive or history-altering git commands without explicit user instruction.**

### Permanently forbidden without explicit user request

- `git commit` — never commit on behalf of the user
- `git push` — never push to any remote
- `git reset` — never alter HEAD or the index
- `git rebase` — never rebase branches
- `git merge` — never merge branches
- `git cherry-pick` — never cherry-pick commits
- `git revert` — never create revert commits
- `git stash` — never stash changes
- `git tag` — never create or delete tags
- `git branch -D` — never delete branches
- `git am` — never apply patches

### Allowed read-only git operations

- `git status`, `git diff`, `git log`, `git show` — inspection only

### Rule

If the user says "commit the changes" or "push", **ask for confirmation first** and show exactly
what will be committed/pushed before running the command. Never commit speculatively at the end
of a task.

---

## Build and Dev Commands

```bash
# Install dependencies
yarn install

# Start dev server
yarn dev

# Build for production
yarn build

# Generate static site
yarn generate

# Preview production build
yarn preview

# Lint
yarn lint

# Lint and auto-fix
yarn lint:fix

# Run tests (single run)
yarn test

# Run tests with Vitest UI
yarn test:ui

# Run tests in watch mode
yarn test:watch

# Run tests with coverage report
yarn test:coverage
```

---

## Code Style

- **Indent**: 2 spaces
- **End of line**: LF
- **Charset**: utf-8
- **Vue SFC order**: `<template>`, `<script setup lang="ts">`, `<style lang="scss" scoped>`
- **Prefer Composition API** with `<script setup>`
- **Use Nuxt auto-imports** — `ref()`, `computed()`, `watch()`, `useI18n()`, `useHead()`,
  `useSeoMeta()`, `useRoute()`, `useRuntimeConfig()`, `optimizeImage()` are auto-imported
- **Import types explicitly**: `import type { ResultItem } from '~/types/result'`
- **SCSS scoped styles**: all component styles use `<style lang="scss" scoped>`
- **No inline comments** unless the logic is genuinely non-obvious
- Run `yarn lint` before committing

---

## Internationalization (i18n)

**Default locale**: French (`fr`)
**Strategy**: Prefix-based (`/fr/path` and `/en/path`)
**Base URL**: `https://pictolite.vercel.app`

### Translation Key Structure

Translation files are in `i18n/locales/fr-FR.json` and `i18n/locales/en-US.json`.

```
app.*                        — app name, meta description
about.*                      — author info
links.*                      — external link labels
components.*                 — component-level labels and copy
  components.footer.*
  components.image_uploader.*
  components.lang_switcher.*
pages.*                      — page-specific metadata
  pages.main.*
```

### Non-Negotiable Two-File Rule

**Every change to `fr-FR.json` must have a matching change in `en-US.json` — and vice versa.**
Never add a key to one locale file without adding it to the other in the same edit.

### Key naming

All JSON keys use `snake_case`. Never use camelCase, kebab-case, or spaces.

---

## Image Optimizer Architecture

The core logic lives in `app/composables/useImageOptimizer.ts`. Understand these invariants before
modifying:

### Entry point: `optimizeImage(file, shouldConvertToWebp)`

Returns `FileResult`: `{ file: Blob, success: boolean }`.

**Critical invariants:**

- `success: true` does **not** guarantee a smaller file — `chooseBest()` always returns the
  original file if compression produces a larger result. Never assume the output blob is smaller.
- PNG files ≤ `PNG_PASSTHROUGH_THRESHOLD` (1 MB) are **intentionally returned unchanged** — they
  are already well-compressed and Canvas-based recompression rarely improves them while degrading
  text and sharp edges.
- PNG files use a **separate pipeline** (`optimizePngImage`) with conservative, text-safe parameters:
  up to 3 progressive downscale attempts (×`DOWNSCALE_STEP_FACTOR = 0.85` per step) followed by
  a final forced encode at quality 0.35 with `createImageBitmap` verify-decode. `chooseBest()`
  ensures output is never larger than the original.
- PNG → WebP conversion uses its own dedicated path (`convertPngToWebp`) — a single
  `convertToBlob({ type: 'image/webp', quality: QUALITY_UPPER_BOUND })` call with verify-decode.

### Compression pipeline for lossy formats (JPEG, WebP)

1. Compute `targetSize` from `computeTargetSize()` using tiered ratios based on input size:
   - ≤ 200 KB → return as-is
   - ≤ 1 MB → target 90%
   - ≤ 5 MB → target 60%
   - ≤ 10 MB → target 25% (floor: 1 MB)
   - ≤ 30 MB → target 15% (floor: 1.5 MB)
   - > 30 MB → target 12% (floor: 2 MB)
2. Binary search over `[QUALITY_LOWER_BOUND=0.3, QUALITY_UPPER_BOUND=0.92]` for `BINARY_SEARCH_ITERATIONS=6` steps
3. `chooseBest()` returns whichever of candidate/original is smaller

### PNG compression pipeline

1. Return as-is if file ≤ `PNG_PASSTHROUGH_THRESHOLD` (1 MB)
2. Decode bitmap once (`createImageBitmap`)
3. Progressive loop: up to 3 attempts, scaling down by `DOWNSCALE_STEP_FACTOR = 0.85` each time,
   binary-searching quality in `[localQualityLower=0.5, QUALITY_UPPER_BOUND=0.92]`
4. Final forced encode at quality 0.35 verified with `createImageBitmap`
5. `chooseBest` ensures we never return a blob larger than the original

### Browser APIs used (browser-only — must be mocked in tests)

- **`OffscreenCanvas`** — off-thread image rendering and compression
- **`createImageBitmap`** — decode input images and verify output blobs
- **`showSaveFilePicker`** (File System Access API) — native save dialog with fallback to `<a download>`

---

## Testing Conventions

Tests live in `app/tests/` and use **Vitest** + **@nuxt/test-utils**.

### Key patterns

| Pattern | How |
|---|---|
| Mount a component | `await mountSuspended(MyComponent)` from `@nuxt/test-utils/runtime` |
| Mock a Nuxt auto-import | `mockNuxtImport('composableName', () => mockImpl)` — not `vi.mock()` |
| Flush async flows | `await waitForPromises()` = `new Promise(resolve => setTimeout(resolve, 0))` |
| Mock OffscreenCanvas | `installOffscreenCanvasMock()` from `app/tests/helpers/offscreen-mock.ts` |
| Mock showSaveFilePicker | Set `global.showSaveFilePicker = vi.fn(...)` — test both present and absent |

### Global setup

`app/tests/setup.ts` mocks `useI18n` globally:

```typescript
mockNuxtImport('useI18n', () => () => useNuxtApp().$i18n)
```

### Test file structure

- `describe('{ComponentName} component', () => { ... })` for component tests
- `describe('{composableName}', () => { ... })` for composable tests
- `beforeEach(() => { vi.resetAllMocks() })` at the top of each describe block
- One test file per component/composable: `{name}.test.ts`

---

## Available Skills

Invoke with `/skill-name [arguments]` in both Copilot Chat and Claude Code.

| Skill | When to use |
|---|---|
| `/nuxt-vue-patterns` | Vue 3 / Nuxt 4 conventions: Composition API, auto-imports, SCSS, components |
| `/i18n` | Managing translations: key structure, two-locale rule, quality |
| `/testing` | Vitest + @nuxt/test-utils patterns: mountSuspended, mocking, async flows |

Skills are defined in two locations:

- **Copilot**: `.github/skills/{name}/SKILL.md`
- **Claude Code**: `.claude/skills/{name}/SKILL.md`

---

## Available Prompt (Copilot Chat) / Command (Claude Code)

| Name | Copilot (`/`) | Claude Code (`/`) | When to use |
|---|---|---|---|
| `add-translations` | ✅ (prompt) | ✅ (command) | Add i18n entries to both locale files |

---

## Available Agent (Claude Code only)

| Agent | When to use |
|---|---|
| `optimizer-reviewer` | Review image optimizer changes for correctness, invariants, and test coverage |

---

## Available Instructions (auto-applied by Copilot)

| File | Applies to |
|---|---|
| `vue-nuxt.instructions.md` | `app/**/*.vue` — Composition API, auto-imports, SCSS |
| `i18n.instructions.md` | `i18n/**/*.json` — key structure, two-locale rule, quality |
| `testing.instructions.md` | `app/tests/**/*.ts` — test patterns, mocking, async flows |
| `optimizer.instructions.md` | `app/composables/**/*.ts` — optimizer invariants, browser APIs |
