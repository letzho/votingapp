import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { QrScanner } from '../components/QrScanner'
import { StarRating } from '../components/StarRating'
import { getCameraBlockedMessage, isCameraAllowed } from '../lib/cameraAccess'
import { resolveGroupFromQr } from '../lib/resolveGroupFromQr'
import { clearScannedGroup, loadScannedGroup, saveScannedGroup, type ScannedGroup } from '../lib/scannedGroup'
import { supabase } from '../lib/supabase'
import { getClientIp, getDeviceFingerprint } from '../lib/fingerprint'
import { loadSession, clearSession, updateSessionVotes } from '../lib/session'
import type { VoterSession } from '../lib/supabase'

export function VotePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [session, setSession] = useState<VoterSession | null>(null)
  const [scannedTeam, setScannedTeam] = useState<ScannedGroup | null>(null)
  const [stars, setStars] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

  // Block manual URL entry like /vote?group=team-alpha — voting is scan-only
  useEffect(() => {
    if (searchParams.get('group')) {
      navigate('/vote', { replace: true })
    }
  }, [searchParams, navigate])

  useEffect(() => {
    const s = loadSession()
    if (!s) {
      navigate('/login')
      return
    }
    setSession(s)
    setScannedTeam(loadScannedGroup())
    refreshStatus(s.voterId)
  }, [navigate])

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
    if (!session || !scannedTeam) return
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
        p_group_slug: scannedTeam.slug,
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
      clearScannedGroup()
      setScannedTeam(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = () => {
    clearSession()
    clearScannedGroup()
    navigate('/login')
  }

  const handleQrScan = useCallback(async (text: string) => {
    setScanning(false)
    setScanError('')
    setError('')
    setSuccess('')
    setResolving(true)

    try {
      const team = await resolveGroupFromQr(text)
      if (!team) {
        setScanError('Team not found. Scan an official booth QR code with a valid team slug.')
        return
      }

      saveScannedGroup(team)
      setScannedTeam({ ...team, scannedAt: new Date().toISOString() })
      setStars(0)
    } finally {
      setResolving(false)
    }
  }, [])

  const handleScanAnother = () => {
    setStars(0)
    setError('')
    setSuccess('')
    setScanError('')
    clearScannedGroup()
    setScannedTeam(null)
  }

  const openScanner = () => {
    setScanError('')
    if (!isCameraAllowed()) {
      setScanError(getCameraBlockedMessage())
      return
    }
    setScanning(true)
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
          {resolving ? (
            <>
              <h2>Reading QR Code…</h2>
              <p className="muted center-text">Looking up the team in the event database.</p>
            </>
          ) : !scannedTeam ? (
            <>
              <h2>Scan a Booth QR Code</h2>
              <p className="muted">
                You must scan the official QR code at a booth to vote. Teams are matched by QR slug only.
              </p>

              {scanError && <p className="error-msg">{scanError}</p>}

              <button
                type="button"
                className="btn btn-primary btn-wide"
                onClick={openScanner}
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
              <h2>Confirm Your Vote</h2>

              <div className="team-detected">
                <p className="team-detected-label">Scanned team</p>
                <p className="team-detected-name">{scannedTeam.name}</p>
                <p className="muted">Please confirm this is the booth you are at, then rate the project.</p>
              </div>

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
                  Scan a different booth
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
