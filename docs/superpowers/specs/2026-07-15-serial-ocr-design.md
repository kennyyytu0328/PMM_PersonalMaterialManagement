# Serial-Number OCR — Design Spec

Date: 2026-07-15
Status: approved pending user spec review

## Problem

Some items and assets carry no barcode — only a printed/engraved serial number.
The scan page currently supports barcode scanning only, and the database has no
serial-number field. Users must type serials by hand when registering assets and
cannot look assets up by serial at all.

## Decision Summary

- **Scope:** assets only. Items are quantity-based consumables; per-unit serials
  do not map to them. (User decision.)
- **Usage:** both lookup (scan page) and capture (asset registration). (User decision.)
- **UX:** explicit `[Barcode | Serial]` mode toggle on the scan page. (User decision.)
- **Engine:** client-side tesseract.js behind a pluggable interface; no cloud
  dependency. A Gemini-based provider can be added later behind the same
  interface if local accuracy proves insufficient — not built now (YAGNI).
  Rationale: user confirms/edits recognized text before use, so the accuracy bar
  is "usually right, always correctable"; local engine keeps the self-hosted app
  free of API keys, internet dependency, rate limits, and third-party photo upload.

## 1. Data Model

- `assets.serialNo`: nullable `text('serial_no')` column, non-unique, no
  explicit index (the schema declares no `index()` anywhere; the analogous
  `barcode` lookup column is likewise unindexed — asset counts are small).
  `assetNo` remains the only unique business key (real-world serials are not
  guaranteed unique across manufacturers).
- Drizzle schema edit → `pnpm db:generate` → migration committed with the change.
- Asset Zod schemas (`src/lib/validations.ts`): optional string, max 120 chars.
  Empty form values are omitted from the submit payload exactly as the existing
  `barcode` field is (stored as NULL) — same convention end to end.
- Assets API (create/update) accepts and persists `serialNo`; asset detail page
  displays it when present.

## 2. OCR Engine Module — `src/lib/ocr.ts`

- Interface: `recognizeSerial(image: Blob | HTMLCanvasElement) → Promise<{ text: string; confidence: number }>`.
- Implementation wraps a tesseract.js worker: created lazily once, reused across
  captures, terminated via an exported `disposeOcr()` (called on component unmount).
- Worker parameters: single-line page segmentation, character whitelist `A-Z0-9-`.
- Normalization applied before returning: uppercase, trim, collapse/strip inner
  whitespace.
- **Self-hosted engine assets:** tesseract.js defaults to CDN downloads for its
  WASM core, worker, and traineddata. The app must work on LAN-only deployments,
  so these files are served from `/public/ocr/` and the worker is configured with
  explicit `workerPath` / `corePath` / `langPath`. Exact tesseract.js v6 API
  confirmed via context7 during planning.
- This module is the swappable seam for any future engine (e.g. Gemini vision).

## 3. Capture UI — `src/components/scanner/serial-ocr-scanner.tsx`

- Camera preview via `getUserMedia` (environment-facing), reusing the error
  taxonomy of `barcode-scanner.tsx` (`denied` / `notFound` / `insecure` /
  `generic`) and its retry affordance.
- Letterbox guide overlay sized for one serial line.
- **Single-shot capture:** user taps a capture button; the current frame is
  cropped to the guide box and converted to grayscale on a canvas, then passed
  to `recognizeSerial`.
- Result state: editable text input pre-filled with recognized text plus a
  confidence hint; user confirms (`onDetected(text)`) or retakes. Empty/failed
  recognition shows a "nothing readable" state with retry.
- Props: `{ onDetected: (text: string) => void }`; the component does no lookup
  itself.

## 4. Scan Page Integration — `src/app/(main)/scan/page.tsx`

- `[Barcode | Serial]` mode toggle above the camera, visual pattern matching
  `ContentTabs`.
- Serial mode renders `SerialOcrScanner`; confirmed text feeds the existing
  `handleScan` lookup path (`GET /api/scan?barcode=<text>`).
- `/api/scan` asset clause extended to `barcode OR assetNo OR serialNo` — one
  line change; OCR'd printed asset numbers therefore resolve with no extra work.
- Not-found in serial mode: primary action becomes
  `/assets/new?serialNo=<text>` ("register as new asset") instead of the item
  form. Barcode mode behavior unchanged.

## 5. Asset Form — `src/components/assets/asset-form.tsx`

- New serial-number text input with a camera button; the button opens
  `SerialOcrScanner` in the existing `Modal` component and fills the field on
  confirm.
- `/assets/new` reads the `serialNo` query param as the field's initial value.

## 6. i18n

- New keys in `scan` and asset-form namespaces in **both** `messages/en.json`
  and `messages/zh-TW.json`: mode labels, capture / confirm / retake actions,
  recognizing state, nothing-readable error, serial field label.

## 7. Error Handling

- Camera failures: same mapping and retry UX as barcode scanner.
- OCR returns empty text → "nothing readable" + retry; low confidence → still
  show editable text (user is the accuracy gate).
- Lookup/API failures: existing scan-page `not-found` handling.

## 8. Testing

- Unit: serial normalization (case, whitespace, whitelist edge cases), Zod
  schema acceptance/rejection.
- Integration (Vitest): `/api/scan` matches `serialNo`; assets API round-trips
  `serialNo`; scan API still matches items/assetNo/barcode as before.
- tesseract.js is mocked in Vitest (WASM/camera unavailable in jsdom); the
  capture component's state machine is tested against the mock.
- Manual browser verification of real OCR + camera on the running app
  (`verify` skill) before completion. Coverage target ≥ 80% on touched code.

## Out of Scope

- OCR for items (consumables).
- Cloud/Gemini OCR provider (interface accommodates it later).
- Continuous-video OCR; batch capture; barcode + OCR simultaneous mode.
