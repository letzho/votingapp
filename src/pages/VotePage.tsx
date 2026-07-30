import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { QrScanner } from '../components/QrScanner'
import { StarRating } from '../components/StarRating'
import { getCameraBlockedMessage, isCameraAllowed } from '../lib/cameraAccess'
import { parseGroupSlugFromQr } from '../lib/parseQrGroup'
import { supabase } from '../lib/supabase'
import { getClientIp, getDeviceFingerprint } from '../lib/fingerprint'
import { loadSession, clearSession, updateSessionVotes } from '../lib/session'
import type { VoterSession } from '../lib/supabase'

export function VotePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const groupSlug = searchParams.get('group')?.toLowerCase().trim() ?? ''

  const [session, setSession] = useState<VoterSession | null>(null)
  const [groupName, setGroupName] = useState('')
  const [stars, setStars] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

  useEffect(() => {
    const s = loadSession()
    if (!s) {
      if (groupSlug) {
        sessionStorage.setItem('returnAfterLogin', `/vote?group=${groupSlug}`)
      }
      navigate('/login')
      return
    }
    setSession(s)
    refreshStatus(s.voterId)
  }, [groupSlug, navigate])

  useEffect(() => {
    if (!groupSlug) return
    supabase
      .from('groups')
      .select('name')
      .eq('slug', groupSlug)
      .single()
      .then(({ data }) => {
        if (data) setGroupName(data.name)
      })
  }, [groupSlug])

  const refreshStatus = async (voterId: string) => {
    setLoading(true)
    try {
      const { data } = await supabase.rpc('get_voter_status', { p_voter_id: voterId })
      const result = data as {
        success: boolean
        voter_id?: string
        email?: string
        votes_used?: number
        votes_remaining?: number
      }
      if (result?.success) {
        const updated: VoterSession = {
          voterId: result.voter_id!,
          email: result.email!,
          votesUsed: result.votes_used ?? 0,
          votesRemaining: result.votes_remaining ?? 0,
        }
        setSession(updated)
        updateSessionVotes(updated.votesUsed, updated.votesRemaining)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!session || !groupSlug) return
    if (stars < 1) {
      setError('Please select a star rating.')
      return
    }
    if (session.votesRemaining <= 0) {
      setError('You have used all 3 votes.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const ip = await getClientIp()
      const fingerprint = getDeviceFingerprint()

      const { data, error: rpcError } = await supabase.rpc('submit_vote', {
        p_voter_id: session.voterId,
        p_group_slug: groupSlug,
        p_stars: stars,
        p_ip_address: ip,
        p_device_fingerprint: fingerprint,
      })

      if (rpcError) throw rpcError

      const result = data as {
        success: boolean
        error?: string
        group_name?: string
        stars?: number
        votes_used?: number
        votes_remaining?: number
      }

      if (!result.success) {
        setError(result.error ?? 'Vote failed')
        return
      }

      const updated: VoterSession = {
        ...session,
        votesUsed: result.votes_used ?? session.votesUsed + 1,
        votesRemaining: result.votes_remaining ?? 0,
      }
      setSession(updated)
      updateSessionVotes(updated.votesUsed, updated.votesRemaining)
      setSuccess(
        `Thank you! You rated ${result.group_name} ${result.stars} star${result.stars! > 1 ? 's' : ''}. ` +
          `${updated.votesRemaining} vote${updated.votesRemaining !== 1 ? 's' : ''} remaining.`
      )
      setStars(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = () => {
    clearSession()
    navigate('/login')
  }

  const handleQrScan = useCallback(
    async (text: string) => {
      setScanning(false)
      setScanError('')

      const slug = parseGroupSlugFromQr(text)
      if (!slug) {
        setScanError('Invalid QR code. Scan a booth QR that links to a team.')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('name')
        .eq('slug', slug)
        .single()

      if (fetchError || !data) {
        setScanError('Team not found. Please scan a valid booth QR code.')
        return
      }

      navigate(`/vote?group=${slug}`)
    },
    [navigate]
  )

  const handleScanAnother = () => {
    setStars(0)
    setError('')
    setSuccess('')
    setScanError('')
    navigate('/vote')
  }

  if (loading && !session) {
    return (
      <Layout>
        <div className="card center-text">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="vote-grid">
        <div className="card session-card">
          <h2>Your Voting Session</h2>
          <p className="session-email">{session?.email}</p>
          <div className="vote-counter">
            <span className="counter-used">{session?.votesUsed ?? 0}</span>
            <span className="counter-sep">/</span>
            <span className="counter-total">3</span>
            <p className="muted">votes used</p>
          </div>
          <p className="remaining-badge">
            {session?.votesRemaining ?? 0} vote{(session?.votesRemaining ?? 0) !== 1 ? 's' : ''} remaining
          </p>
          <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        <div className="card vote-card">
          {!groupSlug ? (
            <>
              <h2>Scan a Booth QR Code</h2>
              <p className="muted">
                Visit a student project booth, open the camera here, and scan the QR code on their display.
              </p>

              {scanError && <p className="error-msg">{scanError}</p>}

              <button
                type="button"
                className="btn btn-primary btn-wide"
                onClick={() => {
                  setScanError('')
                  if (!isCameraAllowed()) {
                    setScanError(getCameraBlockedMessage())
                    return
                  }
                  setScanning(true)
                }}
                disabled={(session?.votesRemaining ?? 0) <= 0}
              >
                Open Camera &amp; Scan QR
              </button>

              {(session?.votesRemaining ?? 0) <= 0 && (
                <p className="muted center-text">You have used all your votes. Thank you for participating!</p>
              )}
            </>
          ) : (
            <>
              <h2>Rate This Project</h2>
              <p className="group-name">{groupName || groupSlug}</p>
              <p className="muted">How would you rate this student project?</p>

              <StarRating value={stars} onChange={setStars} disabled={submitting || (session?.votesRemaining ?? 0) <= 0} />

              {error && <p className="error-msg">{error}</p>}
              {success && <p className="success-msg">{success}</p>}

              <button
                type="button"
                className="btn btn-primary btn-wide"
                onClick={handleSubmit}
                disabled={submitting || stars < 1 || (session?.votesRemaining ?? 0) <= 0}
              >
                {submitting ? 'Submitting…' : 'Submit Vote'}
              </button>

              {(session?.votesRemaining ?? 0) <= 0 && (
                <p className="muted center-text">You have used all your votes. Thank you for participating!</p>
              )}

              {(session?.votesRemaining ?? 0) > 0 && (
                <button type="button" className="btn btn-secondary btn-wide" onClick={handleScanAnother}>
                  Scan another booth
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {scanning && <QrScanner onScan={handleQrScan} onClose={() => setScanning(false)} />}
    </Layout>
  )
}
