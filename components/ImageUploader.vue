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
      <div v-t="'components.image_uploader.drop_zone_description'" />
      <div
        v-t="'components.image_uploader.drop_zone_supported_formats'"
        class="supported-formats" />
    </div>

    <div class="webp-option-container">
      <input id="webp-convert" v-model="convertToWebp" type="checkbox" />
      <div
        v-t="'components.image_uploader.webp_option_checkbox_name'"
        class="name" />
    </div>

    <div v-if="totalFiles > 0" class="progress-container">
      <div class="progress-bar-container">
        <div class="progress-bar" :style="progressStyle" />
      </div>
      <div class="progress-text">{{ processedFiles }} / {{ totalFiles }}</div>
    </div>

    <div class="results-list">
      <div v-for="(item, idx) in results" :key="idx" class="results-list-item">
        <div class="item-details">
          <div class="item-name">{{ item.name }}</div>
          <div class="item-size">
            {{ formatImageReductionWording(item) }}
          </div>
          <div
            v-if="!item.success"
            v-t="'components.image_uploader.unsupported_format'"
            class="unsupported-format" />
        </div>
        <button
          v-t="'components.image_uploader.download_image_wording'"
          class="download-button"
          @click="downloadImage(item)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResultItem } from '~/types/result'
import type { ShowSaveFilePicker } from '~/types/file-picker'

const { t } = useI18n()

const imageReductionWording = computed(() =>
  t('components.image_uploader.image_reduction_wording')
)

const input = ref<HTMLInputElement>()
const results = ref<ResultItem[]>([])

const convertToWebp = ref(false)
const isDragOver = ref(false)
const totalFiles = ref(0)
const processedFiles = ref(0)

const progressPercent = computed(() =>
  totalFiles.value > 0
    ? Math.round((processedFiles.value / totalFiles.value) * 100)
    : 0
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
  processedFiles.value = 0
  totalFiles.value = 0

  results.value = []
  totalFiles.value = files.length

  for (const file of Array.from(files)) {
    const fileResult = await optimizeImage(file, convertToWebp.value)
    const ext =
      fileResult.success && convertToWebp.value
        ? 'webp'
        : file.name.split('.').pop()!
    const name = `${file.name.replace(/\.[^/.]+$/, '')}.${ext}`
    results.value.push({
      name,
      blob: fileResult.file,
      originalSize: file.size,
      optimizedSize: fileResult.file.size,
      success: fileResult.success,
    })
    processedFiles.value++
  }
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
  } catch {
    // File System Access API not supported, fallback to link'
  }

  // Fallback for browsers without FS Access API
  const url = URL.createObjectURL(item.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = item.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
    align-items: center;
    margin-bottom: 15px;

    .name {
      margin-left: 5px;
    }
  }

  .progress-container {
    margin-bottom: 15px;

    .progress-bar-container {
      height: 8px;
      background: $light-grey-color;
      border-radius: 4px;
      margin-bottom: 5px;

      .progress-bar {
        height: 100%;
        background: $blue-color;
        border-radius: 4px;
      }
    }
  }

  .results-list {
    .results-list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      border: 1px solid $light-grey-color;
      border-radius: 4px;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .item-details {
        .item-name {
          font-weight: 500;
        }

        .item-size {
          font-size: 14px;
          color: $grey-blue-color;
        }

        .unsupported-format {
          color: $dark-red-color;
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
    }
  }
}
</style>
