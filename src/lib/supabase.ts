import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : 'Supabase is not configured. In Vercel, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY under Settings → Environment Variables, then redeploy.'

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

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
