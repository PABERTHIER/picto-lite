---
name: testing
description: Write or review PictoLite Vitest and Nuxt runtime tests, including hoisted auto-import mocks, browser API simulation, async uploads, previews and downloads.
---

# PictoLite Testing

Follow [AGENTS.md](../../../AGENTS.md) for shared constraints.
Read [vitest.config.mts](../../../vitest.config.mts), [setup.ts](../../../app/tests/setup.ts), the affected implementation and nearby tests before choosing fixtures or mocks.
Add tests for changed behavior and meaningful invariants rather than routine documentation edits.

## Runtime And Commands

| Concern          | Current configuration                                          |
| ---------------- | -------------------------------------------------------------- |
| Test environment | `nuxt` with Happy DOM                                          |
| Setup            | Global `useI18n` mock returning `useNuxtApp().$i18n`           |
| Coverage         | Enabled with the V8 provider; output under `app/coverage/`     |
| Reporters        | JSON, HTML, JUnit and verbose; files under `app/tests_output/` |
| Snapshot updates | `update: true`; inspect snapshot changes if a run produces any |
| Single run       | `yarn test --run` or `yarn test --run <test-path>`             |
| Coverage run     | `yarn test:coverage`                                           |
| Interactive runs | `yarn test`, `yarn test:watch`, `yarn test:ui`                 |

Tests live in `app/tests/`, grouped by components, composables, pages, layouts and integration.
Use behavior-focused descriptions, following nearby describe/file naming.
Import test helpers and components explicitly; the setup file's imports do not become globals.
Vitest globals are separately enabled in the configuration.

## Mounting And Hoisted Mocks

Use `mountSuspended()` for components needing Nuxt context and async setup.
Use module-level `mockNuxtImport()` for Nuxt auto-imports.
Its factory is hoisted, so shared references should use `vi.hoisted()`.

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ImageUploader from '~/components/ImageUploader.vue'

const mockOptimizeImage = vi.hoisted(() => vi.fn())

mockNuxtImport('optimizeImage', () => mockOptimizeImage)

describe('ImageUploader component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockOptimizeImage.mockResolvedValue({
      file: new Blob([new Uint8Array(500)], { type: 'image/webp' }),
      success: true,
    })
  })

  it('starts with no results', async () => {
    const wrapper = await mountSuspended(ImageUploader)

    expect(wrapper.findAll('.results-list-item')).toHaveLength(0)
    wrapper.unmount()
  })
})
```

Register a Nuxt-import mock once per identifier in a test module and change its behavior per test.
Use `vi.mock()` for third-party packages such as `jszip`.
Direct optimizer imports in its own tests are valid; they exercise the function rather than mocking a Nuxt auto-import.

Reset per-test mock state in `beforeEach` and reapply implementations after `vi.resetAllMocks()`.
Restore replaced globals and unmount wrappers that own listeners, storage-sensitive state, body styles or object URLs.
Use `afterAll` only for intentionally suite-scoped fixtures with no per-test state leakage.

## Await Observable Work

Await Vue events and the async work they initiate before asserting results.
Nearby uploader tests use the following helper for work queued through the event loop:

```ts
const waitForPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))
```

A single event-loop turn is not a universal completion guarantee.
For overlapping uploads or controlled failures, use deferred promises or bounded async assertions tied to the expected outcome.
Test that a cleared or replaced batch cannot append stale results.

Create file inputs with `Object.defineProperty(input.element, 'files', { value: [file], configurable: true })`.
Trigger drop with `{ dataTransfer: { files: [file] } }`.
Use real filenames and MIME values relevant to the branch.

## Canvas And Bitmap Simulation

Use [offscreen-mock.ts](../../../app/tests/helpers/offscreen-mock.ts) for shared control-flow tests.

```ts
import { afterEach, beforeEach, describe, vi } from 'vitest'
import { installOffscreenCanvasMock } from '~/tests/helpers/offscreen-mock'

describe('useImageOptimizer', () => {
  let canvasMock: ReturnType<typeof installOffscreenCanvasMock>

  beforeEach(() => {
    vi.resetAllMocks()
    canvasMock = installOffscreenCanvasMock(5_000_000)
  })

  afterEach(() => {
    canvasMock.restore()
  })
})
```

Use `setLastInputFileSize()` when changing simulated input size.
For failure branches, provide a scoped mock for rejected decode/encode calls, missing contexts or verification failures.
Restore both `OffscreenCanvas` and `createImageBitmap` after the test scope.

The helper simulates size using MIME type, dimensions and quality; it does not run a real encoder.
Its PNG quality response differs from browser PNG encoding.
Fixture integration tests using this helper still establish control flow, not real image validity or visual quality.
Use the [optimizer guide](../../docs/IMAGE_OPTIMIZER.md) for size, threshold and pipeline expectations.

## Save Picker, Downloads And Preview

| Branch                           | Expected assertion                                                         |
| -------------------------------- | -------------------------------------------------------------------------- |
| Picker succeeds                  | Suggested filename/MIME, writable write and close; no anchor fallback      |
| Picker unavailable               | Anchor download with a created and revoked object URL                      |
| Picker throws a non-cancel error | Browser download fallback                                                  |
| Picker throws `AbortError`       | No anchor fallback                                                         |
| Bulk download                    | Successful results passed to JSZip with their bytes and filenames          |
| Preview mount/unmount            | Both source URLs created/revoked and key listener/body styles cleaned up   |
| Preview zoom                     | Affected image sizing and scroll positioning after Vue's post-flush update |

Use `new DOMException('User cancelled', 'AbortError')` for cancellation.
The component reads `window.showSaveFilePicker`; stub that property, or the shared global only when it aliases the same window.
Import `ShowSaveFilePicker` explicitly when typing a global extension.
Restore the previous property descriptor or remove the stub after the test.

Factories for `ResultItem` must include `id: string`, `name`, `blob`, `originalBlob`, both sizes and `success`.
Include unchanged successful results and failures when testing download filtering.
Do not assume the conversion option guarantees a WebP blob; assert returned MIME and names separately when that behavior is in scope.

## Verification

Run focused tests once, then broaden only when shared behavior or a failure justifies it.
Use [shared verification](../../../AGENTS.md#verification) for lint, build and browser checks.
Report actual runs, failures and limitations.
Real encoding/decoding, PNG text readability, native picker integration and browser focus behavior need browser validation beyond Happy DOM.
