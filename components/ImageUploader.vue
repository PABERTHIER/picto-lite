<template>
  <div class="uploader-container">
    <input type="file" multiple accept="image/*" ref="input" @change="handleFiles($event.target.files)" hidden />

    <div
      class="drop-zone"
      :class="{ 'drag-hover': isDragOver }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="handleFiles($event.dataTransfer.files)"
      @click="() => input.click()">
      <div v-t="'components.image_uploader.drop_zone_description'" />
    </div>

    <div class="webp-option-container">
      <input type="checkbox" v-model="convertToWebp" />
      <div class="name" v-t="'components.image_uploader.webp_option_checkbox_name'" />
    </div>

    <div class="results-list">
      <div v-for="(item, idx) in results" :key="idx" class="results-list-item">
        <div class="item-details">
          <div class="item-name">{{ item.name }}</div>
          <div class="item-size">
            {{ formatSize(item.originalSize) }} → {{ formatSize(item.optimizedSize) }}
            ({{ reductionPercent(item) }}% {{ imageReductionWording }})
          </div>
        </div>
        <button @click="downloadImage(item)" class="download-button" v-t="'components.image_uploader.download_image_wording'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

type ResultItem = {
  name: string
  blob: Blob
  originalSize: number
  optimizedSize: number
}

const imageReductionWording = computed(() => t('components.image_uploader.image_reduction_wording'))

const input = ref<HTMLInputElement>()
const convertToWebp = ref(false)
const results = ref<ResultItem[]>([])

const isDragOver = ref(false)

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const onDragLeave = () => {
  isDragOver.value = false
}

async function handleFiles(files: FileList) {
  results.value = []
  for (const file of Array.from(files)) {
    const blob = await optimizeImage(file, convertToWebp.value)
    const ext = convertToWebp.value ? 'webp' : file.name.split('.').pop()!
    const name = `${file.name.replace(/\.[^/.]+$/, '')}.${ext}`
    results.value.push({
      name,
      blob,
      originalSize: file.size,
      optimizedSize: blob.size,
    })
  }
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
    // Use File System Access API if available
    // @ts-ignore
    if (window.showSaveFilePicker) {
      // @ts-ignore
      const handle = await window.showSaveFilePicker({
        suggestedName: item.name,
        types: [{
          description: 'Image file',
          accept: { [item.blob.type]: ['.' + item.name.split('.').pop()] },
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(item.blob)
      await writable.close()
      return
    }
  } catch (e) {
    console.warn('File System Access API not supported, falling back to download')
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

    &:hover {
      border-style: solid;
    }

    &.drag-hover {
      border-style: solid;
    }
  }

  .webp-option-container {
    display: flex;
    align-items: center;

    .name {
      margin-left: 5px;
    }
  }

  .results-list {
    margin-top: 16px;

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
