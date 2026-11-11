---
description: 'Use when writing or reviewing PictoLite Vitest tests, browser mocks or test configuration.'
applyTo: 'app/tests/**/*.ts,vitest.config.mts'
---

# Testing Instructions

Use [testing](../../.agents/skills/testing/SKILL.md) for the workflow and executable mock examples.
Read [setup.ts](../../app/tests/setup.ts), the affected tests and [vitest.config.mts](../../vitest.config.mts) before changing shared infrastructure.

- Mount Nuxt components with `mountSuspended()`.
  Import test helpers explicitly; the setup file's own imports do not make them global.
- Mock Nuxt auto-imports with module-level `mockNuxtImport()`.
  Use `vi.hoisted()` for shared mock references and `vi.mock()` for external packages.
- Reset per-test mock state and reapply default implementations after `vi.resetAllMocks()`.
  Restore globals and unmount wrappers that own listeners, object URLs or body styles.
- Use the shared OffscreenCanvas helper for pipeline control flow, with its restore callback.
  Its simulated sizes do not establish actual image fidelity or browser encoder behavior.
- Test native save success, absent API, non-cancel failure fallback and `AbortError` without fallback.
  Include the required `id` and original blob in `ResultItem` factories.
- Await the affected async work before asserting observable outcomes.
  Use focused behavior tests instead of assertions that merely repeat the implementation.

Run `yarn test --run <test-path>` for a focused single run.
Coverage is enabled by the shared config, which also enables snapshot updates.
Review generated snapshots if a run creates or changes any.
Use [shared verification](../../AGENTS.md#verification) and report actual test coverage separately from browser checks.
