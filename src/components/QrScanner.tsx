import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { getCameraBlockedMessage, getCameraErrorMessage, isCameraAllowed } from '../lib/cameraAccess'

interface QrScannerProps {
  onScan: (text: string) => void
  onClose: () => void
}

const QR_BOX_SIZE = 250

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const elementId = useId().replace(/:/g, '')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannedRef = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isCameraAllowed()) {
      setError(getCameraBlockedMessage())
      return
    }

    const scanner = new Html5Qrcode(elementId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE } },
        (decodedText) => {
          if (scannedRef.current) return
          scannedRef.current = true
          void scanner.stop().finally(() => onScan(decodedText))
        },
        () => {}
      )
      .catch((err: unknown) => {
        setError(getCameraErrorMessage(err))
      })

    return () => {
      scannedRef.current = true
      if (scannerRef.current?.isScanning) {
        void scannerRef.current.stop().catch(() => {})
      }
      scannerRef.current = null
    }
  }, [elementId, onScan])

  const viewportStyle = {
    '--qr-box-size': `${QR_BOX_SIZE}px`,
  } as CSSProperties

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-modal card">
        <div className="qr-scanner-header">
          <h2>Scan Booth QR Code</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted">Align the QR code inside the frame below.</p>
        <div className="qr-scanner-viewport" style={viewportStyle}>
          <div id={elementId} className="qr-scanner-region" />
          {!error && (
            <div className="qr-viewfinder" aria-hidden="true">
              <div className="qr-viewfinder-frame">
                <span className="qr-corner qr-corner-tl" />
                <span className="qr-corner qr-corner-tr" />
                <span className="qr-corner qr-corner-bl" />
                <span className="qr-corner qr-corner-br" />
                <div className="qr-scan-line" />
              </div>
            </div>
          )}
        </div>
        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  )
}
