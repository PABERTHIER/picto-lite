# GitHub Copilot Repository Instructions

This project uses shared agent instructions defined in `AGENTS.md` at the repository root.
Copilot reads both this file and `AGENTS.md` automatically.

This file provides Copilot-specific behavioral guidance that complements `AGENTS.md`.

## Copilot-Specific Guidelines

### Code Generation

- Use `<script setup lang="ts">` for all Vue SFCs (never Options API or `<script>` without `setup`)
- Nuxt auto-imports are available — do NOT manually import `ref`, `computed`, `watch`,
  `useI18n`, `useHead`, `useSeoMeta`, `useRoute`, `useRuntimeConfig`, `useLocalePath`,
  `onMounted`, `onBeforeUnmount`, `defineOgImageComponent`
- `optimizeImage` from `app/composables/useImageOptimizer.ts` is **also auto-imported**
- DO manually import types: `import type { ResultItem } from '~/types/result'`
- All component styles must use `<style lang="scss" scoped>`
- Use SCSS variables from `app/styles/variables.scss` (auto-injected via Vite — no `@use` needed)
- Follow `.editorconfig`: 2-space indent, LF line endings, utf-8

### When Suggesting Code Changes

- Match existing patterns in the same file/project
- Preserve optimizer invariants: `chooseBest()` must never return a file larger than the original
- Always call `yarn lint` after making code changes — ESLint + Prettier must pass
- Use `computed(() => t('...'))` for all reactive i18n values in `useHead`/`useSeoMeta`
- All image paths in `public/` start with `/` (relative to project root)

### When Writing Tests

- Use `mountSuspended()` from `@nuxt/test-utils/runtime` for component mounting
- Use `mockNuxtImport()` for mocking Nuxt auto-imports (not `vi.mock()`)
- Use `vi.mock()` for third-party npm packages that are **not** Nuxt auto-imports (e.g., `jszip`)
- Use `installOffscreenCanvasMock()` from `app/tests/helpers/offscreen-mock.ts`
- Always flush async flows with `waitForPromises()` before asserting async state
- Always call `vi.resetAllMocks()` in `beforeEach`
- Test `showSaveFilePicker` both present (`global.showSaveFilePicker = vi.fn(...)`) and absent
- Test user cancellation: `showSaveFilePicker` rejects with `DOMException { name: 'AbortError' }` — the `<a download>` fallback must NOT fire
- `ResultItem` objects in test factories must include `id: string` — the field is required

## Git Policy

**Never run any git write command without explicit user instruction.**

Forbidden without a direct user request:
- `git commit`, `git push`, `git reset`, `git rebase`, `git merge`
- `git cherry-pick`, `git revert`, `git stash`, `git tag`
- `git branch -D`, `git am`

Allowed: `git status`, `git diff`, `git log`, `git show` (read-only inspection).

If asked to commit or push, **ask for confirmation first** and show what will be committed.
Never commit speculatively at the end of a task.

### Commit Messages

- Use conventional commit format
- Include a clear description of what changed and why

## Reference Files

- See `.github/instructions/` for file-type-specific rules that apply automatically
- See `.github/prompts/` for reusable prompt templates (invoke with `/` in Copilot Chat)
- See `.github/skills/` for detailed pattern references (invoke with `/skill-name`)
