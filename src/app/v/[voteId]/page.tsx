'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, redirect } from 'next/navigation'

interface Vote {
  id: string
  title: string
  options: string[]
  ballotCount: number
}

export default function VotePage() {
  const params = useParams()
  const router = useRouter()
  const voteId = params.voteId as string

  const [vote, setVote] = useState<Vote | null>(null)
  const [rankings, setRankings] = useState<string[]>([])
  const [unranked, setUnranked] = useState<string[]>([])
  const [writeSecret, setWriteSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // Redirect to lowercase if needed
  useEffect(() => {
    const lower = voteId.toLowerCase()
    if (voteId !== lower) {
      router.replace(`/v/${lower}`)
    }
  }, [voteId, router])

  // Fetch vote data
  useEffect(() => {
    if (voteId !== voteId.toLowerCase()) return

    const fetchVote = async () => {
      try {
        const res = await fetch(`/api/votes/${voteId}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Vote not found')
          } else {
            setError('Failed to load vote')
          }
          setLoading(false)
          return
        }
        const data = await res.json()
        setVote(data)
        setUnranked(data.options)
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }
    fetchVote()
  }, [voteId])

  const moveUp = (index: number) => {
    if (index === 0) return
    const newRankings = [...rankings]
    ;[newRankings[index - 1], newRankings[index]] = [newRankings[index], newRankings[index - 1]]
    setRankings(newRankings)
  }

  const moveDown = (index: number) => {
    if (index === rankings.length - 1) return
    const newRankings = [...rankings]
    ;[newRankings[index], newRankings[index + 1]] = [newRankings[index + 1], newRankings[index]]
    setRankings(newRankings)
  }

  const addToRankings = (option: string) => {
    setRankings([...rankings, option])
    setUnranked(unranked.filter((o) => o !== option))
  }

  const removeFromRankings = (option: string) => {
    setRankings(rankings.filter((o) => o !== option))
    setUnranked([...unranked, option])
  }

  // Drag and drop handlers
  const handleDragStart = (option: string) => {
    setDraggedItem(option)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropOnRanked = (targetIndex: number) => {
    if (!draggedItem) return

    const fromRankedIndex = rankings.indexOf(draggedItem)
    const fromUnranked = unranked.includes(draggedItem)

    if (fromRankedIndex !== -1) {
      // Reordering within rankings
      const newRankings = [...rankings]
      newRankings.splice(fromRankedIndex, 1)
      newRankings.splice(targetIndex, 0, draggedItem)
      setRankings(newRankings)
    } else if (fromUnranked) {
      // Moving from unranked to rankings
      setUnranked(unranked.filter((o) => o !== draggedItem))
      const newRankings = [...rankings]
      newRankings.splice(targetIndex, 0, draggedItem)
      setRankings(newRankings)
    }

    setDraggedItem(null)
  }

  const handleDropOnUnranked = () => {
    if (!draggedItem) return

    if (rankings.includes(draggedItem)) {
      setRankings(rankings.filter((o) => o !== draggedItem))
      setUnranked([...unranked, draggedItem])
    }

    setDraggedItem(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rankings.length === 0) {
      setError('Please rank at least one option')
      return
    }

    if (!writeSecret.trim()) {
      setError('Write secret is required')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`/api/votes/${voteId}/ballots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankings,
          writeSecret: writeSecret.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit ballot')
        setSubmitting(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p>Loading...</p>
  }

  if (error && !vote) {
    return (
      <div>
        <h1>Error</h1>
        <p className="error">{error}</p>
        <button onClick={() => router.push('/')}>Create a New Vote</button>
      </div>
    )
  }

  if (!vote) {
    return null
  }

  if (success) {
    return (
      <div>
        <h1>Ballot Submitted!</h1>
        <div className="card">
          <p className="success">Your vote has been recorded.</p>
          <h2 style={{ marginTop: '1rem' }}>Your Rankings:</h2>
          <ol style={{ marginLeft: '1.5rem' }}>
            {rankings.map((opt) => (
              <li key={opt}>{opt}</li>
            ))}
          </ol>
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => router.push(`/v/${voteId}/results`)}>
            View Results
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setSuccess(false)
              setRankings([])
              setUnranked(vote.options)
              setWriteSecret('')
            }}
          >
            Submit Another Ballot
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1>{vote.title}</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        {vote.ballotCount} ballot{vote.ballotCount !== 1 ? 's' : ''} submitted
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2>Your Rankings</h2>
          <p className="muted" style={{ marginBottom: '0.5rem' }}>
            Drag options here or click + to add. Your top choice should be #1.
          </p>

          <div
            className="card"
            onDragOver={handleDragOver}
            onDrop={() => handleDropOnRanked(rankings.length)}
            style={{ minHeight: '100px' }}
          >
            {rankings.length === 0 ? (
              <p className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
                Click options below to rank them
              </p>
            ) : (
              <ul className="option-list">
                {rankings.map((option, index) => (
                  <li
                    key={option}
                    className={`option-item ${draggedItem === option ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(option)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      e.stopPropagation()
                      handleDropOnRanked(index)
                    }}
                  >
                    <span className="option-rank">{index + 1}</span>
                    <span className="option-name">{option}</span>
                    <div className="option-buttons">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === rankings.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromRankings(option)}
                        className="btn-secondary"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {unranked.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2>Available Options</h2>
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              Click to add to your rankings. Partial ranking is allowed.
            </p>

            <div
              className="card"
              onDragOver={handleDragOver}
              onDrop={handleDropOnUnranked}
            >
              <ul className="option-list">
                {unranked.map((option) => (
                  <li
                    key={option}
                    className={`option-item ${draggedItem === option ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(option)}
                    onClick={() => addToRankings(option)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="option-name">{option}</span>
                    <button type="button" title="Add to rankings">
                      +
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="writeSecret">Write Secret</label>
          <input
            type="password"
            id="writeSecret"
            value={writeSecret}
            onChange={(e) => setWriteSecret(e.target.value)}
            placeholder="Enter the secret to submit your ballot"
            required
          />
          <p className="muted">The vote creator should have shared this with you.</p>
        </div>

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={submitting || rankings.length === 0}>
            {submitting ? 'Submitting...' : 'Submit Ballot'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push(`/v/${voteId}/results`)}
          >
            View Results
          </button>
        </div>
      </form>
    </div>
  )
}
