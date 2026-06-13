export type ResultItem = {
  id: string
  name: string
  blob: Blob
  originalBlob: Blob
  originalSize: number
  optimizedSize: number
  success: boolean
}

export interface FileResult {
  file: Blob
  success: boolean
}
