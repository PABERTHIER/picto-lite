interface FilePickerAcceptType {
  description?: string
  accept: Record<string, string[]>
}

export interface FilePickerOptions {
  suggestedName?: string
  types?: FilePickerAcceptType[]
}

export type ShowSaveFilePicker = (options?: FilePickerOptions) => Promise<{
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>
    close: () => Promise<void>
  }>
}>
