import 'fake-indexeddb/auto'

if (!('self' in globalThis)) {
  Object.defineProperty(globalThis, 'self', { value: globalThis })
}

if (!('FileReader' in globalThis)) {
  class TestFileReader {
    result: ArrayBuffer | null = null
    error: Error | null = null
    onabort: ((event: { target: TestFileReader }) => void) | null = null
    onerror: ((event: { target: TestFileReader }) => void) | null = null
    onload: ((event: { target: TestFileReader }) => void) | null = null

    async readAsArrayBuffer(blob: Blob) {
      try {
        this.result = await blob.arrayBuffer()
        this.onload?.({ target: this })
      } catch (error) {
        this.error = error instanceof Error ? error : new Error('Could not read blob')
        this.onerror?.({ target: this })
      }
    }
  }

  Object.defineProperty(globalThis, 'FileReader', { value: TestFileReader })
}
