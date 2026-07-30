import { createClient } from '@supabase/supabase-js'

function sanitizeEnv(value: string | undefined): string {
  if (!value) return ''
  return value.trim().replace(/^['"]|['"]$/g, '').replace(/[\r\n]/g, '')
}

const supabaseUrl = sanitizeEnv(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = sanitizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const isSupabaseConfigured = Boolean(
  supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 20
)

if (!isSupabaseConfigured) {
  console.error('Invalid or missing Supabase env vars:', {
    url: supabaseUrl || '(empty)',
    keyPrefix: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 12)}...` : '(empty)',
  })
}

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : 'Supabase is not configured. In Vercel, set VITE_SUPABASE_URL (https://xxx.supabase.co) and VITE_SUPABASE_ANON_KEY (anon/publishable key), then redeploy.'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface VoterSession {
  voterId: string
  email: string
  votesUsed: number
  votesRemaining: number
}

export interface GroupTotal {
  id: string
  name: string
  slug: string
  booth_number: string | null
  vote_count: number
  total_stars: number
  average_stars: number
}

export interface Group {
  id: string
  name: string
  slug: string
  booth_number: string | null
}
