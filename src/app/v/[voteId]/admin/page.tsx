'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Vote {
  id: string
  title: string
  options: string[]
  created_at: string
  closed_at: string | null
  ballotCount: number
}

interface Ballot {
  id: number
  rankings: string[]
  voter_name: string
  created_at: string
}

export default function AdminPage() {
  const params = useParams()
  const router = useRouter()
  const voteId = params.voteId as string

  const [authenticated, setAuthenticated] = useState(false)
  const [writeSecret, setWriteSecret] = useState('')
  const [vote, setVote] = useState<Vote | null>(null)
  const [ballots, setBallots] = useState<Ballot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingOptions, setEditingOptions] = useState(false)
  const [optionsText, setOptionsText] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Fetch vote data to verify
      const res = await fetch(`/api/votes/${voteId}`)
      if (!res.ok) {
        setError('Vote not found')
        setLoading(false)
        return
      }
      const voteData = await res.json()
      setVote(voteData)

      // Fetch ballots to verify secret
      const ballotsRes = await fetch(`/api/votes/${voteId}/ballots`, {
        headers: {
          'X-Write-Secret': writeSecret,
        },
      })

      if (!ballotsRes.ok) {
        setError('Invalid write secret')
        setLoading(false)
        return
      }

      const ballotsData = await ballotsRes.json()
      setBallots(ballotsData.ballots)
      setAuthenticated(true)
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVote = async () => {
    if (!confirm('Are you sure you want to delete this vote and all its ballots? This cannot be undone.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/votes/${voteId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writeSecret }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete vote')
        setLoading(false)
        return
      }

      alert('Vote deleted successfully')
      router.push('/')
    } catch (err) {
      setError('Network error')
      setLoading(false)
    }
  }

  const handleDeleteBallot = async (ballotId: number) => {
    if (!confirm('Are you sure you want to delete this ballot?')) {
      return
    }

    try {
      const res = await fetch(`/api/votes/${voteId}/ballots/${ballotId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writeSecret }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete ballot')
        return
      }

      // Remove ballot from list
      setBallots(ballots.filter((b) => b.id !== ballotId))

      // Update vote ballot count
      if (vote) {
        setVote({ ...vote, ballotCount: vote.ballotCount - 1 })
      }
    } catch (err) {
      setError('Network error')
    }
  }

  const handleToggleVoting = async () => {
    const action = vote?.closed_at ? 'reopen' : 'close'
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/votes/${voteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writeSecret, action }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update vote')
        setLoading(false)
        return
      }

      const data = await res.json()
      setVote(data.vote)
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOptions = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const options = optionsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (options.length < 2) {
      setError('At least 2 options are required')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/votes/${voteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writeSecret, action: 'updateOptions', options }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update options')
        setLoading(false)
        return
      }

      const data = await res.json()
      setVote(data.vote)
      setEditingOptions(false)

      // Reload ballots to see updated rankings
      const ballotsRes = await fetch(`/api/votes/${voteId}/ballots`, {
        headers: {
          'X-Write-Secret': writeSecret,
        },
      })
      if (ballotsRes.ok) {
        const ballotsData = await ballotsRes.json()
        setBallots(ballotsData.ballots)
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const startEditingOptions = () => {
    setOptionsText(vote?.options.join('\n') || '')
    setEditingOptions(true)
  }

  if (!authenticated) {
    return (
      <div className="fade-in">
        <h1>Admin Panel</h1>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          Enter the write secret to access admin controls for this vote.
        </p>

        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="writeSecret">Write Secret</label>
            <input
              type="password"
              id="writeSecret"
              value={writeSecret}
              onChange={(e) => setWriteSecret(e.target.value)}
              placeholder="Enter the write secret"
              required
            />
          </div>

          {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push(`/v/${voteId}`)}
            >
              Back to Vote
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (!vote) {
    return null
  }

  return (
    <div className="fade-in">
      <h1>Admin Panel: {vote.title}</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Manage your vote, ballots, and options.
      </p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Vote Status</h2>
        <p>
          <strong>ID:</strong> {vote.id}
        </p>
        <p>
          <strong>Created:</strong> {new Date(vote.created_at).toLocaleString()}
        </p>
        <p>
          <strong>Status:</strong>{' '}
          <span style={{ color: vote.closed_at ? 'var(--error)' : 'var(--success)' }}>
            {vote.closed_at ? 'Closed' : 'Open'}
          </span>
        </p>
        <p>
          <strong>Total Ballots:</strong> {vote.ballotCount}
        </p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleToggleVoting} disabled={loading}>
            {vote.closed_at ? 'Reopen Voting' : 'Close Voting'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => router.push(`/v/${voteId}/results`)}
          >
            View Results
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Options</h2>
        {!editingOptions ? (
          <>
            <ol style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
              {vote.options.map((option) => (
                <li key={option}>{option}</li>
              ))}
            </ol>
            <button onClick={startEditingOptions}>Edit Options</button>
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              Editing options will update future ballots and remove deleted options from existing ballots.
            </p>
          </>
        ) : (
          <form onSubmit={handleUpdateOptions}>
            <div className="form-group">
              <label htmlFor="options">Options (one per line)</label>
              <textarea
                id="options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={5}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Options'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingOptions(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Ballots ({ballots.length})</h2>
        {ballots.length === 0 ? (
          <p className="muted">No ballots submitted yet.</p>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {ballots.map((ballot) => (
              <div
                key={ballot.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>{ballot.voter_name || 'Anonymous'}</strong> (Ballot #{ballot.id}) -{' '}
                    <span className="muted">{new Date(ballot.created_at).toLocaleString()}</span>
                  </p>
                  <ol style={{ marginLeft: '1.5rem' }}>
                    {ballot.rankings.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ol>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => handleDeleteBallot(ballot.id)}
                  style={{ marginLeft: '1rem' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

      <div className="card" style={{ backgroundColor: 'rgba(255, 0, 0, 0.05)' }}>
        <h2 style={{ color: 'var(--error)' }}>Danger Zone</h2>
        <p style={{ marginBottom: '1rem' }}>
          Deleting this vote will permanently remove it and all its ballots. This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteVote}
          disabled={loading}
          style={{ backgroundColor: 'var(--error)' }}
        >
          Delete Vote Permanently
        </button>
      </div>
    </div>
  )
}
