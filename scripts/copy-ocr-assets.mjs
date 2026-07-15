// Copies tesseract.js runtime assets from node_modules into public/ocr so the
// app works with no CDN access (LAN-only deployments). Runs on postinstall.
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'ocr')

mkdirSync(join(out, 'core'), { recursive: true })

cpSync(join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), join(out, 'worker.min.js'))

const coreFiles = [
  'tesseract-core.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
]
for (const f of coreFiles) {
  const src = join(root, 'node_modules', 'tesseract.js-core', f)
  if (existsSync(src)) cpSync(src, join(out, 'core', f))
}
