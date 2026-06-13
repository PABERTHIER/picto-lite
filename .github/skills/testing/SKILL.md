---
name: testing
description: "Vitest + @nuxt/test-utils patterns for PictoLite: component testing, Nuxt auto-import mocking, browser API mocking, and async flow handling. Use this skill when writing or modifying tests."
---

# Testing Skill

Tests use **Vitest** + **@nuxt/test-utils**. This skill documents the patterns used across
`app/tests/`.

---

## Setup

`app/tests/setup.ts` mocks `useI18n` globally — this runs before every test file:

```typescript
mockNuxtImport('useI18n', () => () => useNuxtApp().$i18n)
```

`vitest.config.mts` configures:
- `environment: 'nuxt'` with `domEnvironment: 'happy-dom'`
- Coverage via `v8` provider, output to `app/coverage/`
- Test reports to `app/tests_output/`

---

## Component Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import MyComponent from '@/components/MyComponent.vue'

describe('MyComponent component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders correctly', async () => {
    const wrapper = await mountSuspended(MyComponent)
    expect(wrapper.exists()).toBe(true)
  })
})
```

Always use `mountSuspended` — it handles Nuxt context and async setup automatically.

---

## Mocking Nuxt Auto-Imports

Use `mockNuxtImport` at the **module level** (outside `describe`), not inside `beforeEach`:

```typescript
// ✅ correct — module level
mockNuxtImport('optimizeImage', () => {
  return async (_file: File, _convert: boolean) => ({
    file: new Blob([new Uint8Array(500)], { type: 'image/webp' }),
    success: true,
  })
})

// ❌ wrong — inside describe/beforeEach
beforeEach(() => {
  mockNuxtImport('optimizeImage', ...) // does not work here
})
```

For dynamic mock behavior per test, use `vi.fn()` and reassign:

```typescript
const mockOptimizeImage = vi.fn()
mockNuxtImport('optimizeImage', () => mockOptimizeImage)

beforeEach(() => {
  mockOptimizeImage.mockResolvedValue({
    file: new Blob([...], { type: 'image/jpeg' }),
    success: true,
  })
})
```

Use `vi.mock()` for **third-party npm packages** (not Nuxt auto-imports):

```typescript
// ✅ correct — jszip is a regular npm package, not a Nuxt auto-import
vi.mock('jszip', () => ({ default: vi.fn(() => ({ ... })) }))
```

---

## Flushing Async Flows

After triggering async operations (file drop, optimization, download), flush the event queue:

```typescript
const waitForPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

// Trigger
await wrapper.trigger('drop', { dataTransfer: { files: [...] } })
// Flush
await waitForPromises()
// Assert
expect(wrapper.findAll('.results-list-item')).toHaveLength(1)
```

---

## OffscreenCanvas + createImageBitmap Mock

Use `installOffscreenCanvasMock` from `app/tests/helpers/offscreen-mock.ts`.
This mock simulates `convertToBlob` sizes based on canvas area, MIME type, and quality.

```typescript
import { installOffscreenCanvasMock } from '@/tests/helpers/offscreen-mock'

describe('useImageOptimizer', () => {
  let restore: () => void
  let setLastInputFileSize: (size: number) => void

  beforeEach(() => {
    const mock = installOffscreenCanvasMock(5_000_000)
    restore = mock.restore
    setLastInputFileSize = mock.setLastInputFileSize
  })

  afterEach(() => restore())

  it('compresses a large JPEG', async () => {
    setLastInputFileSize(5_000_000)
    const file = new File([new Uint8Array(5_000_000)], 'test.jpg', {
      type: 'image/jpeg',
    })
    const result = await optimizeImage(file, false)
    expect(result.success).toBe(true)
    expect(result.file.size).toBeLessThanOrEqual(file.size)
  })
})
```

---

## showSaveFilePicker Mock

The `ImageUploader` uses the File System Access API when available. Test all three branches:

```typescript
type GlobalWithPicker = typeof globalThis & {
  showSaveFilePicker?: ShowSaveFilePicker
}
const g = global as GlobalWithPicker

// Branch: API available
g.showSaveFilePicker = vi.fn().mockResolvedValue({
  createWritable: vi.fn().mockResolvedValue({
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }),
})

// Branch: user cancels picker — must NOT trigger <a download> fallback
g.showSaveFilePicker = vi.fn().mockRejectedValue(
  Object.assign(new DOMException('User cancelled'), { name: 'AbortError' })
)

// Branch: API not available (restore to default)
delete g.showSaveFilePicker
```

---

## Simulating File Drop and Input

```typescript
// Drop
const dataTransfer = {
  files: [new File([new Uint8Array(1000)], 'photo.png', { type: 'image/png' })],
}
await wrapper.find('.drop-zone').trigger('drop', { dataTransfer })

// File input change
const input = wrapper.find('input[type="file"]')
Object.defineProperty(input.element, 'files', {
  value: [new File([new Uint8Array(1000)], 'photo.jpg', { type: 'image/jpeg' })],
})
await input.trigger('change')
```

---

## Coverage

Coverage is enabled by default in `vitest.config.mts`. Includes:
- `**/components/**`
- `**/composables/**`
- `**/layouts/**`
- `**/pages/**`
- `**/app.vue`

Run `yarn test:coverage` to generate reports in `app/coverage/`.
