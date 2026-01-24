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
│   └── api/votes/         # REST API endpoints
└── lib/
    ├── db.ts              # SQLite database layer
    ├── irv.ts             # Pure IRV algorithm
    ├── irv.test.ts        # IRV unit tests
    └── auth.ts            # Secret hashing

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

### Database
- SQLite via better-sqlite3
- Schema in `src/lib/db.ts`
- Production path: `/var/lib/rcv-lunch/rcv.sqlite`
- Local dev path: `./data/rcv.sqlite`

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
