import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

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
