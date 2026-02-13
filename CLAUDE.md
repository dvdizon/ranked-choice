# CLAUDE.md

Guidelines for AI agents and contributors working on the Ranked Choice Voting App project.

## Project Overview

A self-hosted Ranked Choice Voting web app for small groups. Built with Next.js 16 (App Router), TypeScript, and SQLite.

## Quick Reference

```bash
# Development
npm run dev          # Start dev server (port 3100)
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
npm test             # Run Jest tests
npm run test:watch   # Tests in watch mode
```

## Core Principles

1. **Isolation First** - Never interfere with other apps on the droplet
   - Port 3100 (not 3000)
   - Separate nginx config, pm2 process, data directory

2. **Additive Changes Only** - Never overwrite existing behavior
   - If unsure, document instead of changing

3. **Simple Over Clever** - Boring, understandable solutions
   - Friends should be able to reason about outcomes

4. **Deterministic Behavior** - RCV outcomes must be reproducible

5. **Explainability** - Show *how* the winner was chosen

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home / Create vote (server wrapper)
│   ├── create-vote-client.tsx  # Home / Create vote client UI
│   ├── system/            # System admin (integrations)
│   ├── v/[voteId]/        # Vote and results pages
│   │   ├── page.tsx       # Voting page (opt-out UX, custom options)
│   │   ├── results/       # Results with voter names
│   │   └── admin/         # Admin panel
│   └── api/               # REST API endpoints
│       ├── admin/
│       │   └── api-keys/route.ts  # API key management (admin only)
│       └── votes/
│           ├── route.ts       # Create vote
│           └── [voteId]/
│               ├── route.ts   # GET/DELETE/PATCH vote
│               ├── ballots/   # Submit/view ballots
│               │   ├── route.ts
│               │   └── [ballotId]/route.ts  # Delete ballot
│               └── results/route.ts
└── lib/
    ├── db.ts              # SQLite database layer
    ├── irv.ts             # Pure IRV algorithm
    ├── irv.test.ts        # IRV unit tests
    ├── auth.ts            # Secret hashing/validation
    └── paths.ts           # Base path helper for internal URLs

deploy/
├── nginx/rcv-lunch.conf   # nginx site config
├── pm2/ecosystem.config.cjs
└── README.md              # Deployment guide
```

## Development Guidelines

### Code Style
- TypeScript strict mode
- Pure functions where possible (especially business logic)
- Keep components focused and simple
- ESLint uses flat config (`eslint.config.js`)

### Testing
- IRV algorithm has comprehensive unit tests
- Run `npm test` before committing
- Add tests for new business logic

### Documentation Requirements
**CRITICAL:** Before committing any code changes, you MUST update all relevant documentation:
- **CHANGELOG.md** - Document all changes in the Unreleased section
- **PLAN.md** - Update functional scope and change log; record behavior decisions in `docs/decisions/`
- **README.md** - Update usage instructions and key features if user-facing changes
- **CLAUDE.md** - Update schema, features, or guidelines if architecture changes

This ensures all documentation stays synchronized with code and future agents/contributors have accurate context.

#### Proactive README Consistency Check
**IMPORTANT:** As part of every task, you should proactively verify that README.md is consistent with recent CHANGELOG entries. This check should happen automatically, not only when explicitly requested:

1. **Check for outdated references**: Look for mentions of deprecated tools, old CI/CD systems, or superseded features
2. **Verify terminology matches current implementation**: Ensure naming (e.g., "admin secret" vs "write secret") reflects the current codebase
3. **Validate feature descriptions**: Confirm that features mentioned in recent CHANGELOG versions are properly documented in README
4. **Check CI/CD and deployment sections**: Ensure these match the current workflow configuration

If you find inconsistencies during your work, fix them proactively as part of your task. Document these fixes in CHANGELOG under the Unreleased section.

### Commit Guidelines
**Skip CI for documentation-only changes:** When a commit contains ONLY documentation changes (markdown files, comments, changelog updates, etc.) and no code changes that would affect build/tests, include `[skip ci]` in the commit message to save CI resources:
```bash
git commit -m "docs: update refactor opportunities [skip ci]"
```

Use `[skip ci]` when:
- Updating markdown files (README, CHANGELOG, CLAUDE.md, docs/*)
- Fixing typos or improving documentation
- Updating comments without changing code logic

Do NOT use `[skip ci]` when:
- Any source code files are modified (.ts, .tsx, .js, .css, etc.)
- Configuration files are changed (package.json, next.config.js, etc.)
- CI workflow files are changed (unless the change is trivial and tested)

### Version Management
**IMPORTANT:** Version bumps must always be performed by AI agents, not manually. This ensures consistency and proper changelog updates.

When creating a new release:
1. Move the "Unreleased" section content in `CHANGELOG.md` to a new version section with date
2. Update `package.json` version field to match
3. Follow semantic versioning (MAJOR.MINOR.PATCH):
   - **MAJOR**: Breaking changes to user-facing behavior or API
   - **MINOR**: New features, backward compatible
   - **PATCH**: Bug fixes, documentation updates

### Database
- SQLite via better-sqlite3
- Schema in `src/lib/db.ts`
- Production path: `/var/lib/rcv-lunch/rcv.sqlite`
- Local dev path: `./data/rcv.sqlite`

#### Schema
- **votes table**: `id`, `title`, `options` (JSON), `write_secret_hash`, `voting_secret_hash` (TEXT, nullable), `voting_secret_plaintext` (TEXT, nullable), `voter_names_required` (INTEGER, default 1), `auto_close_at` (TEXT), `open_notified_at` (TEXT, nullable), `closed_notified_at` (TEXT, nullable), `created_at`, `closed_at`, `period_days` (INTEGER, nullable), `vote_duration_hours` (INTEGER, nullable), `recurrence_group_id` (TEXT, nullable), `integration_id` (INTEGER, nullable), `recurrence_active` (INTEGER, default 0)
- **ballots table**: `id`, `vote_id`, `rankings` (JSON), `voter_name`, `created_at`
- **api_keys table**: `id`, `key_hash`, `name`, `created_at`, `last_used_at`
- **integrations table**: `id`, `type` (discord/slack/webhook), `name`, `config` (JSON), `created_at`

**Note on secrets:** Votes have two separate secrets:
- `write_secret_hash` (admin secret): For managing the vote (admin panel, editing, deleting)
- `voting_secret_hash`: For submitting ballots. If NULL, falls back to `write_secret_hash` for backwards compatibility
- `voting_secret_plaintext`: Plaintext voting secret stored only for recurring votes with integrations (enables Discord notifications to include voting link with secret)
- `tie_runoff_created_at`, `tie_runoff_vote_id`: Track one-time automatic runoff creation for pure-tie outcomes on integration-enabled votes

**Note on recurring votes:** Votes can be configured to recur automatically:
- `period_days`: How often (in days) a new vote instance is created (min 7)
- `vote_duration_hours`: How long each vote stays open before auto-closing
- `recurrence_group_id`: Links related vote instances together
- `integration_id`: Optional link to messaging integration for notifications

#### Key Functions
- Vote CRUD: `createVote`, `getVote`, `deleteVote`, `voteExists`
- Vote management: `closeVote`, `reopenVote`, `updateVoteOptions`, `appendVoteOptions`, `setAutoCloseAt`, `setVoteRecurrence`
- Recurring votes: `createNextRecurringVote`, `getLatestVoteInRecurrenceGroup`, `getRecurringVotesNeedingNewInstance`, `stopRecurringVoteGroup`, `countActiveRecurringVoteGroups`, `getVotesInRecurrenceGroup`, `updateRecurringVoteTemplate`
- Ballot operations: `createBallot`, `getBallot`, `getBallotsByVoteId`, `deleteBallot`, `countBallots`
- API key operations: `createApiKey`, `getApiKeyById`, `getApiKeyByHash`, `getAllApiKeys`, `updateApiKeyLastUsed`, `deleteApiKey`
- Integration operations: `createIntegration`, `getIntegrationById`, `getAllIntegrations`, `updateIntegration`, `deleteIntegration`
- Scheduler helpers: `canCreateRecurringVote`, `getRecurringVoteLimits`

### API Routes
- REST endpoints under `/api/votes/` - See `docs/API.md` for comprehensive API documentation
- Admin endpoints under `/api/admin/` - Requires `ADMIN_SECRET` environment variable
- Integrations endpoints under `/api/integrations/` - Requires `ADMIN_SECRET` authentication
- Health check endpoint at `/api/health` - Returns `{"status": "ok"}` for deployment verification
- JSON request/response bodies
- Write operations require vote secret

## Deployment

### Environment Variables
```bash
PORT=3100                              # Required
DATABASE_PATH=/var/lib/rcv-lunch/rcv.sqlite  # Production
BASE_URL=https://your-domain.com       # Optional
ADMIN_SECRET=                          # Optional - enables admin API endpoints for API key management

# Recurring vote protection limits
MAX_RECURRING_VOTES_PER_TICK=10        # Max new votes created per scheduler tick (default: 10)
MAX_ACTIVE_RECURRING_GROUPS=100        # Max active recurring vote groups system-wide (default: 100)
```

### Base Path Assumption
Production deployments may serve the app under `/rcv`. When that is true,
`next.config.js` must set `basePath: '/rcv'`.

**IMPORTANT:** The `withBasePath()` helper from `src/lib/paths.ts` should ONLY be used for:
- API fetch calls (e.g., `fetch(withBasePath('/api/votes'))`)
- Server-side operations

**DO NOT use** `withBasePath()` with client-side navigation methods like:
- `router.push()` - Next.js automatically applies `basePath` from config
- `router.replace()` - Next.js automatically applies `basePath` from config
- `<Link href="">` - Next.js automatically applies `basePath` from config

Using `withBasePath()` with these methods will cause double prefixing (e.g., `/rcv/rcv/v/...`).

### Production Checklist
1. Create data directory: `sudo mkdir -p /var/lib/rcv-lunch`
2. Set permissions: `sudo chown $USER:$USER /var/lib/rcv-lunch`
3. Configure nginx (symlink deploy/nginx/rcv-lunch.conf)
4. Start with pm2: `pm2 start deploy/pm2/ecosystem.config.cjs`
5. Set up HTTPS with certbot

See `deploy/README.md` for detailed instructions.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs:
- **lint** - ESLint checks
- **typecheck** - TypeScript type checking
- **test** - Jest unit tests with coverage
- **build** - Next.js production build
- **deploy_production** - SSH-based deployment (auto on merge to main)
  - Triggers automatically when code is pushed/merged to main branch
  - Does NOT trigger on pull request events (only runs CI checks)
  - Includes post-deploy health check verification
  - Polls `/health` endpoint for up to 30 seconds
  - Dumps pm2 logs and fails deployment if health check doesn't pass

### Skip CI
To skip CI checks for documentation-only or trivial changes, include `[skip ci]` or `[ci skip]` in your commit message:
```bash
git commit -m "docs: update README [skip ci]"
```

See `.github/workflows/ci.yml` for configuration.

### Health Check
The `/api/health` endpoint should be restricted to localhost access in nginx:
```nginx
location /health {
    allow 127.0.0.1;
    deny all;
    proxy_pass http://127.0.0.1:3100;
}
```
## Key Files

| File | Purpose |
|------|---------|
| `PLAN.md` | Source of truth for requirements and RCV rules |
| `CLAUDE.md` | This file - development guidelines |
| `docs/API.md` | REST API documentation for programmatic access |
| `docs/decisions/README.md` | Decision record index and template |
| `docs/refactor-opportunities.md` | Deferred improvements |
| `docs/CHANGELOG.md` | Work history and changes |

## Key Features

### Voting Experience
- **Opt-out UX**: All options start ranked in random order; voters remove unwanted options
- **Custom Options**: Voters can suggest new options (added dynamically for all voters)
- **Optional Voter Names**: Vote creators choose whether names are required (default) or optional; enables both coordinated and anonymous voting
- **Auto-Close**: Set automatic voting deadline with date/time picker
- **Drag & Drop**: Reorder rankings with touch/mouse support (@dnd-kit) using dedicated drag handles on each row
- **Persistent Options**: Vote creator's last-used options saved in localStorage
- **URL Secret Support**: Voting secret can be passed via `?secret=` URL parameter for easy sharing
- **Contest Identification**: Vote and results pages display both contest title and vote ID
- **Recurring Contest IDs**: Recurring votes can use format tokens (default `{title}-{close-mm-dd-yyyy}`), and admins can rename contest IDs
- **Automatic Tie Runoff**: Pure ties can trigger an automatic second-round runoff vote (tied options only) with integration notification
- **Manual Tie Breakers**: Vote admins and system admins can manually trigger a tie-breaker runoff for closed tied votes

### Admin Capabilities
- **Separate Secrets**: Admin secret (for management) vs Voting secret (for ballot submission)
- **Share Message**: Easy copy-paste formatted message with voting link (includes secret) and results link
- **Admin Panel** (`/v/:voteId/admin`): Admin-secret protected management interface
  - View all ballots with voter names and timestamps
  - Delete individual ballots or entire vote
  - Close/reopen voting (prevents new submissions when closed)
  - Trigger tie-breaker runoff for closed tied votes
  - Set or change auto-close date/time
  - Edit vote options (removes deleted options from existing ballots)
- **System Admin** (`/system`): ADMIN_SECRET protected management
  - Monitor open/closed votes, close/reopen/delete them, trigger tie-breaker runoffs, open vote admin pages, and re-create votes with prefilled fields
  - Manage integrations (Discord, Slack, webhook)
- **API Key Management** (`/api/admin/api-keys`): Admin-secret protected endpoints
  - Create API keys for programmatic access
  - List all API keys with usage timestamps
  - Delete API keys
  - Infrastructure for future rate limiting

### Vote ID Format
- Alphanumeric characters and dashes allowed (e.g., `friday-lunch`)
- 3-32 characters, case-insensitive (normalized to lowercase)
- Recurring ID format tokens: `{title}`, `{close-mm-dd-yyyy}`, `{close-yyyy-mm-dd}`, `{start-mm-dd-yyyy}`, `{start-yyyy-mm-dd}`

## RCV Rules (Authoritative)

From PLAN.md - do not modify without recording a Decision Record in `docs/decisions/`:

- **Method**: Instant-Runoff Voting (IRV)
- **Majority**: >50% of active (non-exhausted) ballots
- **Elimination**: Remove option with fewest votes each round
- **Exhausted ballots**: Drop out when all ranked options eliminated
- **Tie-breaking**: Lowest weighted ranking support, then lowest first-round total, then lexicographic; if still tied, declare tie

## What NOT to Do

- Don't default to port 3000
- Don't edit existing nginx configs in place
- Don't store SQLite inside the repo in production
- Don't add user accounts or complex auth
- Don't over-engineer - keep it simple
- Don't expand scope beyond PLAN.md without discussion

## Getting Help

- Check `PLAN.md` for requirements clarity
- Check `docs/refactor-opportunities.md` for intentionally deferred features
- Check `docs/CHANGELOG.md` for context on past decisions
