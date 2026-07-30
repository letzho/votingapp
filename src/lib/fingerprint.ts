const FINGERPRINT_KEY = 'eep_device_fingerprint'

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function getDeviceFingerprint(): string {
  const stored = localStorage.getItem(FINGERPRINT_KEY)
  if (stored) return stored

  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency ?? '',
    navigator.platform,
  ]

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('eep-fingerprint', 2, 2)
    parts.push(canvas.toDataURL())
  }

  const fingerprint = 'fp_' + simpleHash(parts.join('|'))
  localStorage.setItem(FINGERPRINT_KEY, fingerprint)
  return fingerprint
}

export async function getClientIp(): Promise<string> {
  // Avoid external IP lookup from browser to prevent DNS/network failures
  // (e.g. ERR_NAME_NOT_RESOLVED) from breaking UX.
  return Promise.resolve('unknown')
}

export function isValidNypEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return (
    normalized.endsWith('@mymail.nyp.edu.sg') ||
    normalized.endsWith('@nyp.edu.sg')
  )
}
