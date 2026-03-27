'use client'

import { useEffect, useRef } from 'react'

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void
}


export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode')['Html5Qrcode']> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    let mounted = true

    async function startScanner() {
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

      try {
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
            // scan failure — ignore
          }
        )
      } catch {
        // camera access failed or already running
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
  }, [])

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
