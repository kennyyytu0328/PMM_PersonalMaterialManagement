// Copies tesseract.js runtime assets from node_modules into public/ocr so the
// app works with no CDN access (LAN-only deployments). Runs before dev/build.
import { cpSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'ocr')
const workerSrc = join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js')
const coreDir = join(root, 'node_modules', 'tesseract.js-core')

mkdirSync(join(out, 'core'), { recursive: true })

if (existsSync(workerSrc)) {
  cpSync(workerSrc, join(out, 'worker.min.js'))
}

let copiedCount = 0
if (existsSync(coreDir)) {
  const coreFiles = readdirSync(coreDir).filter((f) => f.endsWith('.wasm.js'))
  for (const f of coreFiles) {
    cpSync(join(coreDir, f), join(out, 'core', f))
    copiedCount += 1
  }
}

if (copiedCount === 0) {
  throw new Error(
    `copy-ocr-assets: no *.wasm.js files found in ${coreDir} — is tesseract.js-core installed?`
  )
}

if (!existsSync(join(out, 'worker.min.js'))) {
  throw new Error(
    `copy-ocr-assets: worker.min.js missing from node_modules/tesseract.js/dist — is tesseract.js installed?`
  )
}
