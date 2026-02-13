'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import CopyButton from './components/CopyButton'
import { withBasePath } from '@/lib/paths'

interface CreateVoteResponse {
  success: boolean
  vote: {
    id: string
    title: string
    options: string[]
  }
  adminSecret: string
  votingSecret: string
  writeSecret: string // Legacy field
  voteUrl: string
  resultsUrl: string
  error?: string
}

const STORAGE_KEY = 'rcv-last-options'

export default function CreateVotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [title, setTitle] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [customId, setCustomId] = useState('')
  const [customSecret, setCustomSecret] = useState('')
  const [voterNamesRequired, setVoterNamesRequired] = useState(true)
  const [autoCloseAt, setAutoCloseAt] = useState('')
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [periodDays, setPeriodDays] = useState('7')
  const [voteDurationHours, setVoteDurationHours] = useState('24')
  const [recurrenceStartAt, setRecurrenceStartAt] = useState('')
  const [recurrenceIdFormat, setRecurrenceIdFormat] = useState('{title}-{close-mm-dd-yyyy}')
  const [integrationId, setIntegrationId] = useState('')
  const [integrationAdminSecret, setIntegrationAdminSecret] = useState('')
  const [advancedTab, setAdvancedTab] = useState<'vote' | 'schedule' | 'notifications'>('vote')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdVote, setCreatedVote] = useState<CreateVoteResponse | null>(null)

  const toDateTimeLocal = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return ''
    }
    const offsetMs = parsed.getTimezoneOffset() * 60 * 1000
    return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16)
  }

  useEffect(() => {
    if (!searchParams) {
      return
    }

    const prefillTitle = searchParams.get('title')
    const prefillOptions = searchParams.get('options')
    const prefillVoterNamesRequired = searchParams.get('voterNamesRequired')
    const prefillAutoCloseAt = searchParams.get('autoCloseAt')
    const prefillRecurrenceEnabled = searchParams.get('recurrenceEnabled')
    const prefillPeriodDays = searchParams.get('periodDays')
    const prefillVoteDurationHours = searchParams.get('voteDurationHours')
    const prefillRecurrenceStartAt = searchParams.get('recurrenceStartAt')
    const prefillRecurrenceIdFormat = searchParams.get('recurrenceIdFormat')
    const prefillIntegrationId = searchParams.get('integrationId')

    if (prefillTitle !== null) {
      setTitle(prefillTitle)
    }
    if (prefillOptions !== null) {
      setOptionsText(prefillOptions)
    }
    if (prefillVoterNamesRequired !== null) {
      const normalized = prefillVoterNamesRequired.toLowerCase()
      setVoterNamesRequired(!(normalized === '0' || normalized === 'false' || normalized === 'no'))
    }
    if (prefillAutoCloseAt) {
      setAutoCloseAt(toDateTimeLocal(prefillAutoCloseAt))
      setAdvancedTab('schedule')
    }
    const isRecurring = prefillRecurrenceEnabled === '1'
      || prefillRecurrenceEnabled === 'true'
      || prefillRecurrenceEnabled === 'yes'
    if (prefillRecurrenceEnabled !== null) {
      setRecurrenceEnabled(isRecurring)
      if (isRecurring) {
        setAdvancedTab('schedule')
      }
    }
    if (prefillPeriodDays !== null) {
      setPeriodDays(prefillPeriodDays)
    }
    if (prefillVoteDurationHours !== null) {
      setVoteDurationHours(prefillVoteDurationHours)
    }
    if (prefillRecurrenceStartAt) {
      setRecurrenceStartAt(toDateTimeLocal(prefillRecurrenceStartAt))
    }
    if (prefillRecurrenceIdFormat !== null) {
      setRecurrenceIdFormat(prefillRecurrenceIdFormat)
    }
    if (prefillIntegrationId !== null) {
      setIntegrationId(prefillIntegrationId)
      if (!isRecurring && !prefillAutoCloseAt) {
        setAdvancedTab('notifications')
      }
    }
  }, [searchParams])

  // Load last used options from localStorage on mount
  useEffect(() => {
    try {
      const savedOptions = localStorage.getItem(STORAGE_KEY)
      const hasPrefillOptions = Boolean(searchParams?.get('options'))
      if (savedOptions && !hasPrefillOptions) {
        setOptionsText(savedOptions)
      }

    } catch (err) {
      // Ignore localStorage errors (e.g., disabled cookies)
    }
  }, [searchParams])

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

    let parsedPeriodDays: number | undefined
    let parsedVoteDurationHours: number | undefined
    let parsedRecurrenceStartAt: Date | undefined
    if (recurrenceEnabled) {
      if (!recurrenceStartAt) {
        setError('Start date/time is required for recurring votes.')
        setLoading(false)
        return
      }

      parsedRecurrenceStartAt = new Date(recurrenceStartAt)
      if (Number.isNaN(parsedRecurrenceStartAt.getTime())) {
        setError('Start date/time must be valid.')
        setLoading(false)
        return
      }

      parsedPeriodDays = Number.parseInt(periodDays, 10)
      if (!Number.isInteger(parsedPeriodDays) || parsedPeriodDays < 7) {
        setError('Recurring period must be at least 7 days.')
        setLoading(false)
        return
      }

      parsedVoteDurationHours = Number.parseInt(voteDurationHours, 10)
      if (!Number.isInteger(parsedVoteDurationHours) || parsedVoteDurationHours < 1) {
        setError('Vote duration must be at least 1 hour.')
        setLoading(false)
        return
      }
    }

    let parsedIntegrationId: number | undefined
    if (integrationId.trim()) {
      if (!integrationAdminSecret.trim()) {
        setError('Admin API secret is required to attach a Discord integration.')
        setLoading(false)
        return
      }

      parsedIntegrationId = Number.parseInt(integrationId, 10)
      if (!Number.isInteger(parsedIntegrationId) || parsedIntegrationId <= 0) {
        setError('Integration ID must be a positive integer.')
        setLoading(false)
        return
      }
    }

    try {
      const autoCloseIso = recurrenceEnabled && parsedRecurrenceStartAt && parsedVoteDurationHours
        ? new Date(parsedRecurrenceStartAt.getTime() + parsedVoteDurationHours * 60 * 60 * 1000).toISOString()
        : (autoCloseAt ? new Date(autoCloseAt).toISOString() : undefined)

      const res = await fetch(withBasePath('/api/votes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          options,
          voteId: customId || undefined,
          writeSecret: customSecret || undefined,
          voterNamesRequired,
          autoCloseAt: autoCloseIso,
          recurrenceEnabled: recurrenceEnabled || undefined,
          periodDays: recurrenceEnabled ? parsedPeriodDays : undefined,
          voteDurationHours: recurrenceEnabled ? parsedVoteDurationHours : undefined,
          integrationId: parsedIntegrationId,
          recurrenceStartAt: recurrenceEnabled ? parsedRecurrenceStartAt?.toISOString() : undefined,
          recurrenceIdFormat: recurrenceEnabled ? recurrenceIdFormat : undefined,
          integrationAdminSecret: parsedIntegrationId ? integrationAdminSecret.trim() : undefined,
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
    const voteUrlWithSecret = `${voteFullUrl}?secret=${encodeURIComponent(createdVote.votingSecret)}`

    const shareMessage = `Vote: ${createdVote.vote.title}
Submit your vote: ${voteUrlWithSecret}
View results: ${resultsFullUrl}`

    return (
      <div className="fade-in">
        <h1>Vote Created!</h1>

        <div className="card">
          <h2>{createdVote.vote.title}</h2>
          <p className="muted">{createdVote.vote.options.length} options</p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(0, 128, 0, 0.05)' }}>
          <h2>Share with Voters</h2>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            Copy this message to share with your group. The voting secret is included in the link.
          </p>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '1rem',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            marginBottom: '0.75rem'
          }}>
            {shareMessage}
          </div>
          <CopyButton text={shareMessage} label="Copy share message" />
        </div>

        <div className="secret-display">
          <p><strong>Admin Secret (save this!):</strong></p>
          <div className="copyable-field">
            <span className="secret-value">{createdVote.adminSecret}</span>
            <CopyButton text={createdVote.adminSecret} label="Copy admin secret" />
          </div>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Use this to access the admin panel (manage ballots, close voting, delete vote).
            This will only be shown once.
          </p>
        </div>

        <div className="secret-display">
          <p><strong>Voting Secret:</strong></p>
          <div className="copyable-field">
            <span className="secret-value">{createdVote.votingSecret}</span>
            <CopyButton text={createdVote.votingSecret} label="Copy voting secret" />
          </div>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Share this with voters so they can submit ballots. Already included in the share link above.
          </p>
        </div>

        <div className="card">
          <h2>Links</h2>
          <div style={{ marginBottom: '0.75rem' }}>
            <p><strong>Vote page (with secret):</strong></p>
            <div className="copyable-field">
              <a href={`${votePath}?secret=${encodeURIComponent(createdVote.votingSecret)}`} className="link-text" style={{ wordBreak: 'break-all' }}>{voteUrlWithSecret}</a>
              <CopyButton text={voteUrlWithSecret} label="Copy vote URL" />
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
              Use the admin secret to access admin controls.
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
              setRecurrenceEnabled(false)
              setPeriodDays('7')
              setVoteDurationHours('24')
              setRecurrenceStartAt('')
              setRecurrenceIdFormat('{title}-{close-mm-dd-yyyy}')
              setIntegrationId('')
              setIntegrationAdminSecret('')
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

        <div style={{ marginTop: '2rem', marginBottom: '1rem', paddingTop: '1.5rem', borderTop: '2px solid var(--border)' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Advanced Options</h2>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Customize your vote with scheduling, custom IDs, and notifications.
          </p>
        </div>

        <div className="card">
            <div className="tab-bar" role="tablist" aria-label="Advanced options">
              <button
                type="button"
                role="tab"
                aria-selected={advancedTab === 'vote'}
                className={`tab-button ${advancedTab === 'vote' ? 'tab-active' : ''}`}
                onClick={() => setAdvancedTab('vote')}
              >
                Vote
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={advancedTab === 'schedule'}
                className={`tab-button ${advancedTab === 'schedule' ? 'tab-active' : ''}`}
                onClick={() => setAdvancedTab('schedule')}
              >
                Schedule
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={advancedTab === 'notifications'}
                className={`tab-button ${advancedTab === 'notifications' ? 'tab-active' : ''}`}
                onClick={() => setAdvancedTab('notifications')}
              >
                Notifications
              </button>
            </div>

            {advancedTab === 'vote' && (
              <div role="tabpanel" aria-label="Vote settings">
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
                  <label htmlFor="customSecret">Custom Admin Secret (optional)</label>
                  <input
                    type="text"
                    id="customSecret"
                    value={customSecret}
                    onChange={(e) => setCustomSecret(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                  />
                  <p className="muted">
                    This secret is required to manage the vote (admin panel).
                    A separate voting secret will be auto-generated for ballot submission.
                  </p>
                </div>
              </div>
            )}

            {advancedTab === 'schedule' && (
              <div role="tabpanel" aria-label="Schedule settings">
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={recurrenceEnabled}
                      onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                    />
                    <span>Enable recurring votes</span>
                  </label>
                  <p className="muted">
                    Recurring votes automatically create a new vote after the previous one closes.
                  </p>
                </div>

                {!recurrenceEnabled && (
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
                )}

                {recurrenceEnabled && (
                  <>
                    <div className="form-group">
                      <label htmlFor="recurrenceStartAt">Start date &amp; time</label>
                      <input
                        type="datetime-local"
                        id="recurrenceStartAt"
                        className="input-large"
                        value={recurrenceStartAt}
                        onChange={(e) => setRecurrenceStartAt(e.target.value)}
                      />
                      <p className="muted">
                        The vote opens at this time and closes after the duration below.
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="recurrenceIdFormat">Contest ID format</label>
                      <input
                        type="text"
                        id="recurrenceIdFormat"
                        className="input-large"
                        value={recurrenceIdFormat}
                        onChange={(e) => setRecurrenceIdFormat(e.target.value)}
                        placeholder="{title}-{close-mm-dd-yyyy}"
                      />
                      <p className="muted">
                        Tokens: {'{title}'}, {'{close-mm-dd-yyyy}'}, {'{close-yyyy-mm-dd}'}, {'{start-mm-dd-yyyy}'}, {'{start-yyyy-mm-dd}'}.
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="periodDays">Repeat every (days)</label>
                      <input
                        type="number"
                        id="periodDays"
                        min={7}
                        step={1}
                        className="input-large"
                        value={periodDays}
                        onChange={(e) => setPeriodDays(e.target.value)}
                      />
                      <p className="muted">Minimum 7 days.</p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="voteDurationHours">Vote duration (hours)</label>
                      <input
                        type="number"
                        id="voteDurationHours"
                        min={1}
                        step={1}
                        className="input-large"
                        value={voteDurationHours}
                        onChange={(e) => setVoteDurationHours(e.target.value)}
                      />
                      <p className="muted">How long each recurring vote stays open.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {advancedTab === 'notifications' && (
              <div role="tabpanel" aria-label="Notification settings">
                <h3 style={{ marginTop: '0.5rem' }}>Discord Notifications (optional)</h3>
                <p className="muted" style={{ marginBottom: '0.75rem' }}>
                  Attach a Discord integration to post messages when the vote is created and when it closes.
                  Manage integrations on the System Admin page.
                </p>
                <p className="muted" style={{ marginBottom: '0.75rem' }}>
                  <Link href="/system">Go to System Admin</Link>
                </p>

                <div className="form-group">
                  <label htmlFor="integrationId">Discord Integration ID</label>
                  <input
                    type="number"
                    id="integrationId"
                    min={1}
                    step={1}
                    className="input-large"
                    value={integrationId}
                    onChange={(e) => setIntegrationId(e.target.value)}
                    placeholder="e.g., 1"
                  />
                  <p className="muted">
                    Use the integration ID from System Admin. Leave blank to skip notifications.
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="integrationAdminSecret">Admin API secret</label>
                  <input
                    type="password"
                    id="integrationAdminSecret"
                    value={integrationAdminSecret}
                    onChange={(e) => setIntegrationAdminSecret(e.target.value)}
                    placeholder="Enter ADMIN_SECRET to attach integration"
                    className="input-large"
                  />
                  <p className="muted">
                    Required when attaching an integration. This is the system ADMIN_SECRET, not the vote admin secret.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIntegrationId('')}
                    disabled={!integrationId}
                  >
                    Clear integration
                  </button>
                </div>
              </div>
            )}

          </div>

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Vote'}
        </button>
      </form>
    </div>
  )
}
