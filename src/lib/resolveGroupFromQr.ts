import { parseGroupSlugFromQr } from './parseQrGroup'
import { supabase } from './supabase'

export interface ResolvedGroup {
  slug: string
  name: string
}

async function findGroupBySlug(slug: string): Promise<ResolvedGroup | null> {
  const { data } = await supabase.from('groups').select('slug, name').eq('slug', slug).maybeSingle()
  return data ?? null
}

async function findGroupByName(name: string): Promise<ResolvedGroup | null> {
  const { data } = await supabase.from('groups').select('slug, name').ilike('name', name).maybeSingle()
  return data ?? null
}

export async function resolveGroupFromQr(text: string): Promise<ResolvedGroup | null> {
  const trimmed = text.trim()
  if (!trimmed) return null

  const slug = parseGroupSlugFromQr(trimmed)
  if (slug) {
    const bySlug = await findGroupBySlug(slug)
    if (bySlug) return bySlug
  }

  // Simple QR with plain team name, e.g. "Team Alpha"
  if (!trimmed.includes('\n') && trimmed.length <= 100) {
    const byName = await findGroupByName(trimmed)
    if (byName) return byName
  }

  return null
}
