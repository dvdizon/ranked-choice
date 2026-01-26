# CLAUDE.md

Guidelines for AI agents and contributors working on the RCV Lunch Picker project.

## Project Overview

A self-hosted Ranked Choice Voting web app for small groups. Built with Next.js 14 (App Router), TypeScript, and SQLite.

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
│   ├── page.tsx           # Home / Create vote
│   ├── v/[voteId]/        # Vote and results pages
│   │   ├── page.tsx       # Voting page (opt-out UX, custom options)
│   │   ├── results/       # Results with voter names
│   │   └── admin/         # Admin panel
│   └── api/votes/         # REST API endpoints
│       ├── route.ts       # Create vote
│       └── [voteId]/
│           ├── route.ts   # GET/DELETE/PATCH vote
│           ├── ballots/   # Submit/view ballots
│           │   ├── route.ts
│           │   └── [ballotId]/route.ts  # Delete ballot
│           └── results/route.ts
└── lib/
    ├── db.ts              # SQLite database layer
    ├── irv.ts             # Pure IRV algorithm
    ├── irv.test.ts        # IRV unit tests
    └── auth.ts            # Secret hashing/validation

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

### Testing
- IRV algorithm has comprehensive unit tests
- Run `npm test` before committing
- Add tests for new business logic

### Documentation Requirements
**CRITICAL:** Before committing any code changes, you MUST update all relevant documentation:
- **CHANGELOG.md** - Document all changes in the Unreleased section
- **PLAN.md** - Update functional scope, change log, and add Decision Records for behavioral changes
- **README.md** - Update usage instructions and key features if user-facing changes
- **CLAUDE.md** - Update schema, features, or guidelines if architecture changes

This ensures all documentation stays synchronized with code and future agents/contributors have accurate context.

### Database
- SQLite via better-sqlite3
- Schema in `src/lib/db.ts`
- Production path: `/var/lib/rcv-lunch/rcv.sqlite`
- Local dev path: `./data/rcv.sqlite`

#### Schema
- **votes table**: `id`, `title`, `options` (JSON), `write_secret_hash`, `voter_names_required` (INTEGER, default 1), `created_at`, `closed_at`
- **ballots table**: `id`, `vote_id`, `rankings` (JSON), `voter_name`, `created_at`

#### Key Functions
- Vote CRUD: `createVote`, `getVote`, `deleteVote`, `voteExists`
- Vote management: `closeVote`, `reopenVote`, `updateVoteOptions`, `appendVoteOptions`
- Ballot operations: `createBallot`, `getBallot`, `getBallotsByVoteId`, `deleteBallot`, `countBallots`

### API Routes
- REST endpoints under `/api/votes/`
- JSON request/response bodies
- Write operations require vote secret

## Deployment

### Environment Variables
```bash
PORT=3100                              # Required
DATABASE_PATH=/var/lib/rcv-lunch/rcv.sqlite  # Production
BASE_URL=https://your-domain.com       # Optional
VOTE_WRITE_SECRET=                     # Optional HMAC secret
```

### Production Checklist
1. Create data directory: `sudo mkdir -p /var/lib/rcv-lunch`
2. Set permissions: `sudo chown $USER:$USER /var/lib/rcv-lunch`
3. Configure nginx (symlink deploy/nginx/rcv-lunch.conf)
4. Start with pm2: `pm2 start deploy/pm2/ecosystem.config.cjs`
5. Set up HTTPS with certbot

See `deploy/README.md` for detailed instructions.

## CI/CD

GitLab CI/CD pipeline runs:
- **lint** - ESLint checks
- **test** - Jest unit tests
- **build** - Next.js production build
- **deploy** - Automated deployment (requires secrets)

See `.gitlab-ci.yml` for configuration.

## Key Files

| File | Purpose |
|------|---------|
| `PLAN.md` | Source of truth for requirements and RCV rules |
| `CLAUDE.md` | This file - development guidelines |
| `docs/refactor-opportunities.md` | Deferred improvements |
| `docs/CHANGELOG.md` | Work history and changes |

## Key Features

### Voting Experience
- **Opt-out UX**: All options start ranked in random order; voters remove unwanted options
- **Custom Options**: Voters can suggest new options (added dynamically for all voters)
- **Optional Voter Names**: Vote creators choose whether names are required (default) or optional; enables both coordinated and anonymous voting
- **Drag & Drop**: Reorder rankings with touch/mouse support (@dnd-kit)

### Admin Capabilities
- **Admin Panel** (`/v/:voteId/admin`): Write-secret protected management interface
  - View all ballots with voter names and timestamps
  - Delete individual ballots or entire vote
  - Close/reopen voting (prevents new submissions when closed)
  - Edit vote options (removes deleted options from existing ballots)

### Vote ID Format
- Alphanumeric characters and dashes allowed (e.g., `friday-lunch`)
- 3-32 characters, case-insensitive (normalized to lowercase)

## RCV Rules (Authoritative)

From PLAN.md - do not modify without recording a Decision Record:

- **Method**: Instant-Runoff Voting (IRV)
- **Majority**: >50% of active (non-exhausted) ballots
- **Elimination**: Remove option with fewest votes each round
- **Exhausted ballots**: Drop out when all ranked options eliminated
- **Tie-breaking**: Lowest first-round total, then lexicographic; if still tied, declare tie

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
