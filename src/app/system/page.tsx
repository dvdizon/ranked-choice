'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { withBasePath } from '@/lib/paths'

interface IntegrationSummary {
  id: number
  name: string
  type: 'discord' | 'slack' | 'webhook'
}

const WEBHOOK_STORAGE_KEY = 'rcv-discord-webhook-url'
const NAME_STORAGE_KEY = 'rcv-discord-integration-name'

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
              <button
                type="button"
                className="btn-secondary"
                onClick={deleteSelectedIntegration}
                disabled={integrationDeleteLoading || !integrationId}
              >
                {integrationDeleteLoading ? 'Removing...' : 'Delete integration'}
              </button>
            </div>
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
      )}

      <div style={{ marginTop: '1rem' }}>
        <Link href="/">Back to Create Vote</Link>
      </div>
    </div>
  )
}
