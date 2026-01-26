'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CopyButton from './components/CopyButton'
import { withBasePath } from '@/lib/paths'

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

const STORAGE_KEY = 'rcv-last-options'

export default function CreateVotePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [customId, setCustomId] = useState('')
  const [customSecret, setCustomSecret] = useState('')
  const [voterNamesRequired, setVoterNamesRequired] = useState(true)
  const [autoCloseAt, setAutoCloseAt] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdVote, setCreatedVote] = useState<CreateVoteResponse | null>(null)

  // Load last used options from localStorage on mount
  useEffect(() => {
    try {
      const savedOptions = localStorage.getItem(STORAGE_KEY)
      if (savedOptions) {
        setOptionsText(savedOptions)
      }
    } catch (err) {
      // Ignore localStorage errors (e.g., disabled cookies)
    }
  }, [])

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
      const res = await fetch(withBasePath('/api/votes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          options,
          voteId: customId || undefined,
          writeSecret: customSecret || undefined,
          voterNamesRequired,
          autoCloseAt: autoCloseAt || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create vote')
        setLoading(false)
        return
      }

      // Save options to localStorage for next time
      try {
        localStorage.setItem(STORAGE_KEY, optionsText)
      } catch (err) {
        // Ignore localStorage errors
      }

      setCreatedVote(data)
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getFullUrl = (path: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${withBasePath(path)}`
    }
    return withBasePath(path)
  }

  if (createdVote) {
    const votePath = withBasePath(createdVote.voteUrl)
    const resultsPath = withBasePath(createdVote.resultsUrl)
    const adminUrl = withBasePath(`/v/${createdVote.vote.id}/admin`)
    const voteFullUrl = getFullUrl(votePath)
    const resultsFullUrl = getFullUrl(resultsPath)
    const adminFullUrl = getFullUrl(adminUrl)

    return (
      <div className="fade-in">
        <h1>Vote Created!</h1>

        <div className="card">
          <h2>{createdVote.vote.title}</h2>
          <p className="muted">{createdVote.vote.options.length} options</p>
        </div>

        <div className="secret-display">
          <p><strong>Write Secret (save this!):</strong></p>
          <div className="copyable-field">
            <span className="secret-value">{createdVote.writeSecret}</span>
            <CopyButton text={createdVote.writeSecret} label="Copy secret" />
          </div>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Share this secret with voters so they can submit ballots.
            You&apos;ll also need this to access the admin panel.
            This will only be shown once.
          </p>
        </div>

        <div className="card">
          <h2>Links</h2>
          <div style={{ marginBottom: '0.75rem' }}>
            <p><strong>Vote page:</strong></p>
            <div className="copyable-field">
              <a href={votePath} className="link-text">{voteFullUrl}</a>
              <CopyButton text={voteFullUrl} label="Copy vote URL" />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <p><strong>Results page:</strong></p>
            <div className="copyable-field">
              <a href={resultsPath} className="link-text">{resultsFullUrl}</a>
              <CopyButton text={resultsFullUrl} label="Copy results URL" />
            </div>
          </div>
          <div>
            <p><strong>Admin panel:</strong></p>
            <div className="copyable-field">
              <a href={adminUrl} className="link-text">{adminFullUrl}</a>
              <CopyButton text={adminFullUrl} label="Copy admin URL" />
            </div>
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              Use the write secret to access admin controls (delete vote, manage ballots, edit options).
            </p>
          </div>
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
              setVoterNamesRequired(true)
              setAutoCloseAt('')
            }}
          >
            Create Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
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
            placeholder="e.g., Team Lunch Decision"
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

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={voterNamesRequired}
              onChange={(e) => setVoterNamesRequired(e.target.checked)}
            />
            <span>Require voter names (recommended for coordination)</span>
          </label>
          <p className="muted">
            When enabled, voters must enter their name when submitting a ballot.
            When disabled, ballots are anonymous.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="autoCloseAt">Auto-close voting (optional)</label>
          <input
            type="datetime-local"
            id="autoCloseAt"
            value={autoCloseAt}
            onChange={(e) => setAutoCloseAt(e.target.value)}
          />
          <p className="muted">
            Automatically close voting at this date and time. Leave blank to keep voting open indefinitely.
          </p>
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
                placeholder="e.g., team-lunch"
              />
              <p className="muted">Lowercase letters, numbers, and dashes. Leave blank to auto-generate.</p>
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
