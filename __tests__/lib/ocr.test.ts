import { describe, it, expect, vi, beforeEach } from 'vitest'

const recognizeMock = vi.hoisted(() => vi.fn())
const setParametersMock = vi.hoisted(() => vi.fn())
const terminateMock = vi.hoisted(() => vi.fn())
const createWorkerMock = vi.hoisted(() =>
  vi.fn(async () => ({
    recognize: recognizeMock,
    setParameters: setParametersMock,
    terminate: terminateMock,
  }))
)
vi.mock('tesseract.js', () => ({
  createWorker: createWorkerMock,
  PSM: { SINGLE_LINE: '7' },
}))

import { normalizeSerial, recognizeSerial, disposeOcr } from '@/lib/ocr'

describe('normalizeSerial', () => {
  it('uppercases and strips whitespace', () => {
    expect(normalizeSerial(' sn 123-a b ')).toBe('SN123-AB')
  })
  it('drops characters outside A-Z0-9-', () => {
    expect(normalizeSerial('SN_12.3/4#')).toBe('SN1234')
  })
  it('returns empty string for unreadable input', () => {
    expect(normalizeSerial(' \n .. ')).toBe('')
  })
})

describe('recognizeSerial', () => {
  beforeEach(async () => {
    await disposeOcr()
    vi.clearAllMocks()
    recognizeMock.mockResolvedValue({ data: { text: ' sn-42 x\n', confidence: 87 } })
  })

  it('returns normalized text and confidence', async () => {
    const result = await recognizeSerial(new Blob())
    expect(result).toEqual({ text: 'SN-42X', confidence: 87 })
  })

  it('reuses one worker across calls', async () => {
    await recognizeSerial(new Blob())
    await recognizeSerial(new Blob())
    expect(createWorkerMock).toHaveBeenCalledTimes(1)
  })

  it('disposeOcr terminates and allows recreation', async () => {
    await recognizeSerial(new Blob())
    await disposeOcr()
    expect(terminateMock).toHaveBeenCalledTimes(1)
    await recognizeSerial(new Blob())
    expect(createWorkerMock).toHaveBeenCalledTimes(2)
  })
})
