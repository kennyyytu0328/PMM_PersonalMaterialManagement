'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { recognizeSerial, disposeOcr } from '@/lib/ocr'

interface SerialOcrScannerProps {
  onDetected: (text: string) => void
}

type CameraError = 'denied' | 'notFound' | 'insecure' | 'generic'
type OcrState = 'ready' | 'recognizing' | 'result' | 'empty'

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

// Wraps the camera session in a `key`-remounted child so retrying re-runs
// camera setup with fresh state instead of resetting state inside an effect.
export function SerialOcrScanner({ onDetected }: SerialOcrScannerProps) {
  const [retryKey, setRetryKey] = useState(0)
  return (
    <SerialOcrCameraSession
      key={retryKey}
      onDetected={onDetected}
      onRetry={() => setRetryKey((k) => k + 1)}
    />
  )
}

interface SerialOcrCameraSessionProps {
  onDetected: (text: string) => void
  onRetry: () => void
}

function SerialOcrCameraSession({ onDetected, onRetry }: SerialOcrCameraSessionProps) {
  const t = useTranslations('scan')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<CameraError | null>(null)
  const [ocrState, setOcrState] = useState<OcrState>('ready')
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState(0)

  useEffect(() => {
    let mounted = true

    async function startCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (mounted) setError('insecure')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // 1080p ideal: default camera resolution (~640x480) leaves the crop
          // band too few pixels for reliable OCR (verified empirically).
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err) {
        if (mounted) setError(mapCameraError(err))
      }
    }

    startCamera()

    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      disposeOcr().catch(() => {
        // ignore cleanup errors
      })
    }
  }, [])

  async function handleCapture() {
    const video = videoRef.current
    setOcrState('recognizing')
    try {
      const canvas = document.createElement('canvas')
      // Crop to the central guide band (80% width, 25% height) for accuracy.
      const vw = video?.videoWidth || 640
      const vh = video?.videoHeight || 480
      const cw = Math.round(vw * 0.8)
      const ch = Math.round(vh * 0.25)
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (ctx && video) {
        // Feed the raw crop — no grayscale/contrast preprocessing. A CSS-style
        // contrast(1.4) filter clips detail the LSTM engine needs and drops
        // recognition from ~89 confidence to zero on real labels (verified
        // against a production label photo); tesseract grayscales internally.
        ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, cw, ch)
      }
      const result = await recognizeSerial(canvas)
      if (result.text) {
        setText(result.text)
        setConfidence(Math.round(result.confidence))
        setOcrState('result')
      } else {
        setOcrState('empty')
      }
    } catch {
      setOcrState('empty')
    }
  }

  if (error) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 bg-white p-6 text-center">
        <CameraOff size={32} className="text-gray-400" />
        <p className="text-sm text-gray-600">{t(`cameraError.${error}`)}</p>
        <Button variant="secondary" onClick={onRetry}>
          {t('retryCamera')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} playsInline muted className="w-full" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-1/4 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
        </div>
      </div>
      <p className="text-center text-xs text-gray-400">{t('serialGuideHint')}</p>

      {(ocrState === 'ready' || ocrState === 'recognizing') && (
        <Button className="w-full" onClick={handleCapture} disabled={ocrState === 'recognizing'}>
          <Camera size={16} className="mr-1" />
          {ocrState === 'recognizing' ? t('recognizing') : t('capture')}
        </Button>
      )}

      {ocrState === 'result' && (
        <div className="space-y-2">
          <Input
            id="recognized-serial"
            label={t('recognizedLabel')}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-gray-500">{t('confidenceHint', { value: confidence })}</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => onDetected(text)} disabled={!text}>
              {t('useSerial')}
            </Button>
            <Button variant="secondary" onClick={() => setOcrState('ready')} aria-label={t('retake')}>
              <RotateCcw size={16} />
            </Button>
          </div>
        </div>
      )}

      {ocrState === 'empty' && (
        <div className="space-y-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center">
          <p className="text-sm text-gray-700">{t('nothingReadable')}</p>
          <Button variant="secondary" className="w-full" onClick={() => setOcrState('ready')}>
            {t('retake')}
          </Button>
        </div>
      )}
    </div>
  )
}
