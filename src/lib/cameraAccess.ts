export function isCameraAllowed(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext
}

export function getCameraBlockedMessage(): string {
  if (typeof window === 'undefined') return ''

  if (!window.isSecureContext) {
    return (
      'Camera needs a secure connection (HTTPS). ' +
      'Opening http://192.168.x.x on your phone will not show a camera permission prompt. ' +
      'Deploy to Vercel or open the app over HTTPS to scan QR codes on phone.'
    )
  }

  return ''
}

export function getCameraErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return 'Camera permission denied. Allow camera access in your browser settings and try again.'
    }
    if (err.name === 'NotFoundError') {
      return 'No camera found on this device.'
    }
    if (err.name === 'NotReadableError') {
      return 'Camera is in use by another app. Close other camera apps and try again.'
    }
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('secure') || msg.includes('https') || msg.includes('permission')) {
      return getCameraBlockedMessage() || err.message
    }
    return err.message
  }

  return 'Could not access camera. Allow camera permission and try again.'
}
