export type ResultItem = {
  name: string
  blob: Blob
  originalSize: number
  optimizedSize: number
  success: boolean
}

export interface FileResult {
  file: Blob
  success: boolean
}
