'use client'

import { useEffect, useRef, useState } from 'react'
import { CameraOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void
}

type CameraError = 'denied' | 'notFound' | 'insecure' | 'generic'

function mapCameraError(err: unknown): CameraError {
  const name =
    err instanceof DOMException
      ? err.name
      : typeof err === 'string'
        ? err
        : ((err as { name?: string })?.name ?? '')

  if (/NotAllowed|Permission|Security/i.test(name)) return 'denied'
  if (/NotFound|DevicesNotFound|Overconstrained/i.test(name)) return 'notFound'
  return 'generic'
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const t = useTranslations('scan')
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode')['Html5Qrcode']> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const [error, setError] = useState<CameraError | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let mounted = true
    setError(null)

    async function startScanner() {
      // Camera requires a secure context (HTTPS or localhost); the API is absent otherwise.
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (mounted) setError('insecure')
        return
      }

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

        if (!mounted || !containerRef.current) return

        const scanner = new Html5Qrcode('barcode-scanner-container', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false,
        })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
          },
          (decodedText) => {
            if (mounted) {
              onScanRef.current(decodedText)
            }
          },
          () => {
            // scan failure (no barcode in frame) — ignore
          }
        )
      } catch (err) {
        if (mounted) setError(mapCameraError(err))
      }
    }

    startScanner()

    return () => {
      mounted = false
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {
            // ignore cleanup errors
          })
        scannerRef.current = null
      }
    }
  }, [retryKey])

  if (error) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 bg-white p-6 text-center">
        <CameraOff size={32} className="text-gray-400" />
        <p className="text-sm text-gray-600">{t(`cameraError.${error}`)}</p>
        <Button variant="secondary" onClick={() => setRetryKey((k) => k + 1)}>
          {t('retryCamera')}
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl">
      <div
        id="barcode-scanner-container"
        ref={containerRef}
        className="w-full"
      />
    </div>
  )
}
