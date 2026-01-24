# Changelog

All notable changes to the RCV Lunch Picker project.

This document tracks work history, including what was implemented by AI agents and humans.

---

## [Unreleased]

### Added
- `CLAUDE.md` - Best practices and development guidelines for AI agents and contributors
- `.gitlab-ci.yml` - GitLab CI/CD pipeline with lint, test, build, and deploy stages
- `docs/CHANGELOG.md` - This file documenting work history
- `docs/archive/` - Archive directory for superseded documentation

### Changed
- Archived `AI-SEED-PROMPT.md` to `docs/archive/` (original purpose fulfilled)

### CI/CD Pipeline Details
The GitLab CI/CD pipeline includes:
- **validate stage**: ESLint + TypeScript type checking
- **test stage**: Jest unit tests with coverage reporting
- **build stage**: Next.js production build
- **deploy stage**: SSH-based deployment (requires secrets configuration)

Deployment is currently set to manual trigger with placeholders for:
- `DEPLOY_HOST` - Server hostname
- `DEPLOY_USER` - SSH username
- `DEPLOY_SSH_KEY` - SSH private key (file type)
- `DEPLOY_PATH` - Application directory on server

---

## [1.0.0] - 2026-01-24

### Initial MVP Implementation (Phases 1-3)

Implemented by AI agent from `AI-SEED-PROMPT.md` instructions.

#### Phase 1: Core App Skeleton
- Project setup with Next.js 14 (App Router), TypeScript, SQLite
- Database schema and initialization (`src/lib/db.ts`)
- Vote creation flow (`src/app/page.tsx`)
- Vote page with ranking UI (`src/app/v/[voteId]/page.tsx`)
- Ballot submission API (`src/app/api/votes/[voteId]/ballots/route.ts`)

#### Phase 2: RCV Engine & Results
- Pure IRV algorithm (`src/lib/irv.ts`)
- Comprehensive unit tests (`src/lib/irv.test.ts`)
- Results API (`src/app/api/votes/[voteId]/results/route.ts`)
- Results UI with round-by-round breakdown (`src/app/v/[voteId]/results/page.tsx`)

#### Phase 3: Deployment Assets
- pm2 ecosystem config (`deploy/pm2/ecosystem.config.cjs`)
- nginx site template (`deploy/nginx/rcv-lunch.conf`)
- Deployment README (`deploy/README.md`)
- Environment configuration (`.env.example`)

#### Documentation
- `README.md` - User-facing documentation
- `docs/refactor-opportunities.md` - Intentionally deferred improvements

### Technical Details
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite via better-sqlite3
- **Testing**: Jest
- **Port**: 3100 (isolated from other apps)

### Security
- Per-vote write secrets (bcrypt hashed)
- No user accounts (intentionally simple)

---

## [0.0.1] - 2026-01-24

### Initial Planning

Created by human (David).

- `PLAN.md` - Project requirements, RCV rules, and execution phases
- `AI-SEED-PROMPT.md` - Instructions for AI agent implementation

---

## Versioning

This project uses semantic versioning:
- **MAJOR**: Breaking changes to user-facing behavior or API
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, documentation updates

---

## Contributors

- **Human**: David (project owner, planning, decisions)
- **AI Agent**: Initial MVP implementation (Phases 1-3)
- **AI Agent**: Repository cleanup and CI/CD setup (current)
