import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import en from '../../messages/en.json'
import { AssetForm } from '@/components/assets/asset-form'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, data: [] }),
  })),
}))
vi.mock('@/components/scanner/serial-ocr-scanner', () => ({
  SerialOcrScanner: ({ onDetected }: { onDetected: (t: string) => void }) => (
    <button onClick={() => onDetected('SN-FROM-CAMERA')}>mock-detect</button>
  ),
}))

function renderForm(initialData?: Record<string, string>) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AssetForm initialData={initialData} />
    </NextIntlClientProvider>
  )
}

describe('AssetForm serial number field', () => {
  it('renders an editable serial number input', async () => {
    renderForm()
    const input = await screen.findByLabelText(en.assetForm.serialNoLabel)
    await userEvent.type(input, 'SN-123')
    expect(input).toHaveValue('SN-123')
  })

  it('pre-fills from initialData', async () => {
    renderForm({ serialNo: 'SN-FROM-OCR' })
    expect(await screen.findByLabelText(en.assetForm.serialNoLabel)).toHaveValue('SN-FROM-OCR')
  })

  it('fills the serial field from OCR capture', async () => {
    renderForm()
    await userEvent.click(await screen.findByRole('button', { name: en.assetForm.scanSerial }))
    await userEvent.click(await screen.findByRole('button', { name: 'mock-detect' }))
    expect(screen.getByLabelText(en.assetForm.serialNoLabel)).toHaveValue('SN-FROM-CAMERA')
  })
})
