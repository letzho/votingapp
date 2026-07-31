export function parseGroupSlugFromQr(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const url = trimmed.startsWith('http')
      ? new URL(trimmed)
      : new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, 'http://local')

    const group = url.searchParams.get('group')
    if (group) return group.toLowerCase().trim()
  } catch {
    // fall through to other formats
  }

  const queryMatch = trimmed.match(/[?&]group=([^&\s]+)/i)
  if (queryMatch) {
    return decodeURIComponent(queryMatch[1]).toLowerCase().trim()
  }

  const labelMatch = trimmed.match(/^group:\s*(.+)$/i)
  if (labelMatch) {
    return labelMatch[1].toLowerCase().trim()
  }

  // Plain slug text in QR, e.g. "team-alpha"
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(trimmed)) {
    return trimmed.toLowerCase()
  }

  return null
}
