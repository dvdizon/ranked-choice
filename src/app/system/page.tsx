'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { withBasePath } from '@/lib/paths'
import CopyButton from '@/app/components/CopyButton'

interface IntegrationSummary {
  id: number
  name: string
  type: 'discord' | 'slack' | 'webhook'
}

interface LiveVoteSummary {
  id: string
  title: string
  options: string[]
  write_secret_plaintext: string | null
  created_at: string
  closed_at: string | null
  auto_close_at: string | null
  voter_names_required: boolean
  period_days: number | null
  vote_duration_hours: number | null
  recurrence_start_at: string | null
  recurrence_group_id: string | null
  integration_id: number | null
  recurrence_active: boolean
}

const WEBHOOK_STORAGE_KEY = 'rcv-discord-webhook-url'
const NAME_STORAGE_KEY = 'rcv-discord-integration-name'
const LIVE_VOTES_PAGE_SIZE = 10

export default function SystemAdminPage() {
  const [integrationAdminSecret, setIntegrationAdminSecret] = useState('')
  const [adminSecretValidated, setAdminSecretValidated] = useState(false)
  const [adminSecretValidationLoading, setAdminSecretValidationLoading] = useState(false)
  const [adminSecretValidationError, setAdminSecretValidationError] = useState('')
  const [integrationId, setIntegrationId] = useState('')
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([])
  const [integrationsLoading, setIntegrationsLoading] = useState(false)
  const [integrationsError, setIntegrationsError] = useState('')
  const [integrationName, setIntegrationName] = useState('')
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('')
  const [integrationCreateLoading, setIntegrationCreateLoading] = useState(false)
  const [integrationCreateError, setIntegrationCreateError] = useState('')
  const [integrationDeleteLoading, setIntegrationDeleteLoading] = useState(false)
  const [integrationDeleteError, setIntegrationDeleteError] = useState('')
  const [integrationTestLoading, setIntegrationTestLoading] = useState(false)
  const [integrationTestError, setIntegrationTestError] = useState('')
  const [integrationTestSuccess, setIntegrationTestSuccess] = useState('')
  const [integrationTestEventType, setIntegrationTestEventType] = useState('vote_opened')
  const [liveVotes, setLiveVotes] = useState<LiveVoteSummary[]>([])
  const [liveVotesLoading, setLiveVotesLoading] = useState(false)
  const [liveVotesError, setLiveVotesError] = useState('')
  const [liveVotesPage, setLiveVotesPage] = useState(1)
  const [liveVotesTotalPages, setLiveVotesTotalPages] = useState(1)
  const [liveVotesTotal, setLiveVotesTotal] = useState(0)

  useEffect(() => {
    try {
      const savedWebhook = localStorage.getItem(WEBHOOK_STORAGE_KEY)
      if (savedWebhook) {
        setDiscordWebhookUrl(savedWebhook)
      }

      const savedIntegrationName = localStorage.getItem(NAME_STORAGE_KEY)
      if (savedIntegrationName) {
        setIntegrationName(savedIntegrationName)
      }
    } catch (err) {
      // Ignore localStorage errors
    }
  }, [])

  const loadLiveVotes = async (page: number = liveVotesPage) => {
    if (!integrationAdminSecret.trim()) {
      setLiveVotesError('Admin API secret is required to load live votes.')
      return
    }

    setLiveVotesError('')
    setLiveVotesLoading(true)

    try {
      const res = await fetch(withBasePath(`/api/admin/votes?page=${page}&pageSize=${LIVE_VOTES_PAGE_SIZE}`), {
        headers: {
          Authorization: `Bearer ${integrationAdminSecret.trim()}`,
        },
      })
      const data = await res.json()

      if (!res.ok) {
        setLiveVotesError(data.error || 'Failed to load live votes')
        setLiveVotesLoading(false)
        return
      }

      const loadedVotes = Array.isArray(data.votes) ? data.votes : []
      const totalPages = Number.isFinite(Number(data.totalPages)) ? Number(data.totalPages) : 1
      const totalVotes = Number.isFinite(Number(data.total)) ? Number(data.total) : loadedVotes.length
      const currentPage = Number.isFinite(Number(data.page)) ? Number(data.page) : page

      setLiveVotes(loadedVotes)
      setLiveVotesPage(currentPage)
      setLiveVotesTotalPages(totalPages)
      setLiveVotesTotal(totalVotes)
    } catch (err) {
      setLiveVotesError('Network error while loading live votes.')
    } finally {
      setLiveVotesLoading(false)
    }
  }

  const loadIntegrations = async () => {
    if (!integrationAdminSecret.trim()) {
      setIntegrationsError('Admin API secret is required to load integrations.')
      return
    }

    setIntegrationsError('')
    setIntegrationsLoading(true)

    try {
      const res = await fetch(withBasePath('/api/integrations'), {
        headers: {
          Authorization: `Bearer ${integrationAdminSecret.trim()}`,
        },
      })
      const data = await res.json()

      if (!res.ok) {
        setIntegrationsError(data.error || 'Failed to load integrations')
        setIntegrationsLoading(false)
        return
      }

      const loaded: IntegrationSummary[] = Array.isArray(data.integrations)
        ? data.integrations.map((integration: any) => ({
            id: integration.id,
            name: integration.name,
            type: integration.type,
          }))
        : []

      setIntegrations(loaded)
      if (loaded.length === 0) {
        setIntegrationsError('No integrations found.')
      }
    } catch (err) {
      setIntegrationsError('Network error while loading integrations.')
    } finally {
      setIntegrationsLoading(false)
    }
  }

  const validateAdminSecret = async () => {
    if (!integrationAdminSecret.trim()) {
      setAdminSecretValidationError('Admin API secret is required.')
      return
    }

    setAdminSecretValidationError('')
    setAdminSecretValidationLoading(true)

    try {
      const res = await fetch(withBasePath('/api/integrations'), {
        headers: {
          Authorization: `Bearer ${integrationAdminSecret.trim()}`,
        },
      })
      const data = await res.json()
      if (!res.ok) {
        setAdminSecretValidationError(data.error || 'Failed to validate admin secret')
        setAdminSecretValidationLoading(false)
        return
      }

      setAdminSecretValidated(true)
      setLiveVotesPage(1)
      const loaded: IntegrationSummary[] = Array.isArray(data.integrations)
        ? data.integrations.map((integration: any) => ({
            id: integration.id,
            name: integration.name,
            type: integration.type,
          }))
        : []
      setIntegrations(loaded)
      if (loaded.length === 0) {
        setIntegrationsError('No integrations found.')
      } else {
        setIntegrationsError('')
      }
      await loadLiveVotes(1)
    } catch (err) {
      setAdminSecretValidationError('Network error while validating admin secret.')
    } finally {
      setAdminSecretValidationLoading(false)
    }
  }

  const createDiscordIntegration = async () => {
    if (!integrationAdminSecret.trim()) {
      setIntegrationCreateError('Admin API secret is required to create integrations.')
      return
    }

    if (!integrationName.trim()) {
      setIntegrationCreateError('Integration name is required.')
      return
    }

    if (!discordWebhookUrl.trim()) {
      setIntegrationCreateError('Discord webhook URL is required.')
      return
    }

    setIntegrationCreateError('')
    setIntegrationCreateLoading(true)

    try {
      const res = await fetch(withBasePath('/api/integrations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${integrationAdminSecret.trim()}`,
        },
        body: JSON.stringify({
          type: 'discord',
          name: integrationName.trim(),
          config: {
            webhook_url: discordWebhookUrl.trim(),
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setIntegrationCreateError(data.error || 'Failed to create integration')
        setIntegrationCreateLoading(false)
        return
      }

      if (data.integration?.id) {
        setIntegrationId(String(data.integration.id))
      }

      try {
        localStorage.setItem(WEBHOOK_STORAGE_KEY, discordWebhookUrl.trim())
        localStorage.setItem(NAME_STORAGE_KEY, integrationName.trim())
      } catch (err) {
        // Ignore localStorage errors
      }

      await loadIntegrations()
    } catch (err) {
      setIntegrationCreateError('Network error while creating integration.')
    } finally {
      setIntegrationCreateLoading(false)
    }
  }

  const deleteSelectedIntegration = async () => {
    if (!adminSecretValidated) {
      setIntegrationDeleteError('Admin secret validation is required.')
      return
    }

    if (!integrationId.trim()) {
      setIntegrationDeleteError('Select an integration to remove.')
      return
    }

    const confirmed = window.confirm('Delete this Discord integration? This cannot be undone.')
    if (!confirmed) {
      return
    }

    setIntegrationDeleteError('')
    setIntegrationDeleteLoading(true)

    try {
      const res = await fetch(withBasePath(`/api/integrations/${integrationId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${integrationAdminSecret.trim()}`,
        },
      })
      const data = await res.json()
      if (!res.ok) {
        setIntegrationDeleteError(data.error || 'Failed to delete integration')
        setIntegrationDeleteLoading(false)
        return
      }

      setIntegrationId('')
      await loadIntegrations()
    } catch (err) {
      setIntegrationDeleteError('Network error while deleting integration.')
    } finally {
      setIntegrationDeleteLoading(false)
    }
  }

  const sendTestNotification = async () => {
    if (!adminSecretValidated) {
      setIntegrationTestError('Admin secret validation is required.')
      return
    }

    if (!integrationId.trim()) {
      setIntegrationTestError('Select an integration to test.')
      return
    }

    setIntegrationTestError('')
    setIntegrationTestSuccess('')
    setIntegrationTestLoading(true)

    try {
      const res = await fetch(withBasePath(`/api/integrations/${integrationId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${integrationAdminSecret.trim()}`,
        },
        body: JSON.stringify({
          eventType: integrationTestEventType,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setIntegrationTestError(data.error || 'Failed to send test notification')
        setIntegrationTestLoading(false)
        return
      }

      setIntegrationTestSuccess('Test notification sent.')
    } catch (err) {
      setIntegrationTestError('Network error while sending test notification.')
    } finally {
      setIntegrationTestLoading(false)
    }
  }


  const updateLiveVote = async (voteId: string, action: 'close' | 'reopen') => {
    if (!adminSecretValidated) {
      setLiveVotesError('Admin secret validation is required.')
      return
    }

    const messages = {
      close: 'Close this vote? Voting will immediately stop.',
      reopen: 'Reopen this vote? Existing ballots will remain intact.'
    } as const

    const confirmed = window.confirm(messages[action])
    if (!confirmed) {
      return
    }

    setLiveVotesError('')
    setLiveVotesLoading(true)

    try {
      const res = await fetch(withBasePath(`/api/admin/votes/${voteId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${integrationAdminSecret.trim()}`,
        },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLiveVotesError(data.error || `Failed to ${action} vote`)
        setLiveVotesLoading(false)
        return
      }

      await loadLiveVotes(liveVotesPage)
    } catch (err) {
      setLiveVotesError(`Network error while attempting to ${action} vote.`)
    } finally {
      setLiveVotesLoading(false)
    }
  }

  const deleteLiveVote = async (voteId: string) => {
    if (!adminSecretValidated) {
      setLiveVotesError('Admin secret validation is required.')
      return
    }

    const confirmed = window.confirm('Delete this vote? This will remove all ballots and cannot be undone.')
    if (!confirmed) {
      return
    }

    setLiveVotesError('')
    setLiveVotesLoading(true)

    try {
      const res = await fetch(withBasePath(`/api/admin/votes/${voteId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${integrationAdminSecret.trim()}`,
        },
      })
      const data = await res.json()
      if (!res.ok) {
        setLiveVotesError(data.error || 'Failed to delete vote')
        setLiveVotesLoading(false)
        return
      }

      const nextPage = liveVotes.length === 1 && liveVotesPage > 1 ? liveVotesPage - 1 : liveVotesPage
      setLiveVotesPage(nextPage)
      await loadLiveVotes(nextPage)
    } catch (err) {
      setLiveVotesError('Network error while deleting vote.')
    } finally {
      setLiveVotesLoading(false)
    }
  }

  const getVoteRecreateHref = (vote: LiveVoteSummary) => {
    const params = new URLSearchParams()
    params.set('title', vote.title)
    params.set('options', vote.options.join('\n'))
    params.set('voterNamesRequired', vote.voter_names_required ? '1' : '0')
    if (vote.auto_close_at) {
      params.set('autoCloseAt', vote.auto_close_at)
    }
    if (vote.period_days && vote.vote_duration_hours) {
      params.set('recurrenceEnabled', '1')
      params.set('periodDays', String(vote.period_days))
      params.set('voteDurationHours', String(vote.vote_duration_hours))
    }
    if (vote.recurrence_start_at) {
      params.set('recurrenceStartAt', vote.recurrence_start_at)
    }
    if (vote.integration_id) {
      params.set('integrationId', String(vote.integration_id))
    }
    return `/?${params.toString()}`
  }

  return (
    <div className="fade-in">
      <h1>System Admin</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Manage system-wide integrations for notifications. Use the integration ID on the create vote page to attach
        notifications to a vote.
      </p>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Admin API Access</h2>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          Enter the system ADMIN_SECRET to manage integrations.
        </p>
        <div className="form-group">
          <label htmlFor="integrationAdminSecret">Admin API secret</label>
          <input
            type="password"
            id="integrationAdminSecret"
            value={integrationAdminSecret}
            onChange={(e) => {
              setIntegrationAdminSecret(e.target.value)
              setAdminSecretValidated(false)
              setIntegrations([])
              setIntegrationsError('')
              setIntegrationId('')
              setLiveVotes([])
              setLiveVotesError('')
              setLiveVotesPage(1)
              setLiveVotesTotalPages(1)
              setLiveVotesTotal(0)
            }}
            placeholder="Enter ADMIN_SECRET"
            className="input-large"
          />
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={validateAdminSecret}
              disabled={adminSecretValidationLoading}
            >
              {adminSecretValidationLoading ? 'Validating...' : 'Validate admin secret'}
            </button>
          </div>
          {adminSecretValidationError && (
            <p className="error" style={{ marginTop: '0.5rem' }}>{adminSecretValidationError}</p>
          )}
        </div>
      </div>

      {adminSecretValidated && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Votes</h2>
            <p className="muted" style={{ marginBottom: '0.75rem' }}>
              Monitor and manage open or closed votes without individual admin secrets.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => loadLiveVotes(1)}
                disabled={liveVotesLoading}
              >
                {liveVotesLoading ? 'Loading...' : 'Refresh votes'}
              </button>
              <p className="muted" style={{ margin: 0 }}>
                Showing {liveVotes.length} of {liveVotesTotal} vote{liveVotesTotal === 1 ? '' : 's'}.
              </p>
            </div>

            {liveVotesError && <p className="error" style={{ marginBottom: '0.75rem' }}>{liveVotesError}</p>}

            {liveVotes.length === 0 && !liveVotesError && (
              <p className="muted">No votes found.</p>
            )}

            {liveVotes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {liveVotes.map((vote) => (
                  <div key={vote.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ marginBottom: '0.25rem' }}>{vote.title}</h3>
                        <p className="muted" style={{ margin: 0 }}>
                          ID: <strong>{vote.id}</strong> • {vote.options.length} options
                        </p>
                        <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                          Created: {new Date(vote.created_at).toLocaleString()}
                        </p>
                        <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                          Status: <strong>{vote.closed_at ? 'Closed' : 'Open'}</strong>
                          {vote.closed_at && ` (closed ${new Date(vote.closed_at).toLocaleString()})`}
                        </p>
                        {vote.auto_close_at && (
                          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                            Auto-close: {new Date(vote.auto_close_at).toLocaleString()}
                          </p>
                        )}
                        {vote.period_days && vote.vote_duration_hours && (
                          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                            Recurs every {vote.period_days} days • Duration {vote.vote_duration_hours} hours
                          </p>
                        )}
                        {vote.integration_id && (
                          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                            Integration ID: {vote.integration_id}
                          </p>
                        )}
                        {vote.write_secret_plaintext ? (
                          <div style={{ marginTop: '0.5rem' }}>
                            <p className="muted" style={{ marginBottom: '0.25rem' }}>
                              Vote admin secret:
                            </p>
                            <div className="copyable-field">
                              <span className="secret-value">{vote.write_secret_plaintext}</span>
                              <CopyButton text={vote.write_secret_plaintext} label="Copy vote admin secret" />
                            </div>
                          </div>
                        ) : (
                          <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                            Vote admin secret unavailable (created before secret retention).
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => updateLiveVote(vote.id, vote.closed_at ? 'reopen' : 'close')}
                          disabled={liveVotesLoading}
                        >
                          {vote.closed_at ? 'Reopen vote' : 'Close vote'}
                        </button>
                        <Link className="btn-secondary" href={`/v/${vote.id}/admin`}>
                          Open vote admin
                        </Link>
                        <Link className="btn-secondary" href={getVoteRecreateHref(vote)}>
                          Re-create vote
                        </Link>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => deleteLiveVote(vote.id)}
                          disabled={liveVotesLoading}
                        >
                          Delete vote
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const nextPage = Math.max(1, liveVotesPage - 1)
                      setLiveVotesPage(nextPage)
                      void loadLiveVotes(nextPage)
                    }}
                    disabled={liveVotesPage <= 1 || liveVotesLoading}
                  >
                    Previous
                  </button>
                  <span className="muted">
                    Page {liveVotesPage} of {liveVotesTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const nextPage = Math.min(liveVotesTotalPages, liveVotesPage + 1)
                      setLiveVotesPage(nextPage)
                      void loadLiveVotes(nextPage)
                    }}
                    disabled={liveVotesPage >= liveVotesTotalPages || liveVotesLoading}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="discord-heading">
              <svg
                className="discord-logo"
                viewBox="0 0 127.14 96.36"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25,68.42,68.42,0,0,1,28.57,80c.93-.69,1.84-1.41,2.71-2.15a73.39,73.39,0,0,0,64.71,0c.87.74,1.78,1.46,2.71,2.15A68.68,68.68,0,0,1,87.66,85.24a77.1,77.1,0,0,0,6.89,11.12A105.25,105.25,0,0,0,126.72,80.2h0C129.27,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60.04,31,53.06S36,40.43,42.45,40.43c6.63,0,11.8,5.73,11.68,12.63C54.13,60,49,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60.04,73.25,53.06s5-12.63,11.44-12.63c6.63,0,11.8,5.73,11.68,12.63C96.37,60,91.29,65.69,84.69,65.69Z"
                />
              </svg>
              <div>
                <h3>Discord Integrations</h3>
                <p className="muted">
                  Create a Discord webhook URL first, then create an integration via the admin API and use the returned ID.
                </p>
                <p className="muted">
                  <a
                    href="https://github.com/dvdizon/ranked-choice/blob/main/docs/API.md#integrations-endpoints"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Admin API: Integrations endpoints
                  </a>
                </p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="integrationId">Discord Integration ID</label>
              {integrations.length > 0 ? (
                <select
                  id="integrationId"
                  value={integrationId}
                  onChange={(e) => setIntegrationId(e.target.value)}
                  className="input-large"
                >
                  <option value="">Select an integration</option>
                  {integrations.map((integration) => (
                    <option key={integration.id} value={String(integration.id)}>
                      {integration.name} (#{integration.id}, {integration.type})
                    </option>
                  ))}
                </select>
              ) : (
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
              )}
              <p className="muted">
                Use this ID on the create vote page to attach notifications.
              </p>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIntegrationId('')}
                  disabled={!integrationId}
                >
                  Clear selection
                </button>
                <select
                  aria-label="Test notification type"
                  value={integrationTestEventType}
                  onChange={(e) => setIntegrationTestEventType(e.target.value)}
                  className="input-large"
                  style={{ maxWidth: '12rem' }}
                >
                  <option value="vote_opened">Test vote open</option>
                  <option value="vote_created">Test vote created</option>
                  <option value="vote_closed">Test vote closed</option>
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={sendTestNotification}
                  disabled={integrationTestLoading || !integrationId}
                >
                  {integrationTestLoading ? 'Sending...' : 'Send test message'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={deleteSelectedIntegration}
                  disabled={integrationDeleteLoading || !integrationId}
                >
                  {integrationDeleteLoading ? 'Removing...' : 'Delete integration'}
                </button>
              </div>
              {integrationTestError && (
                <p className="error" style={{ marginTop: '0.5rem' }}>{integrationTestError}</p>
              )}
              {integrationTestSuccess && (
                <p className="muted" style={{ marginTop: '0.5rem' }}>{integrationTestSuccess}</p>
              )}
              {integrationDeleteError && (
                <p className="error" style={{ marginTop: '0.5rem' }}>{integrationDeleteError}</p>
              )}
            </div>

            <div className="form-group">
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={loadIntegrations}
                  disabled={integrationsLoading}
                >
                  {integrationsLoading ? 'Loading...' : 'Load integrations'}
                </button>
              </div>
              {integrationsError && <p className="error" style={{ marginTop: '0.5rem' }}>{integrationsError}</p>}
              {!integrationsError && integrations.length > 0 && (
                <p className="muted" style={{ marginTop: '0.5rem' }}>
                  Loaded {integrations.length} integration{integrations.length === 1 ? '' : 's'}.
                </p>
              )}
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Create Discord Integration</h4>
              <div className="form-group">
                <label htmlFor="integrationName">Integration name</label>
                <input
                  type="text"
                  id="integrationName"
                  value={integrationName}
                  onChange={(e) => setIntegrationName(e.target.value)}
                  placeholder="e.g., Team Lunch Discord"
                  className="input-large"
                />
              </div>
              <div className="form-group">
                <label htmlFor="discordWebhookUrl">Discord webhook URL</label>
                <input
                  type="url"
                  id="discordWebhookUrl"
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="input-large"
                />
                <p className="muted">
                  This will be validated by Discord before the integration is created.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={createDiscordIntegration}
                disabled={integrationCreateLoading}
              >
                {integrationCreateLoading ? 'Creating...' : 'Create Discord integration'}
              </button>
              {integrationCreateError && (
                <p className="error" style={{ marginTop: '0.5rem' }}>{integrationCreateError}</p>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: '1rem' }}>
        <Link href="/">Back to Create Vote</Link>
      </div>
    </div>
  )
}
