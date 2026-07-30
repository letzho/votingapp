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
    // fall through to regex
  }

  const match = trimmed.match(/[?&]group=([^&]+)/i)
  if (match) {
    return decodeURIComponent(match[1]).toLowerCase().trim()
  }

  return null
}
