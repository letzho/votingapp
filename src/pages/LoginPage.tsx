import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { supabase, supabaseConfigError } from '../lib/supabase'
import { getClientIp, getDeviceFingerprint, isValidNypEmail } from '../lib/fingerprint'
import { saveSession } from '../lib/session'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isValidNypEmail(email)) {
      setError('Email must end with @mymail.nyp.edu.sg or @nyp.edu.sg')
      return
    }

    setLoading(true)
    try {
      if (supabaseConfigError) {
        setError(supabaseConfigError)
        return
      }

      const ip = await getClientIp()
      const fingerprint = getDeviceFingerprint()

      const { data, error: rpcError } = await supabase.rpc('sign_in_voter', {
        p_email: email.trim().toLowerCase(),
        p_device_fingerprint: fingerprint,
        p_ip_address: ip,
      })

      if (rpcError) {
        setError(rpcError.message || 'Sign in failed. Check Supabase settings on Vercel.')
        return
      }

      const result = data as {
        success: boolean
        error?: string
        voter_id?: string
        email?: string
        votes_used?: number
        votes_remaining?: number
      }

      if (!result.success) {
        setError(result.error ?? 'Sign in failed')
        return
      }

      saveSession({
        voterId: result.voter_id!,
        email: result.email!,
        votesUsed: result.votes_used ?? 0,
        votesRemaining: result.votes_remaining ?? 3,
      })

      const returnTo = sessionStorage.getItem('returnAfterLogin')
      sessionStorage.removeItem('returnAfterLogin')
      navigate(returnTo || '/')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Sign in failed. Check your connection.'
      setError(message.includes('Failed to fetch') ? 'Cannot reach Supabase. Check VITE_SUPABASE_URL on Vercel and redeploy.' : message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout showNav={false}>
    <div className="card auth-card">
      <h2>Sign in to Vote</h2>
      <p className="muted">
        Use your NYP email to vote. Each voter gets up to <strong>3 votes</strong> total.
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="email">NYP Email</label>
        <input
          id="email"
          type="email"
          placeholder="name@mymail.nyp.edu.sg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        {error && <p className="error-msg">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In & Continue'}
        </button>
      </form>

      <p className="fine-print">
        Your IP address and device fingerprint are recorded to prevent duplicate voting
        from the same device using multiple emails.
      </p>
    </div>
    </Layout>
  )
}
