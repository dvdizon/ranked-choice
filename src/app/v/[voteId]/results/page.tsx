'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { withBasePath } from '@/lib/paths'

interface RoundResult {
  round: number
  tallies: Record<string, number>
  activeBallotCount: number
  eliminated: string | null
  winner: string | null
  isTie: boolean
  tiedOptions?: string[]
}

interface Results {
  winner: string | null
  isTie: boolean
  tiedOptions: string[]
  totalBallots: number
  rounds: RoundResult[]
}

interface Vote {
  id: string
  title: string
  options: string[]
}

interface Ballot {
  voter_name: string
  rankings: string[]
  created_at: string
}

interface ResultsData {
  vote: Vote
  results: Results
  ballots: Ballot[]
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const voteId = params.voteId as string

  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Redirect to lowercase if needed
  useEffect(() => {
    const lower = voteId.toLowerCase()
    if (voteId !== lower) {
      router.replace(withBasePath(`/v/${lower}/results`))
    }
  }, [voteId, router])

  // Fetch results
  useEffect(() => {
    if (voteId !== voteId.toLowerCase()) return

    const fetchResults = async () => {
      try {
        const res = await fetch(withBasePath(`/api/votes/${voteId}/results`))
        if (!res.ok) {
          if (res.status === 404) {
            setError('Vote not found')
          } else {
            setError('Failed to load results')
          }
          setLoading(false)
          return
        }
        const data = await res.json()
        setData(data)
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [voteId])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(withBasePath(`/api/votes/${voteId}/results`))
      if (res.ok) {
        const data = await res.json()
        setData(data)
      }
    } catch (err) {
      // Silent fail on refresh
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="loading-container">
        <div className="loading-skeleton">
          <div className="skeleton-title"></div>
          <div className="skeleton-text"></div>
          <div className="skeleton-card" style={{ height: '150px' }}></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="fade-in">
        <h1>Error</h1>
        <p className="error">{error}</p>
        <button onClick={() => router.push(withBasePath('/'))}>Create a New Vote</button>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { vote, results, ballots } = data
  const maxVotes = Math.max(
    ...results.rounds.flatMap((r) => Object.values(r.tallies)),
    1
  )

  return (
    <div className="fade-in">
      <h1>{vote.title}</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Results • {results.totalBallots} ballot{results.totalBallots !== 1 ? 's' : ''} cast
      </p>

      {/* Winner or Tie */}
      {results.totalBallots === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="muted">No ballots have been submitted yet.</p>
        </div>
      ) : results.isTie ? (
        <div className="card tie-card">
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>It&apos;s a Tie!</p>
          <p className="winner-name" style={{ color: '#856404' }}>
            {results.tiedOptions.join(' & ')}
          </p>
        </div>
      ) : (
        <div className="card winner-card">
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Winner</p>
          <p className="winner-name">{results.winner}</p>
        </div>
      )}

      {/* Round-by-round breakdown */}
      {results.rounds.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Round-by-Round Breakdown</h2>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            IRV eliminates the lowest-voted option each round until one has &gt;50%.
          </p>

          {results.rounds.map((round) => (
            <div key={round.round} className="round-card">
              <div className="round-header">
                <h3>Round {round.round}</h3>
                <span className="muted">
                  {round.activeBallotCount} active ballot{round.activeBallotCount !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="round-tallies">
                {Object.entries(round.tallies)
                  .sort(([, a], [, b]) => b - a)
                  .map(([option, votes]) => {
                    const percentage = round.activeBallotCount > 0
                      ? (votes / round.activeBallotCount) * 100
                      : 0
                    const isWinner = round.winner === option
                    const isEliminated = round.eliminated === option

                    return (
                      <div key={option} className="tally-bar">
                        <span
                          className="tally-name"
                          style={{
                            textDecoration: isEliminated ? 'line-through' : 'none',
                            color: isEliminated ? 'var(--muted)' : 'inherit',
                          }}
                        >
                          {option}
                        </span>
                        <div
                          className="tally-bar-fill"
                          style={{
                            width: `${(votes / maxVotes) * 150}px`,
                            background: isWinner
                              ? 'var(--success)'
                              : isEliminated
                              ? '#dc354555'
                              : 'var(--accent)',
                          }}
                        />
                        <span className="tally-count">
                          {votes} ({percentage.toFixed(1)}%)
                        </span>
                        {isWinner && <span className="winner-badge">Winner</span>}
                      </div>
                    )
                  })}
              </div>

              {round.eliminated && (
                <p className="eliminated">
                  Eliminated: <strong>{round.eliminated}</strong>
                </p>
              )}

              {round.isTie && round.tiedOptions && (
                <p style={{ color: '#856404' }}>
                  Tie declared: <strong>{round.tiedOptions.join(', ')}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ballots section */}
      {ballots && ballots.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>All Ballots</h2>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            See who voted and their rankings.
          </p>
          <div className="card">
            {ballots.map((ballot, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  borderBottom: index < ballots.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>{ballot.voter_name || 'Anonymous'}</strong> -{' '}
                  <span className="muted">{new Date(ballot.created_at).toLocaleString()}</span>
                </p>
                <ol style={{ marginLeft: '1.5rem', marginBottom: 0 }}>
                  {ballot.rankings.map((option) => (
                    <li key={option}>{option}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Results'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => router.push(withBasePath(`/v/${voteId}`))}
        >
          Submit a Ballot
        </button>
        <button
          className="btn-secondary"
          onClick={() => router.push(withBasePath('/'))}
        >
          Create New Vote
        </button>
      </div>
    </div>
  )
}
