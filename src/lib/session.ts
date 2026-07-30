const SESSION_KEY = 'eep_voter_session'

import type { VoterSession } from './supabase'

export function saveSession(session: VoterSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): VoterSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as VoterSession
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function updateSessionVotes(used: number, remaining: number): void {
  const session = loadSession()
  if (!session) return
  saveSession({ ...session, votesUsed: used, votesRemaining: remaining })
}
