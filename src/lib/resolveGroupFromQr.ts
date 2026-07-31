import { parseGroupSlugFromQr } from './parseQrGroup'
import { supabase } from './supabase'

export interface ResolvedGroup {
  slug: string
  name: string
}

export async function resolveGroupFromQr(text: string): Promise<ResolvedGroup | null> {
  const slug = parseGroupSlugFromQr(text.trim())
  if (!slug) return null

  const { data } = await supabase.from('groups').select('slug, name').eq('slug', slug).maybeSingle()
  return data ?? null
}
