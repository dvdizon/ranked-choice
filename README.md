<div align="center">
  <img src="public/logo.png" alt="RCV App Logo" width="200"/>
</div>

# Ranked Choice Voting App

A small, self-hosted web app for helping a group of friends make fair decisions using **Ranked Choice Voting (RCV / IRV)**.

This project is intentionally:
- Simple
- Transparent
- Easy to deploy on a small server
- Friendly to both humans and AI agents

---

## What This Is

Ranked Choice Voting App lets a group:
1. Create a vote with a short, shareable ID
2. Rank options in order of preference
3. See *exactly* how a winner was chosen, round by round

It uses **Instant-Runoff Voting (IRV)**:
- Majority (>50%) wins
- Lowest option is eliminated each round
- Ties for elimination use weighted ranking support, then first-round totals, then option ID
- Ballots are redistributed until a winner (or tie) is reached

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20.9+
- npm

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd ranked-choice

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run development server
npm run dev
```

The app will be available at http://localhost:3100

### Running Tests

```bash
npm test
```

---

## Usage

### Creating a Vote

1. Go to the home page
2. Enter a title (e.g., "Team Lunch Decision")
3. Enter options (one per line)
4. Choose whether to require voter names (checkbox, default: required)
   - **Required**: Voters must provide their name (good for coordination)
   - **Optional**: Anonymous voting allowed
5. Optionally set an auto-close date/time (voting will automatically close at this time)
6. Optionally set recurring schedule settings (under advanced options → Schedule tab):
   - Start date/time (when voting opens)
   - Enable recurring votes (min 7-day period)
   - Set vote duration (hours) for each recurring instance
   - Notifications send when the vote opens and when it closes
7. Optionally manage Discord integrations on the System Admin page (`/system`):
   - Validate `ADMIN_SECRET` to access integration controls
   - Create integrations and copy the integration ID
8. Optionally attach Discord notifications (under advanced options → Notifications tab):
   - Enter a Discord integration ID (from System Admin)
   - Provide the admin API secret to attach notifications
9. Optionally set custom secrets (under advanced options → Vote tab):
   - **Admin Secret**: For managing the vote (admin panel, editing, deleting)
   - **Voting Secret**: For submitting ballots (share with voters)
   - **Vote ID**: Custom short identifier (e.g., `team-lunch`)
10. Click "Create Vote"
11. **Save both secrets!** They're shown only once:
   - **Admin Secret**: Required for admin panel access
   - **Voting Secret**: Required for ballot submission (can be shared widely)

You'll receive three URLs:
- **Vote page**: Share with voters (includes voting secret in URL)
- **Results page**: View live results
- **Admin panel**: Manage the vote (requires admin secret)

### Submitting a Ballot

1. Go to `/v/<vote-id>`
2. All options start ranked in random order
3. Reorder by dragging the ☰ handle or using ↑/↓ buttons
4. Remove options you don't want by clicking ×
5. Optionally add custom options with "+ Add Custom Option"
6. Enter your name (required or optional based on vote settings)
7. Enter the voting secret (or it may be pre-filled from the URL)
8. Submit your ballot

**Notes:**
- Partial rankings allowed - you can remove any options you're indifferent about
- Custom options you add become available for other voters
- If voter names are required, your name will be visible on the results page
- If voter names are optional and you don't provide one, you'll appear as "Anonymous"

### Viewing Results

1. Go to `/v/<vote-id>/results`
2. See the winner (or tie), with contest title and ID shown at the top for clarity
3. View round-by-round elimination details
4. See all submitted ballots with voter names (or "Anonymous" if name not provided)

### Managing a Vote (Admin Panel)

1. Go to `/v/<vote-id>/admin`
2. Enter the admin secret
3. Available actions:
   - View all ballots with voter names (or "Anonymous") and timestamps
   - Delete individual ballots (e.g., duplicates or test submissions)
   - Delete the entire vote permanently
   - Close voting (prevents new ballot submissions)
   - Reopen voting (allows new submissions again)
   - Set or change auto-close date/time
   - Edit vote options (removes deleted options from existing ballots)

### System Admin

1. Go to `/system`
2. Enter the `ADMIN_SECRET`
3. Manage live votes:
   - Review a paginated list of open votes
   - Close voting, delete votes, or re-create votes with pre-filled fields
4. Manage integrations:
   - Create a new Discord integration (webhook URL required)
   - Load and delete existing integrations
   - Copy the integration ID for use when creating a vote
   - Send a test message to verify the Discord webhook

### Programmatic Access (API)

For automated vote creation and management, see the [API Documentation](docs/API.md).

Example: Create a vote via curl
```bash
curl -X POST http://localhost:3100/api/votes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Friday Lunch",
    "options": ["Pizza", "Sushi", "Tacos"],
    "autoCloseAt": "2026-01-26T18:00:00Z"
  }'
```

---

## Production Deployment

See [deploy/README.md](deploy/README.md) for detailed deployment instructions.

### Quick Overview

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Create data directory**
   ```bash
   sudo mkdir -p /var/lib/rcv-lunch
   sudo chown $USER:$USER /var/lib/rcv-lunch
   ```

3. **Configure environment**
   ```bash
   # In .env
   PORT=3100
   DATABASE_PATH=/var/lib/rcv-lunch/rcv.sqlite
   ```

4. **Start with PM2**
   ```bash
   pm2 start deploy/pm2/ecosystem.config.cjs
   pm2 save
   ```

5. **Configure nginx**
   ```bash
   sudo cp deploy/nginx/rcv-lunch.conf /etc/nginx/sites-available/rcv-lunch
   # Edit server_name in the config
   sudo ln -s /etc/nginx/sites-available/rcv-lunch /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

   Assumption: The production setup serves the app under `/rcv`. Keep
   `basePath: '/rcv'` in `next.config.js` before building, or asset paths will
   break when proxied under `/rcv`. Internal links rely on `withBasePath()` and
   normalize duplicate `/rcv` prefixes to avoid `/rcv/rcv` URLs.

6. **Enable HTTPS**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## CI/CD Pipeline

This project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that automates:

| Stage | Purpose |
|-------|---------|
| `lint` | ESLint checks |
| `typecheck` | TypeScript type checking |
| `test` | Jest unit tests with coverage |
| `build` | Next.js production build |
| `deploy_production` | SSH-based deployment (auto-triggers on merge to main) |

### Deployment Behavior

- **Automatic deployment**: Triggers when code is merged to the main branch
- **Pull requests**: Only run CI checks (lint, typecheck, test, build) without deploying
- **Post-deploy verification**: Polls `/health` endpoint for up to 30 seconds to verify successful deployment
- **Health check failure**: Dumps pm2 logs and fails the deployment if health check doesn't pass

### Configuring Deployment

Deployment requires the following GitHub Actions secrets:
- `DEPLOY_HOST` - Server hostname
- `DEPLOY_USER` - SSH username
- `DEPLOY_SSH_KEY` - SSH private key
- `DEPLOY_PATH` - Application directory on server
- `DEPLOY_PORT` - SSH port (optional, default: 22)
- `PM2_PROCESS_NAME` - pm2 process name (optional, default: rcv-lunch)

### Skip CI

To skip CI checks for documentation-only or trivial changes, include `[skip ci]` or `[ci skip]` in your commit message:
```bash
git commit -m "docs: update README [skip ci]"
```

See `.github/workflows/ci.yml` for full configuration details.

---

## Architecture

- **Framework:** Next.js 16 (App Router)
- **Database:** SQLite via better-sqlite3
- **Process manager:** pm2
- **Reverse proxy:** nginx
- **Port:** 3100 (configurable)

### Key Features

- **Ranked Choice Voting (IRV)**: Instant-runoff voting with explainable round-by-round results
- **Opt-Out Voting UX**: All options pre-ranked; remove unwanted choices
- **Custom Options**: Voters can suggest new options dynamically
- **Auto-Close**: Set automatic voting deadline with date/time picker
- **Recurring Votes**: Schedule votes to repeat on a weekly-or-longer cadence
- **Discord Notifications**: Send vote opened/closed messages via Discord webhooks
- **Flexible Anonymity**: Vote creators choose whether names are required (default) or optional for anonymous voting
- **Separate Admin and Voting Secrets**: Two distinct secrets for better access control
  - Admin secret for vote management (admin panel, editing, deleting)
  - Voting secret for ballot submission (can be shared widely)
- **Share Message**: Easy-to-copy formatted message with voting link (includes secret) and results link
- **URL Secret Support**: Voting secret can be passed via `?secret=` URL parameter for easy sharing
- **Admin Panel**: Full vote management (delete, close/reopen, edit options, set auto-close)
- **REST API**: Full programmatic access for automated vote creation (see [docs/API.md](docs/API.md))
- **Vote IDs**: Support dashes for readable URLs (e.g., `/v/team-lunch`)

### Key Files

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home / Create vote
│   ├── system/            # System admin (integrations)
│   ├── v/[voteId]/        # Vote pages
│   │   ├── page.tsx       # Ballot submission (opt-out UX, custom options)
│   │   ├── results/       # Results with voter names
│   │   └── admin/         # Admin panel
│   └── api/               # API routes
│       ├── admin/
│       │   └── api-keys/route.ts # API key management (admin only)
│       └── votes/         # Vote/ballot endpoints
│           ├── route.ts                    # Create vote
│           └── [voteId]/
│               ├── route.ts                # GET/DELETE/PATCH vote
│               ├── ballots/
│               │   ├── route.ts            # Submit/view ballots
│               │   └── [ballotId]/route.ts # Delete ballot
│               └── results/route.ts        # IRV results
└── lib/
    ├── db.ts              # SQLite database layer
    ├── irv.ts             # IRV algorithm (pure function)
    ├── irv.test.ts        # IRV unit tests
    └── auth.ts            # Secret generation/hashing/validation

deploy/
├── pm2/ecosystem.config.cjs  # PM2 configuration
├── nginx/rcv-lunch.conf      # nginx site template
└── README.md                 # Deployment instructions

docs/
├── API.md                    # REST API documentation
├── refactor-opportunities.md # Future improvement ideas
├── CHANGELOG.md              # Work history
└── archive/                  # Archived documentation
```

---

## What This Is Not

- Not a public election system
- Not designed for large or adversarial audiences
- No user accounts, OAuth, or analytics
- No cloud-managed database dependencies

---

## Project Structure & Sources of Truth

This repo is designed to be worked on by both **people** and **AI coding agents**.
Two documents are especially important:

### 📌 `PLAN.md` — Project Plan & Decisions
**This is the primary source of truth for behavior and scope.**

It contains:
- Project intent and non-goals
- Ranked choice voting rules (authoritative)
- Deployment constraints (DigitalOcean, nginx, pm2, SQLite)
- Execution phases and current status
- Open questions for discussion
- Decision Records (append-only, stored in `docs/decisions/`)

If something isn't in `PLAN.md`, it should be questioned before implementation.

---

### 🤖 `CLAUDE.md` — AI Agent Development Guidelines
**This document tells AI agents how to work in this repo safely.**

It includes:
- Hard constraints (additive changes only, no overwrites)
- Deployment isolation rules
- Technical assumptions and commands
- RCV rules reference
- Project structure overview
- What *not* to do

If you are using Claude Code or another AI coding agent, start there.

> **Note:** The original `AI-SEED-PROMPT.md` (used to bootstrap the MVP) has been archived to `docs/archive/`.

---

## Development Philosophy

- **Isolation first** — never break existing apps
- **Explainability over cleverness**
- **Deterministic behavior**
- **Human-readable decisions**
- **AI-assisted, not AI-dictated**

---

## Contributing & Decisions

- Non-trivial changes should be discussed and captured as **Decision Records** in `docs/decisions/`
- Decision history is append-only
- If unsure, document instead of changing behavior
- See [docs/refactor-opportunities.md](docs/refactor-opportunities.md) for improvement ideas

---

## License

MIT License. See `LICENSE`.

