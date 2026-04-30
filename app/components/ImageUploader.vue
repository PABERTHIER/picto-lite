<template>
  <div class="uploader-container">
    <input
      id="upload-input"
      ref="input"
      type="file"
      multiple
      accept="image/*"
      hidden
      @change="onInputChange" />

    <div
      class="drop-zone"
      :class="{ 'drag-hover': isDragOver }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="input?.click()">
      <div>{{ t('components.image_uploader.drop_zone_description') }}</div>
      <div class="supported-formats">
        {{ t('components.image_uploader.drop_zone_supported_formats') }}
      </div>
    </div>

    <div class="webp-option-container">
      <input id="webp-convert" v-model="convertToWebp" type="checkbox" />
      <label for="webp-convert" class="name">
        {{ t('components.image_uploader.webp_option_checkbox_name') }}
      </label>
    </div>

    <div v-if="totalFiles > 0" class="progress-container">
      <div
        class="progress-bar-container"
        :class="{ 'is-processing': isProcessing }">
        <div class="progress-bar" :style="progressStyle" />
      </div>
      <div class="progress-text">{{ processedFiles }} / {{ totalFiles }}</div>
    </div>

    <div v-if="results.length > 0 && !isProcessing" class="bulk-actions">
      <button
        v-if="successfulResults.length > 0"
        class="download-all-button"
        @click="downloadAllImages">
        {{ t('components.image_uploader.download_all_wording') }}
      </button>
      <button class="clear-all-button" @click="clearAll">
        {{ t('components.image_uploader.clear_all_wording') }}
      </button>
    </div>

    <div class="results-list">
      <div
        v-for="(item, idx) in results"
        :key="item.id"
        class="results-list-item">
        <div class="item-details">
          <div class="item-name">{{ item.name }}</div>
          <div :class="['item-size', reductionClass(item)]">
            {{ formatImageReductionWording(item) }}
          </div>
          <div v-if="!item.success" class="unsupported-format">
            {{ t('components.image_uploader.unsupported_format') }}
          </div>
        </div>
        <div class="item-actions">
          <button
            v-if="item.success"
            class="preview-button"
            @click="previewItem = item">
            {{ t('components.image_uploader.preview_image_wording') }}
          </button>
          <button class="download-button" @click="downloadImage(item)">
            {{ t('components.image_uploader.download_image_wording') }}
          </button>
          <button class="delete-button" @click="removeItem(idx)">
            {{ t('components.image_uploader.delete_item_wording') }}
          </button>
        </div>
      </div>
    </div>

    <ImagePreviewModal
      v-if="previewItem"
      :item="previewItem"
      @close="previewItem = null" />
  </div>
</template>

<script setup lang="ts">
import JSZip from 'jszip'
import type { ResultItem } from '~/types/result'
import type { ShowSaveFilePicker } from '~/types/file-picker'

const { t } = useI18n()

const imageReductionWording = computed(() =>
  t('components.image_uploader.image_reduction_wording')
)

const input = ref<HTMLInputElement>()
const results = ref<ResultItem[]>([])
const previewItem = ref<ResultItem | null>(null)
const convertToWebp = ref(false)
const isDragOver = ref(false)
const totalFiles = ref(0)
const processedFiles = ref(0)
const currentBatchId = ref(0)
const itemIdCounter = ref(0)

const isProcessing = computed(
  () => totalFiles.value > 0 && processedFiles.value < totalFiles.value
)
const successfulResults = computed(() => results.value.filter(r => r.success))

const progressPercent = computed(() =>
  Math.round((processedFiles.value / Math.max(1, totalFiles.value)) * 100)
)
const progressStyle = computed(() => {
  const minimalFileRequired: number = 1
  return {
    width: `${progressPercent.value}%`,
    transition:
      totalFiles.value <= minimalFileRequired ? 'none' : 'width 0.1s ease',
  }
})

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const onDragLeave = () => {
  isDragOver.value = false
}

function onInputChange(event: Event): void {
  const target = event.target as HTMLInputElement | null
  const files = target?.files

  if (!files || files.length === 0) {
    return
  }

  void handleFiles(files)
}

function onDrop(event: DragEvent): void {
  const dataTransfer = event.dataTransfer
  const files = dataTransfer?.files

  if (!files || files.length === 0) {
    isDragOver.value = false
    return
  }

  void handleFiles(files)
  isDragOver.value = false
}

async function handleFiles(files: FileList) {
  previewItem.value = null
  processedFiles.value = 0
  totalFiles.value = 0
  results.value = []

  const batchId = ++currentBatchId.value
  totalFiles.value = files.length

  for (const file of Array.from(files)) {
    const fileResult = await optimizeImage(file, convertToWebp.value)

    if (currentBatchId.value !== batchId) {
      return
    }

    const shouldUseWebpExt = fileResult.success && convertToWebp.value
    const ext = shouldUseWebpExt ? 'webp' : file.name.split('.').pop()!
    const name = `${file.name.replace(/\.[^/.]+$/, '')}.${ext}`

    results.value.push({
      id: String(++itemIdCounter.value),
      name,
      blob: fileResult.file,
      originalBlob: file,
      originalSize: file.size,
      optimizedSize: fileResult.file.size,
      success: fileResult.success,
    })

    processedFiles.value++
  }
}

function removeItem(idx: number): void {
  if (previewItem.value === results.value[idx]) {
    previewItem.value = null
  }

  results.value.splice(idx, 1)

  if (results.value.length === 0) {
    totalFiles.value = 0
    processedFiles.value = 0
  }
}

function clearAll(): void {
  currentBatchId.value++
  results.value = []
  totalFiles.value = 0
  processedFiles.value = 0
  previewItem.value = null
}

function formatImageReductionWording(item: ResultItem): string {
  const originalSize = formatSize(item.originalSize)
  const optimizedSize = formatSize(item.optimizedSize)
  const reduction = reductionPercent(item)

  return `${originalSize} → ${optimizedSize} (${reduction}% ${imageReductionWording.value})`
}

function formatSize(bytes: number): string {
  return bytes > 1024 * 1024
    ? (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    : (bytes / 1024).toFixed(1) + ' KB'
}

function reductionPercent(item: ResultItem): number {
  return Math.round((1 - item.optimizedSize / item.originalSize) * 100)
}

function reductionClass(item: ResultItem): string {
  const percent = reductionPercent(item)

  if (percent >= 20) {
    return 'reduction-good'
  }

  if (percent > 0) {
    return 'reduction-moderate'
  }

  return 'reduction-none'
}

function downloadImageFallback(item: ResultItem): void {
  const url = URL.createObjectURL(item.blob)
  const a = document.createElement('a')

  a.href = url
  a.download = item.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function downloadAllImages(): Promise<void> {
  const zip = new JSZip()

  for (const item of successfulResults.value) {
    const arrayBuffer = await item.blob.arrayBuffer()
    zip.file(item.name, arrayBuffer)
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')

  a.href = url
  a.download = 'optimized-images.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function downloadImage(item: ResultItem) {
  try {
    // File System Access API
    if (hasShowSaveFilePicker(window)) {
      const handle = await window.showSaveFilePicker({
        suggestedName: item.name,
        types: [
          {
            description: 'Image file',
            accept: { [item.blob.type]: ['.' + item.name.split('.').pop()] },
          },
        ],
      })

      const writable = await handle.createWritable()
      await writable.write(item.blob)
      await writable.close()

      return
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
  }

  // Fallback for browsers without FS Access API
  downloadImageFallback(item)
}

function hasShowSaveFilePicker(
  maybeWindow: unknown
): maybeWindow is Window & { showSaveFilePicker: ShowSaveFilePicker } {
  return (
    typeof maybeWindow === 'object' &&
    maybeWindow !== null &&
    typeof (maybeWindow as Window & { showSaveFilePicker?: unknown })
      .showSaveFilePicker === 'function'
  )
}

defineExpose({ previewItem })
</script>

<style lang="scss" scoped>
.uploader-container {
  .drop-zone {
    padding: 50px 0px;
    margin-bottom: 15px;
    text-align: center;
    border: 2px dashed $drop-zone-border-color;
    border-radius: 8px;
    cursor: pointer;

    .supported-formats {
      color: $blue-color;
    }

    &:hover,
    &.drag-hover {
      border-style: solid;
    }
  }

  .webp-option-container {
    display: flex;
    margin-bottom: 15px;

    #webp-convert {
      cursor: pointer;
    }

    .name {
      margin-left: 5px;
      cursor: pointer;
    }
  }

  .progress-container {
    margin-bottom: 15px;

    .progress-bar-container {
      height: 8px;
      background: $light-grey-color;
      border-radius: 4px;
      margin-bottom: 5px;
      position: relative;
      overflow: hidden;

      &.is-processing::after {
        width: 40%;
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.55),
          transparent
        );
        animation: shimmer-progress 1.5s ease-in-out infinite;
      }

      .progress-bar {
        height: 100%;
        position: relative;
        background: $blue-color;
        border-radius: 4px;
        z-index: 1;
      }
    }
  }

  .results-list {
    .results-list-item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border: 1px solid $light-grey-color;
      border-radius: 4px;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .item-details {
        min-width: 0;
        flex: 1;

        .item-name {
          font-weight: 500;
          overflow-wrap: break-word;
        }

        .item-size {
          font-size: 14px;
          color: $grey-blue-color;

          &.reduction-good {
            color: $green-color;
          }

          &.reduction-none {
            color: $grey-color;
          }
        }

        .unsupported-format {
          color: $dark-red-color;
        }
      }

      .item-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-left: auto;
        justify-content: flex-end;

        @media (max-width: $sm) {
          width: 100%;
          flex-direction: column;
        }
      }

      .preview-button {
        padding: 4px 12px;
        background-color: $dark-grey-color;
        color: $white-color;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          background-color: $grey-color-2;
        }
      }

      .download-button {
        padding: 4px 12px;
        background-color: $blue-color;
        color: $white-color;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          background-color: $blue-color-2;
        }
      }

      .delete-button {
        padding: 4px 12px;
        background-color: $dark-red-color;
        color: $white-color;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          background-color: $red-color;
        }
      }
    }
  }

  .bulk-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-bottom: 15px;

    .download-all-button {
      padding: 6px 14px;
      background-color: $blue-color;
      color: $white-color;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background-color: $blue-color-2;
      }
    }

    .clear-all-button {
      padding: 6px 14px;
      background-color: $dark-grey-color;
      color: $white-color;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background-color: $grey-color-2;
      }
    }
  }
}

@keyframes shimmer-progress {
  from {
    left: -40%;
  }
  to {
    left: 100%;
  }
}
</style>
