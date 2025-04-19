<template>
  <div class="uploader">
    <input type="file" multiple accept="image/*" ref="input" @change="handleFiles($event.target.files)" hidden />

    <div class="drop-zone" @dragover.prevent @drop.prevent="handleFiles($event.dataTransfer.files)" @click="() => input.click()">
      <p>Drag & drop images here, or click to select</p>
    </div>

    <label class="mt-4 inline-flex items-center">
      <input type="checkbox" v-model="convertToWebp" class="mr-2" /> Convert to WebP
    </label>

    <ul class="mt-4 space-y-2">
      <li v-for="(item, idx) in results" :key="idx" class="flex justify-between items-center p-2 border rounded">
        <div>
          <p class="font-medium">{{ item.name }}</p>
          <p class="text-sm text-gray-600">
            {{ formatSize(item.originalSize) }} → {{ formatSize(item.optimizedSize) }}
            ({{ reductionPercent(item) }}% reduction)
          </p>
        </div>
        <button @click="downloadImage(item)" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
          Download
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { optimizeImage } from '~/composables/useImageOptimizer'

type ResultItem = {
  name: string
  blob: Blob
  originalSize: number
  optimizedSize: number
}

const input = ref<HTMLInputElement>()
const convertToWebp = ref(false)
const results = ref<ResultItem[]>([])

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

<style scoped>
.drop-zone {
  border: 2px dashed #ccc;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  border-radius: 0.5rem;
}
</style>
