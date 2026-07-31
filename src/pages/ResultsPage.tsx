import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase, type GroupTotal } from '../lib/supabase'

export function ResultsPage() {
  const [teams, setTeams] = useState<GroupTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchResults = async () => {
    setError('')
    const { data, error: fetchError } = await supabase
      .from('group_vote_totals')
      .select('*')
      .order('vote_count', { ascending: false })
      .order('name', { ascending: true })
      .limit(20)

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setTeams((data as GroupTotal[]) ?? [])
      setLastUpdated(new Date())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchResults()
    const interval = setInterval(fetchResults, 15000)
    return () => clearInterval(interval)
  }, [])

  const medal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  return (
    <Layout showNav={false}>
      <div className="card results-card">
        <div className="results-header">
          <div>
            <h2>Top 20 Teams</h2>
            <p className="muted">Ranked by number of votes</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={fetchResults} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {lastUpdated && (
          <p className="fine-print">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        )}

        {error && <p className="error-msg">{error}</p>}

        {loading && teams.length === 0 ? (
          <p className="center-text muted">Loading results…</p>
        ) : teams.length === 0 ? (
          <p className="center-text muted">No votes yet. Be the first to vote!</p>
        ) : (
          <div className="table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Booth</th>
                  <th>Votes</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => (
                  <tr key={team.id} className={index < 3 ? `top-${index + 1}` : ''}>
                    <td className="rank-cell">{medal(index + 1)}</td>
                    <td className="team-cell">{team.name}</td>
                    <td>{team.booth_number ?? '—'}</td>
                    <td>{team.vote_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
