<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <span class="modal-title">{{ item.name }}</span>
          <button class="close-button" @click="emit('close')">
            {{ t('components.image_preview_modal.close_label') }}
          </button>
        </div>
        <div class="modal-body">
          <div class="preview-panel">
            <div class="panel-header">
              <span class="panel-label">
                {{ t('components.image_preview_modal.original_label') }}
              </span>
              <span v-if="originalDimensions" class="panel-dims">
                {{ formatDimensions(originalDimensions) }}
              </span>
              <span class="panel-size">
                {{ formatSize(item.originalSize) }}
              </span>
            </div>
            <div
              ref="originalContainerRef"
              class="image-container"
              :class="{ zoomed: originalZoomed }">
              <img
                ref="originalImgRef"
                :src="originalUrl"
                :alt="t('components.image_preview_modal.original_label')"
                :style="{ cursor: originalCursor }"
                draggable="false"
                @load="onImageLoad('original')"
                @click="onImageClick('original', $event)" />
            </div>
            <button
              v-if="originalCanZoom"
              class="zoom-button"
              @click="toggleZoom('original')">
              {{
                originalZoomed
                  ? t('components.image_preview_modal.zoom_out_label')
                  : t('components.image_preview_modal.zoom_in_label')
              }}
            </button>
          </div>
          <div class="preview-panel">
            <div class="panel-header">
              <span class="panel-label">
                {{ t('components.image_preview_modal.optimized_label') }}
              </span>
              <span v-if="optimizedDimensions" class="panel-dims">
                {{ formatDimensions(optimizedDimensions) }}
              </span>
              <span class="panel-size">
                {{ formatSize(item.optimizedSize) }}
              </span>
            </div>
            <div
              ref="optimizedContainerRef"
              class="image-container"
              :class="{ zoomed: optimizedZoomed }">
              <img
                ref="optimizedImgRef"
                :src="optimizedUrl"
                :alt="t('components.image_preview_modal.optimized_label')"
                :style="{ cursor: optimizedCursor }"
                draggable="false"
                @load="onImageLoad('optimized')"
                @click="onImageClick('optimized', $event)" />
            </div>
            <button
              v-if="optimizedCanZoom"
              class="zoom-button"
              @click="toggleZoom('optimized')">
              {{
                optimizedZoomed
                  ? t('components.image_preview_modal.zoom_out_label')
                  : t('components.image_preview_modal.zoom_in_label')
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ResultItem } from '~/types/result'

type PanelId = 'original' | 'optimized'

const props = defineProps<{
  item: ResultItem
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const originalZoomed = ref(false)
const optimizedZoomed = ref(false)

const originalCanZoom = ref(true)
const optimizedCanZoom = ref(true)

const originalDimensions = ref<{ width: number; height: number } | null>(null)
const optimizedDimensions = ref<{ width: number; height: number } | null>(null)

const originalUrl = ref('')
const optimizedUrl = ref('')

const originalContainerRef = ref<HTMLElement>()
const optimizedContainerRef = ref<HTMLElement>()
const originalImgRef = ref<HTMLImageElement>()
const optimizedImgRef = ref<HTMLImageElement>()

const panelState = {
  original: {
    zoomed: originalZoomed,
    containerRef: originalContainerRef,
    imgRef: originalImgRef,
    canZoom: originalCanZoom,
    dims: originalDimensions,
  },
  optimized: {
    zoomed: optimizedZoomed,
    containerRef: optimizedContainerRef,
    imgRef: optimizedImgRef,
    canZoom: optimizedCanZoom,
    dims: optimizedDimensions,
  },
}

const originalCursor = computed(() =>
  originalZoomed.value
    ? 'zoom-out'
    : originalCanZoom.value
      ? 'zoom-in'
      : 'default'
)
const optimizedCursor = computed(() =>
  optimizedZoomed.value
    ? 'zoom-out'
    : optimizedCanZoom.value
      ? 'zoom-in'
      : 'default'
)

const pendingClicks: Record<PanelId, { relX: number; relY: number } | null> = {
  original: null,
  optimized: null,
}

function formatSize(bytes: number): string {
  return bytes > 1024 * 1024
    ? (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    : (bytes / 1024).toFixed(1) + ' KB'
}

function formatDimensions(dims: { width: number; height: number }): string {
  return `${dims.width} × ${dims.height}`
}

function imageNeedsZoom(img: HTMLImageElement): boolean {
  return img.naturalWidth > 0 && img.offsetWidth < img.naturalWidth
}

function onImageLoad(panel: PanelId): void {
  const { imgRef, canZoom, dims } = panelState[panel]
  const img = imgRef.value!

  canZoom.value = imageNeedsZoom(img)
  dims.value = { width: img.naturalWidth, height: img.naturalHeight }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}

function onImageClick(panel: PanelId, event: MouseEvent): void {
  const { zoomed, imgRef } = panelState[panel]

  if (zoomed.value) {
    zoomed.value = false

    return
  }

  const img = imgRef.value!

  if (img.naturalWidth > 0 && !imageNeedsZoom(img)) {
    return
  }

  const rect = img.getBoundingClientRect()

  if (rect.width > 0 && rect.height > 0) {
    pendingClicks[panel] = {
      relX: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      relY: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    }
  }

  zoomed.value = true
}

function toggleZoom(panel: PanelId): void {
  const { zoomed, imgRef } = panelState[panel]

  if (!zoomed.value) {
    const img = imgRef.value!

    if (img.naturalWidth > 0 && !imageNeedsZoom(img)) {
      return
    }
  }

  zoomed.value = !zoomed.value
}

function scrollAfterZoomIn(
  container: HTMLElement,
  img: HTMLElement,
  pendingClick: { relX: number; relY: number } | null
): void {
  if (pendingClick) {
    container.scrollLeft = Math.max(
      0,
      pendingClick.relX * img.offsetWidth - container.clientWidth / 2
    )
    container.scrollTop = Math.max(
      0,
      pendingClick.relY * img.offsetHeight - container.clientHeight / 2
    )
  } else {
    container.scrollLeft = Math.max(
      0,
      (img.offsetWidth - container.clientWidth) / 2
    )
    container.scrollTop = Math.max(
      0,
      (img.offsetHeight - container.clientHeight) / 2
    )
  }
}

watch(
  originalZoomed,
  isZoomed => {
    if (!isZoomed) {
      return
    }

    scrollAfterZoomIn(
      originalContainerRef.value!,
      originalImgRef.value!,
      pendingClicks.original
    )
    pendingClicks.original = null
  },
  { flush: 'post' }
)

watch(
  optimizedZoomed,
  isZoomed => {
    if (!isZoomed) {
      return
    }

    scrollAfterZoomIn(
      optimizedContainerRef.value!,
      optimizedImgRef.value!,
      pendingClicks.optimized
    )
    pendingClicks.optimized = null
  },
  { flush: 'post' }
)

onMounted(() => {
  originalUrl.value = URL.createObjectURL(props.item.originalBlob)
  optimizedUrl.value = URL.createObjectURL(props.item.blob)
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  URL.revokeObjectURL(originalUrl.value)
  URL.revokeObjectURL(optimizedUrl.value)
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: $modal-z-index;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);

  .modal-content {
    width: 90vw;
    max-width: 1200px;
    height: 90vh;
    display: flex;
    flex-direction: column;
    background: $white-color;
    border-radius: 8px;
    overflow: hidden;

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid $light-grey-color;
      flex-shrink: 0;

      .modal-title {
        font-weight: 600;
        font-size: 16px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .close-button {
        padding: 4px 12px;
        background-color: $dark-grey-color;
        color: $white-color;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        flex-shrink: 0;

        &:hover {
          background-color: $grey-color-2;
        }
      }
    }

    .modal-body {
      min-height: 0;
      display: flex;
      flex: 1;
      gap: 16px;
      padding: 16px;
      overflow: auto;

      @media (max-width: $md) {
        flex-direction: column;
      }

      .preview-panel {
        min-width: 0;
        min-height: 0;
        flex: 1;
        display: flex;
        flex-direction: column;

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-shrink: 0;

          .panel-label {
            font-weight: 500;
          }

          .panel-dims {
            font-size: 14px;
            color: $grey-blue-color;
          }

          .panel-size {
            font-size: 14px;
            color: $grey-blue-color;
          }
        }

        .image-container {
          min-height: 200px;
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid $light-grey-color;
          border-radius: 4px;
          overscroll-behavior: contain;

          img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            flex-shrink: 0;
            user-select: none;
          }

          &.zoomed {
            align-items: flex-start;
            justify-content: flex-start;

            img {
              max-width: none;
              max-height: none;
            }
          }
        }

        .zoom-button {
          margin-top: 8px;
          padding: 4px 12px;
          background-color: $blue-color;
          color: $white-color;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          align-self: center;
          flex-shrink: 0;

          &:hover {
            background-color: $blue-color-2;
          }
        }
      }
    }
  }
}
</style>
