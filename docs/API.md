# API Documentation

This document describes the REST API endpoints for programmatic access to the Ranked Choice Voting app.

## Base URL

When running locally: `http://localhost:3100`

In production: `https://your-domain.com`

If the app is deployed under a subpath (for example `/rcv`), prefix all
routes below with that base path (e.g., `/rcv/api/votes`).

## Authentication

### Vote Operations

Votes have two separate secrets:

- **Admin Secret**: Required for managing the vote (closing, editing options, deleting ballots, accessing admin panel)
- **Voting Secret**: Required for submitting ballots. Can be shared with voters via URL parameter (`?secret=...`)

Both secrets are generated when creating a vote. Legacy votes that don't have a separate voting secret will accept the admin secret for ballot submission.

### Admin Operations

Admin endpoints require an **admin secret** set via the `ADMIN_SECRET` environment variable. Include it in the Authorization header:

```
Authorization: Bearer <ADMIN_SECRET>
```

## Endpoints

### Create Vote

**POST** `/api/votes`

Create a new vote.

**Request Body:**

```json
{
  "title": "Team Lunch Decision",
  "options": ["Pizza Palace", "Sushi Supreme", "Taco Town"],
  "voteId": "team-lunch-2026",  // optional, auto-generated if not provided
  "writeSecret": "custom-admin-secret",  // optional, auto-generated if not provided
  "votingSecret": "custom-voting-secret",  // optional, auto-generated if not provided
  "voterNamesRequired": true,  // optional, default: true
  "autoCloseAt": "2026-01-26T18:00:00Z",  // optional, ISO 8601 datetime
  "recurrenceEnabled": true,  // optional, enable recurring votes
  "recurrenceStartAt": "2026-02-01T17:00:00Z",  // optional, required if recurrenceEnabled
  "periodDays": 7,  // optional, minimum 7 (required if recurrenceEnabled)
  "voteDurationHours": 24,  // optional, minimum 1 (required if recurrenceEnabled)
  "integrationId": 3,  // optional, Discord integration ID
  "integrationAdminSecret": "ADMIN_SECRET"  // required if integrationId is provided
}
```

**Response:**

```json
{
  "success": true,
  "vote": {
    "id": "team-lunch-2026",
    "title": "Team Lunch Decision",
    "options": ["Pizza Palace", "Sushi Supreme", "Taco Town"],
    "created_at": "2026-01-25T12:00:00Z"
  },
  "adminSecret": "xYz123AbC",  // Save this! For admin operations. Only shown once
  "votingSecret": "aBc456DeF",  // Share with voters for ballot submission
  "writeSecret": "xYz123AbC",  // Legacy field (same as adminSecret)
  "voteUrl": "/v/team-lunch-2026",
  "resultsUrl": "/v/team-lunch-2026/results"
}
```

**Example (curl):**

```bash
curl -X POST http://localhost:3100/api/votes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Friday Lunch",
    "options": ["Pizza", "Sushi", "Tacos"],
    "autoCloseAt": "2026-01-26T18:00:00Z",
    "recurrenceEnabled": true,
    "recurrenceStartAt": "2026-02-01T17:00:00Z",
    "periodDays": 7,
    "voteDurationHours": 24,
    "integrationId": 3,
    "integrationAdminSecret": "ADMIN_SECRET"
  }'
```

**Example (Node.js):**

```javascript
const response = await fetch('http://localhost:3100/api/votes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Friday Lunch',
    options: ['Pizza', 'Sushi', 'Tacos'],
    autoCloseAt: '2026-01-26T18:00:00Z',
    recurrenceEnabled: true,
    recurrenceStartAt: '2026-02-01T17:00:00Z',
    periodDays: 7,
    voteDurationHours: 24,
    integrationId: 3,
    integrationAdminSecret: 'ADMIN_SECRET'
  })
});

const data = await response.json();
console.log('Vote created:', data.voteUrl);
console.log('Admin secret:', data.adminSecret);
console.log('Voting secret:', data.votingSecret);
```

---

### Get Vote

**GET** `/api/votes/:voteId`

Retrieve vote information and ballot count.

**Response:**

```json
{
  "id": "team-lunch-2026",
  "title": "Team Lunch Decision",
  "options": ["Pizza Palace", "Sushi Supreme", "Taco Town"],
  "created_at": "2026-01-25T12:00:00Z",
  "closed_at": null,
  "auto_close_at": "2026-01-26T18:00:00Z",
  "voter_names_required": true,
  "ballotCount": 5
}
```

---

### Submit Ballot

**POST** `/api/votes/:voteId/ballots`

Submit a ballot (requires voting secret).

**Request Body:**

```json
{
  "rankings": ["Sushi Supreme", "Pizza Palace"],
  "votingSecret": "aBc456DeF",  // or "writeSecret" for legacy compatibility
  "voterName": "Alice"  // required if voter_names_required is true
}
```

**Note:** The voting secret can also be passed via URL parameter when sharing the vote link:
`/v/team-lunch-2026?secret=aBc456DeF`

**Response:**

```json
{
  "success": true,
  "ballot": {
    "id": 1,
    "vote_id": "team-lunch-2026",
    "rankings": ["Sushi Supreme", "Pizza Palace"],
    "voter_name": "Alice",
    "created_at": "2026-01-25T12:30:00Z"
  }
}
```

---

### Get Results

**GET** `/api/votes/:voteId/results`

Get IRV calculation results.

**Response:**

```json
{
  "winner": "Sushi Supreme",
  "tie": false,
  "rounds": [
    {
      "round": 1,
      "tallies": {
        "Sushi Supreme": 3,
        "Pizza Palace": 2,
        "Taco Town": 1
      },
      "eliminated": ["Taco Town"],
      "exhausted": 0,
      "active": 6
    },
    {
      "round": 2,
      "tallies": {
        "Sushi Supreme": 4,
        "Pizza Palace": 2
      },
      "eliminated": [],
      "exhausted": 0,
      "active": 6,
      "winner": "Sushi Supreme"
    }
  ]
}
```

---

### Update Vote

**PATCH** `/api/votes/:voteId`

Perform admin actions on a vote (requires write secret).

**Close Voting:**

```json
{
  "writeSecret": "xYz123AbC",
  "action": "close"
}
```

**Reopen Voting:**

```json
{
  "writeSecret": "xYz123AbC",
  "action": "reopen"
}
```

**Update Options:**

```json
{
  "writeSecret": "xYz123AbC",
  "action": "updateOptions",
  "options": ["Pizza Palace", "Sushi Supreme", "Burger Barn"]
}
```

**Set Auto-Close:**

```json
{
  "writeSecret": "xYz123AbC",
  "action": "setAutoClose",
  "autoCloseAt": "2026-01-27T18:00:00Z"  // or null to remove
}
```

**Trigger Tie Breaker Runoff:**

```json
{
  "writeSecret": "xYz123AbC",
  "action": "triggerTieBreaker"
}
```

Returns `runoffVoteId` when a runoff is created. The source vote must be closed and currently tied.

**Response (close/reopen/update options/set auto-close):**

```json
{
  "success": true,
  "vote": {
    "id": "team-lunch-2026",
    "title": "Team Lunch Decision",
    "options": ["Pizza Palace", "Sushi Supreme", "Burger Barn"],
    "created_at": "2026-01-25T12:00:00Z",
    "closed_at": null,
    "auto_close_at": "2026-01-27T18:00:00Z",
    "voter_names_required": true,
    "ballotCount": 5
  }
}
```

**Response (trigger tie breaker):**

```json
{
  "success": true,
  "runoffVoteId": "team-lunch-2026-runoff"
}
```

---

### Delete Vote

**DELETE** `/api/votes/:voteId`

Delete a vote and all its ballots (requires write secret).

**Request Body:**

```json
{
  "writeSecret": "xYz123AbC"
}
```

**Response:**

```json
{
  "success": true
}
```

---

### Get Ballots (Admin)

**GET** `/api/votes/:voteId/ballots`

List all ballots for a vote (requires write secret in header).

**Headers:**

```
X-Write-Secret: xYz123AbC
```

**Response:**

```json
{
  "success": true,
  "ballots": [
    {
      "id": 1,
      "vote_id": "team-lunch-2026",
      "rankings": ["Sushi Supreme", "Pizza Palace"],
      "voter_name": "Alice",
      "created_at": "2026-01-25T12:30:00Z"
    }
  ]
}
```

---

### Delete Ballot

**DELETE** `/api/votes/:voteId/ballots/:ballotId`

Delete a specific ballot (requires write secret).

**Request Body:**

```json
{
  "writeSecret": "xYz123AbC"
}
```

**Response:**

```json
{
  "success": true
}
```

---

## Admin Endpoints

These endpoints require the `ADMIN_SECRET` environment variable to be set and provided in the Authorization header.

### Create API Key

**POST** `/api/admin/api-keys`

Create a new API key for programmatic access.

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Request Body:**

```json
{
  "name": "CI/CD Pipeline"  // optional
}
```

**Response:**

```json
{
  "success": true,
  "apiKey": {
    "id": 1,
    "key": "rcv_AbCdEfGhIjKlMnOpQrStUvWxYz123456",  // Only shown once!
    "name": "CI/CD Pipeline",
    "created_at": "2026-01-25T12:00:00Z"
  }
}
```

---

### List API Keys

**GET** `/api/admin/api-keys`

List all API keys (without the actual key values).

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Response:**

```json
{
  "success": true,
  "apiKeys": [
    {
      "id": 1,
      "name": "CI/CD Pipeline",
      "created_at": "2026-01-25T12:00:00Z",
      "last_used_at": "2026-01-25T14:30:00Z"
    }
  ]
}
```

---

### Delete API Key

**DELETE** `/api/admin/api-keys`

Delete an API key.

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Request Body:**

```json
{
  "id": 1
}
```

**Response:**

```json
{
  "success": true
}
```

---

### List Votes

**GET** `/api/admin/votes`

List votes (open or closed), paginated.

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Query Parameters:**

- `page` (number, default: 1)
- `pageSize` (number, default: 10, max: 50)

**Response:**

```json
{
  "success": true,
  "page": 1,
  "pageSize": 10,
  "total": 2,
  "totalPages": 1,
  "votes": [
    {
      "id": "team-lunch-2026",
      "title": "Friday Lunch",
      "options": ["Pizza", "Sushi", "Tacos"],
      "created_at": "2026-02-01T12:00:00Z",
      "closed_at": null,
      "auto_close_at": "2026-02-02T12:00:00Z",
      "voter_names_required": true,
      "period_days": null,
      "vote_duration_hours": null,
      "recurrence_start_at": null,
      "recurrence_group_id": null,
      "integration_id": 1,
      "recurrence_active": false
    }
  ]
}
```

---

### Update Vote (System Admin)

**PATCH** `/api/admin/votes/:voteId`

Close, reopen, or trigger a tie-breaker runoff vote (admin secret required).

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Request Body:**

```json
{
  "action": "close"
}
```

Use `"reopen"` to reopen a closed vote without deleting existing ballots.
Use `"triggerTieBreaker"` to create a runoff for a closed tied vote.

**Response:**

```json
{
  "success": true
}
```

When `action` is `"triggerTieBreaker"`, response also includes:

```json
{
  "success": true,
  "runoffVoteId": "team-lunch-2026-runoff"
}
```

---

### Delete Vote (System Admin)

**DELETE** `/api/admin/votes/:voteId`

Delete a vote and all ballots (admin secret required).

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Response:**

```json
{
  "success": true
}
```

---

## Integrations Endpoints

These endpoints require the `ADMIN_SECRET` environment variable to be set and provided in the Authorization header.

### Create Integration

**POST** `/api/integrations`

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Request Body (Discord):**

```json
{
  "type": "discord",
  "name": "Team Lunch Discord",
  "config": {
    "webhook_url": "https://discord.com/api/webhooks/..."
  }
}
```

**Response:**

```json
{
  "integration": {
    "id": 3,
    "name": "Team Lunch Discord",
    "type": "discord",
    "config": {
      "webhook_url": "https://discord.com/..."
    },
    "created_at": "2026-01-31T20:00:00Z"
  }
}
```

---

### List Integrations

**GET** `/api/integrations`

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Response:**

```json
{
  "integrations": [
    {
      "id": 3,
      "name": "Team Lunch Discord",
      "type": "discord",
      "config": {
        "webhook_url": "https://discord.com/..."
      },
      "created_at": "2026-01-31T20:00:00Z"
    }
  ]
}
```

---

### Delete Integration

**DELETE** `/api/integrations/:id`

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Response:**

```json
{
  "success": true
}
```

---

### Send Test Notification

**POST** `/api/integrations/:id`

Send a test notification message to verify the integration.

**Headers:**

```
Authorization: Bearer <ADMIN_SECRET>
```

**Request Body:**

```json
{
  "eventType": "vote_opened"
}
```

Allowed `eventType` values:
- `vote_opened` (default)
- `vote_created`
- `vote_closed`
- `runoff_required` (sent automatically when a pure tie creates a second-round runoff vote)

**Response:**

```json
{
  "success": true
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid auth)
- `404` - Not Found (vote doesn't exist)
- `409` - Conflict (duplicate vote ID)
- `500` - Internal Server Error

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `PORT` | Server port (default: 3100) | No |
| `DATABASE_PATH` | SQLite database path | No |
| `ADMIN_SECRET` | Secret for admin API endpoints | Yes (for admin endpoints) |
| `MAX_RECURRING_VOTES_PER_TICK` | Max new recurring votes per scheduler tick (default: 10) | No |
| `MAX_ACTIVE_RECURRING_GROUPS` | Max active recurring vote groups system-wide (default: 100) | No |

---

## Rate Limiting

Currently, there is no rate limiting implemented. This may be added in the future using API keys for tracking.

---

## Example: Automated Weekly Lunch Poll

```bash
#!/bin/bash

# Create vote every Friday at 9am
RESPONSE=$(curl -s -X POST http://localhost:3100/api/votes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Friday Lunch - '$(date +%Y-%m-%d)'",
    "options": ["Pizza Palace", "Sushi Supreme", "Taco Town", "Burger Barn"],
    "voteId": "friday-lunch-'$(date +%Y%m%d)'",
    "autoCloseAt": "'$(date -d 'today 17:00' -Iseconds)'"
  }')

VOTE_URL=$(echo $RESPONSE | jq -r '.voteUrl')
WRITE_SECRET=$(echo $RESPONSE | jq -r '.writeSecret')

echo "Vote created: http://localhost:3100$VOTE_URL"
echo "Write secret: $WRITE_SECRET"

# Send to team via Slack, email, etc.
```

---

## Future Enhancements

- API key authentication for vote creation
- Rate limiting per API key
- Webhooks for vote events (created, closed, ballot submitted)
- Batch operations for creating multiple votes
