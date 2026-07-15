import { createWorker, PSM, type Worker } from 'tesseract.js'

// Next.js only inlines the full expression — do not destructure (see src/lib/api.ts).
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export interface SerialOcrResult {
  text: string
  confidence: number
}

export function normalizeSerial(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '')
}

let workerPromise: Promise<Worker> | null = null

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        workerPath: `${BASE_PATH}/ocr/worker.min.js`,
        corePath: `${BASE_PATH}/ocr/core`,
        langPath: `${BASE_PATH}/ocr/lang`,
      })
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
      })
      return worker
    })()
  }
  return workerPromise
}

export async function recognizeSerial(image: Blob | HTMLCanvasElement): Promise<SerialOcrResult> {
  const worker = await getWorker()
  const { data } = await worker.recognize(image)
  return { text: normalizeSerial(data.text), confidence: data.confidence }
}

export async function disposeOcr(): Promise<void> {
  if (!workerPromise) return
  const pending = workerPromise
  workerPromise = null
  const worker = await pending
  await worker.terminate()
}
