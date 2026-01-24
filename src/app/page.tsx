'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CreateVoteResponse {
  success: boolean
  vote: {
    id: string
    title: string
    options: string[]
  }
  writeSecret: string
  voteUrl: string
  resultsUrl: string
  error?: string
}

export default function CreateVotePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [customId, setCustomId] = useState('')
  const [customSecret, setCustomSecret] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdVote, setCreatedVote] = useState<CreateVoteResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const options = optionsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (options.length < 2) {
      setError('Please enter at least 2 options (one per line)')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          options,
          voteId: customId || undefined,
          writeSecret: customSecret || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create vote')
        setLoading(false)
        return
      }

      setCreatedVote(data)
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (createdVote) {
    return (
      <div>
        <h1>Vote Created!</h1>

        <div className="card">
          <h2>{createdVote.vote.title}</h2>
          <p className="muted">{createdVote.vote.options.length} options</p>
        </div>

        <div className="secret-display">
          <p><strong>Write Secret (save this!):</strong></p>
          <p className="secret-value">{createdVote.writeSecret}</p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Share this secret with voters so they can submit ballots.
            This will only be shown once.
          </p>
        </div>

        <div className="card">
          <h2>Links</h2>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Vote page:</strong>{' '}
            <a href={createdVote.voteUrl}>{window.location.origin}{createdVote.voteUrl}</a>
          </p>
          <p>
            <strong>Results page:</strong>{' '}
            <a href={createdVote.resultsUrl}>{window.location.origin}{createdVote.resultsUrl}</a>
          </p>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => router.push(createdVote.voteUrl)}>
            Go to Vote Page
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setCreatedVote(null)
              setTitle('')
              setOptionsText('')
              setCustomId('')
              setCustomSecret('')
            }}
          >
            Create Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1>Create a New Vote</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Use ranked choice voting to decide where to eat (or anything else).
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Vote Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Friday Lunch"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="options">Options (one per line)</label>
          <textarea
            id="options"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="Pizza Palace&#10;Sushi Supreme&#10;Taco Town&#10;Burger Barn"
            rows={5}
            required
          />
          <p className="muted">Enter at least 2 options, one per line.</p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ background: 'transparent', color: 'var(--accent)', padding: 0 }}
          >
            {showAdvanced ? '- Hide' : '+ Show'} advanced options
          </button>
        </div>

        {showAdvanced && (
          <div className="card">
            <div className="form-group">
              <label htmlFor="customId">Custom Vote ID (optional)</label>
              <input
                type="text"
                id="customId"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="e.g., friday-lunch"
              />
              <p className="muted">Lowercase letters and numbers only. Leave blank to auto-generate.</p>
            </div>

            <div className="form-group">
              <label htmlFor="customSecret">Custom Write Secret (optional)</label>
              <input
                type="text"
                id="customSecret"
                value={customSecret}
                onChange={(e) => setCustomSecret(e.target.value)}
                placeholder="Leave blank to auto-generate"
              />
              <p className="muted">
                This secret is required to submit ballots.
                Leave blank to auto-generate a secure one.
              </p>
            </div>
          </div>
        )}

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Vote'}
        </button>
      </form>
    </div>
  )
}
