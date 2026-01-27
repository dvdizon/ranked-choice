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
  "autoCloseAt": "2026-01-26T18:00:00Z"  // optional, ISO 8601 datetime
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
    "autoCloseAt": "2026-01-26T18:00:00Z"
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
    autoCloseAt: '2026-01-26T18:00:00Z'
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

**Response:**

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
