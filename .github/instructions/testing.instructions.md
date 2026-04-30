---
applyTo: "app/tests/**/*.ts"
---

# Testing File Instructions

## Framework

Tests use **Vitest** + **@nuxt/test-utils**. Always import from the correct packages:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
```

---

## Component Tests

Always use `mountSuspended` for component mounting — it handles async setup and Nuxt context:

```typescript
const wrapper = await mountSuspended(MyComponent)
```

Never use `mount` or `shallowMount` from `@vue/test-utils` directly unless there is a specific
reason (e.g., no Nuxt context needed). Prefer `mountSuspended`.

---

## Mocking Nuxt Auto-imports

Use `mockNuxtImport` for mocking Nuxt composables and auto-imported functions.
**Never use `vi.mock()`** for functions that Nuxt auto-imports.

```typescript
// ✅ correct
mockNuxtImport('optimizeImage', () => {
  return async (_file: File, _convert: boolean) => ({
    file: new Blob([new Uint8Array(100)], { type: 'image/webp' }),
    success: true,
  })
})

// ❌ wrong for Nuxt auto-imports
vi.mock('~/composables/useImageOptimizer', ...)
```

`mockNuxtImport` is already available globally from `app/tests/setup.ts` which mocks `useI18n`.

Use `vi.mock()` for **third-party npm packages** that are not Nuxt auto-imports:

```typescript
// ✅ correct — jszip is a regular npm package, not a Nuxt auto-import
vi.mock('jszip', () => ({ default: vi.fn(() => ({ ... })) }))
```

---

## Flushing Async Flows

After triggering async component operations (file uploads, optimization, downloads), flush the
event queue before asserting:

```typescript
const waitForPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

// Trigger async operation
await wrapper.find('.drop-zone').trigger('drop', ...)
// Flush microtasks and macrotasks
await waitForPromises()
// Now assert
expect(wrapper.findAll('.results-list-item').length).toBe(2)
```

---

## Mocking Browser-Only APIs

### OffscreenCanvas + createImageBitmap

Use `installOffscreenCanvasMock` from `app/tests/helpers/offscreen-mock.ts`:

```typescript
import { installOffscreenCanvasMock } from '@/tests/helpers/offscreen-mock'

describe('...', () => {
  let restore: () => void

  beforeEach(() => {
    const mock = installOffscreenCanvasMock(5_000_000) // initial input size
    restore = mock.restore
  })

  afterEach(() => restore())
})
```

### showSaveFilePicker (File System Access API)

Test both presence and absence of the API, and the AbortError cancel case:

```typescript
type GlobalWithPicker = typeof globalThis & {
  showSaveFilePicker?: ShowSaveFilePicker
}
const g = global as GlobalWithPicker

// Simulate API available
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

// Simulate API unavailable (default in test environment)
delete g.showSaveFilePicker
```

---

## Test Structure

```typescript
describe('{ComponentName} component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // reset browser API state
  })

  it('renders correctly', async () => { ... })
  it('has correct initial state', async () => { ... })
  // group related behaviors in nested describe blocks if needed
})
```

- One test file per unit: `{componentName}.test.ts`, `{composableName}.test.ts`
- `beforeEach` always calls `vi.resetAllMocks()`
- Keep test descriptions concrete: "shows progress bar when files are processing"
  (not "works correctly")
- Test factory helpers that build `ResultItem` objects must include `id: string` — it is a
  required field (`ResultItem.id` is not optional)
