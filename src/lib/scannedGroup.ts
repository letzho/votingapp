const SCANNED_GROUP_KEY = 'eep_scanned_group'

export interface ScannedGroup {
  slug: string
  name: string
  scannedAt: string
}

export function saveScannedGroup(group: { slug: string; name: string }): void {
  const payload: ScannedGroup = {
    slug: group.slug,
    name: group.name,
    scannedAt: new Date().toISOString(),
  }
  sessionStorage.setItem(SCANNED_GROUP_KEY, JSON.stringify(payload))
}

export function loadScannedGroup(): ScannedGroup | null {
  const raw = sessionStorage.getItem(SCANNED_GROUP_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as ScannedGroup
  } catch {
    return null
  }
}

export function clearScannedGroup(): void {
  sessionStorage.removeItem(SCANNED_GROUP_KEY)
}
