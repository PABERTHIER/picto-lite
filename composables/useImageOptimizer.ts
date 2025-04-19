export async function optimizeImage(
  file: File,
  convertToWebp: boolean,
  maxSizeBytes = 1_000_000
): Promise<Blob> {
  const img = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const mime = convertToWebp ? 'image/webp' : file.type
  let [low, high] = [0.1, 0.92]
  let blob: Blob | null = null

  // Binary search quality to fit under maxSizeBytes
  for (let i = 0; i < 6; i++) {
    const q = (low + high) / 2
    blob = await canvas.convertToBlob({ type: mime, quality: q })
    if (blob.size > maxSizeBytes) {
      high = q
    } else {
      low = q
    }
  }

  return blob!
}
