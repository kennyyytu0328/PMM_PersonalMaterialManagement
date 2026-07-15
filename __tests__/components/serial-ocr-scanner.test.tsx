import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import en from '../../messages/en.json'
import { SerialOcrScanner } from '@/components/scanner/serial-ocr-scanner'

const recognizeSerialMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/ocr', () => ({
  recognizeSerial: recognizeSerialMock,
  disposeOcr: vi.fn(async () => {}),
}))

beforeEach(() => {
  vi.clearAllMocks()
  recognizeSerialMock.mockResolvedValue({ text: 'SN-OCR-77', confidence: 91 })
  // jsdom has no camera or canvas — stub both.
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn() }],
      })),
    },
  })
  window.HTMLMediaElement.prototype.play = vi.fn(async () => {})
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    filter: '',
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext
})

function renderScanner(onDetected = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SerialOcrScanner onDetected={onDetected} />
    </NextIntlClientProvider>
  )
  return onDetected
}

describe('SerialOcrScanner', () => {
  it('captures, shows editable result, and confirms user-edited text', async () => {
    const onDetected = renderScanner()
    await userEvent.click(await screen.findByRole('button', { name: en.scan.capture }))
    const input = await screen.findByLabelText(en.scan.recognizedLabel)
    expect(input).toHaveValue('SN-OCR-77')
    await userEvent.clear(input)
    await userEvent.type(input, 'SN-EDITED')
    await userEvent.click(screen.getByRole('button', { name: en.scan.useSerial }))
    expect(onDetected).toHaveBeenCalledWith('SN-EDITED')
  })

  it('requests high-resolution camera and feeds an unfiltered crop to OCR', async () => {
    renderScanner()
    await userEvent.click(await screen.findByRole('button', { name: en.scan.capture }))
    // Low default camera resolution (~640x480) makes the OCR crop unreadable.
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    })
    // A grayscale/contrast canvas filter empirically zeroes OCR confidence on
    // real labels — the crop must reach the engine unfiltered.
    const ctx = (HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mock
      .results[0]?.value
    expect(ctx.filter).toBe('')
    // The crop must be a thin 5:1 band derived from WIDTH (portrait phone
    // streams make height-fraction crops swallow the whole scene, which
    // empirically zeroes single-line OCR). jsdom video is 0x0 → 640x480
    // fallback → 512-wide, 102-tall band centered vertically.
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      64,
      189,
      512,
      102,
      0,
      0,
      512,
      102
    )
  })

  it('shows retry state when nothing is recognized', async () => {
    recognizeSerialMock.mockResolvedValue({ text: '', confidence: 0 })
    renderScanner()
    await userEvent.click(await screen.findByRole('button', { name: en.scan.capture }))
    expect(await screen.findByText(en.scan.nothingReadable)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.scan.retake })).toBeInTheDocument()
  })

  it('shows camera error state when getUserMedia rejects', async () => {
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
      new DOMException('denied', 'NotAllowedError')
    )
    renderScanner()
    expect(await screen.findByText(en.scan.cameraError.denied)).toBeInTheDocument()
  })
})
