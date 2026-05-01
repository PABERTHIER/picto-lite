---
name: testing
description: >
  Vitest + @nuxt/test-utils patterns for PictoLite: mountSuspended, mockNuxtImport,
  browser API mocking (OffscreenCanvas, showSaveFilePicker), and async flow flushing.
  Use when writing or reviewing tests.
disable-model-invocation: true
argument-hint: "<component or composable to test>"
---

You are writing or reviewing tests for: $ARGUMENTS

Tests use **Vitest** + **@nuxt/test-utils**. Read `app/tests/setup.ts` and
`app/tests/helpers/offscreen-mock.ts` for shared infrastructure before writing new tests.

---

## Imports

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import MyComponent from '@/components/MyComponent.vue'
```

---

## Component Mounting

Always use `mountSuspended` — it handles Nuxt context and async setup:

```typescript
const wrapper = await mountSuspended(MyComponent)
expect(wrapper.exists()).toBe(true)
```

---

## Mocking Nuxt Auto-Imports

Use `mockNuxtImport` at **module level** (outside `describe`). Never use `vi.mock()` for Nuxt auto-imports.

```typescript
// ✅ correct — module level, called once
mockNuxtImport('optimizeImage', () => {
  return async (_file: File, _convert: boolean) => ({
    file: new Blob([new Uint8Array(500)], { type: 'image/webp' }),
    success: true,
  })
})

// ❌ wrong — inside describe or beforeEach
```

For dynamic behavior per test, use a `vi.fn()` reference:

```typescript
const mockOptimizeImage = vi.fn()
mockNuxtImport('optimizeImage', () => mockOptimizeImage)

beforeEach(() => {
  mockOptimizeImage.mockResolvedValue({
    file: new Blob([new Uint8Array(1_500)], { type: 'image/webp' }),
    success: true,
  })
})
```

Use `vi.mock()` for **third-party npm packages** (not Nuxt auto-imports):

```typescript
// ✅ correct — jszip is a regular npm package
vi.mock('jszip', () => ({ default: vi.fn(() => ({ ... })) }))
```

---

## Flushing Async Flows

After triggering async operations (file upload, optimization, download), flush the queue:

```typescript
const waitForPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

await wrapper.find('.drop-zone').trigger('drop', { dataTransfer: { files: [...] } })
await waitForPromises()
expect(wrapper.findAll('.results-list-item')).toHaveLength(1)
```

---

## OffscreenCanvas + createImageBitmap Mock

Use `installOffscreenCanvasMock` from `app/tests/helpers/offscreen-mock.ts`:

```typescript
import { installOffscreenCanvasMock } from '@/tests/helpers/offscreen-mock'

describe('useImageOptimizer', () => {
  let restore: () => void
  let setLastInputFileSize: (size: number) => void

  beforeEach(() => {
    const mock = installOffscreenCanvasMock(5_000_000)
    restore = mock.restore
    setLastInputFileSize = mock.setLastInputFileSize
    vi.resetAllMocks()
  })

  afterEach(() => restore())
})
```

The mock simulates `convertToBlob` sizes based on canvas dimensions, MIME type, and quality.
Use `setLastInputFileSize` to control the simulated input file size per test.

---

## showSaveFilePicker Mock

Test both presence and absence of the File System Access API, and the user-cancel (AbortError) case:

```typescript
type GlobalWithPicker = typeof globalThis & {
  showSaveFilePicker?: ShowSaveFilePicker
}
const g = global as GlobalWithPicker

// Before test: simulate API present
g.showSaveFilePicker = vi.fn().mockResolvedValue({
  createWritable: vi.fn().mockResolvedValue({
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }),
})

// Simulate user cancellation — must NOT trigger <a download> fallback
g.showSaveFilePicker = vi.fn().mockRejectedValue(
  Object.assign(new DOMException('User cancelled'), { name: 'AbortError' })
)

// In beforeEach: ensure API is absent by default
delete g.showSaveFilePicker
```

---

## Simulating File Drop and Input Change

```typescript
// Drop event
const file = new File([new Uint8Array(5_000_000)], 'photo.jpg', { type: 'image/jpeg' })
await wrapper.find('.drop-zone').trigger('drop', {
  dataTransfer: { files: [file] },
})

// File input change
const input = wrapper.find('input[type="file"]')
Object.defineProperty(input.element, 'files', {
  value: [new File([new Uint8Array(1_000)], 'photo.png', { type: 'image/png' })],
  configurable: true,
})
await input.trigger('change')
```

---

## Test Structure

```typescript
describe('{Name} component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // reset global browser API state
  })

  it('renders correctly', async () => { ... })
  it('shows progress bar when processing files', async () => { ... })
  it('displays results after processing', async () => { ... })
})
```

- `beforeEach` always calls `vi.resetAllMocks()`
- Describe names: `"{Name} component"` or `"{composableName}"`
- Test descriptions: concrete behavior, not "works correctly"
- One file per unit: `{componentName}.test.ts`, `{composableName}.test.ts`
