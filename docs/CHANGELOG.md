# Changelog

All notable changes to the Ranked Choice Voting App project.

This document tracks work history, including what was implemented by AI agents and humans.

---

## [Unreleased]

### Added
- **Base Path Support**
  - Standardized `/rcv` deployment with `basePath` and shared `withBasePath()` helper
  - Updated internal navigation, API calls, and redirects to respect the base path
  - Documented `/rcv` prefix in deployment and API docs
- **Auto-Close Feature** - Schedule automatic vote closing
  - Added `auto_close_at` column to votes table with migration support
  - Date/time picker on vote creation form
  - Automatic vote closing when deadline passes (checked on vote access)
  - Display auto-close time on voting page
  - Admin panel support for setting/changing auto-close time
  - API support for auto-close parameter
- **REST API Documentation** (`docs/API.md`)
  - Comprehensive API docs for programmatic vote creation
  - Examples for curl, Node.js, and automated workflows
  - All endpoints documented with request/response formats
- **API Key Management System**
  - New `api_keys` table for tracking API keys
  - Admin endpoint (`/api/admin/api-keys`) for creating/listing/deleting API keys
  - Requires `ADMIN_SECRET` environment variable for admin access
  - API key generation with `rcv_` prefix
  - Last-used timestamp tracking (infrastructure for future rate limiting)
- **Logo and Visual Branding**
  - Added `public/logo.png` for site branding
  - Logo displayed in header (responsive: 96px desktop, 80px mobile)
  - Replaced text branding with image logo
- **Persistent Options** - Vote creation form remembers last-used options in localStorage
- **Admin Panel** (`src/app/v/[voteId]/admin/page.tsx`)
  - Authentication with write secret
  - View all ballots with voter names and timestamps
  - Delete individual ballots
  - Delete entire vote
  - Close/reopen voting
  - Set/change auto-close date/time
  - Edit vote options (removes deleted options from existing ballots)
  - Admin URL provided on vote creation page
- **Custom "Other" Options**
  - Voters can suggest new options during ballot submission
  - Custom options are added to rankings and become available for other voters
  - Duplicate checking (case-insensitive)
- **Optional Voter Names** - Vote creators can choose whether voter names are required or optional
  - Added `voter_names_required` column to votes table with migration support
  - Checkbox on vote creation form to toggle requirement (default: required)
  - When optional, ballots can be submitted anonymously
  - Anonymous ballots displayed as "Anonymous" on results and admin pages
  - Enables both coordinated (named) and anonymous voting use cases
- `CLAUDE.md` - Best practices and development guidelines for AI agents and contributors
- `.gitlab-ci.yml` - GitLab CI/CD pipeline with lint, test, build, and deploy stages
- `.github/workflows/ci.yml` - GitHub Actions workflow mirroring lint, typecheck, test, build, and manual deploy
- `docs/CHANGELOG.md` - This file documenting work history
- `docs/archive/` - Archive directory for superseded documentation

### Changed
- **Project rebranding** - App renamed to Ranked Choice Voting App
  - Updated README with new branding and logo
  - Emphasizes app is not lunch-specific
  - More professional and general-purpose branding
- **Visual branding** - Replaced text header with logo image
  - Added `public/logo.png` for site branding
  - Updated Header component to use Next.js Image component
  - Responsive logo sizing (96px desktop, 80px mobile)
- **Vote creation UX** - Options are now persisted in localStorage
  - Last used options automatically load on page refresh
  - Saves time for repeat vote creators
  - Safe fallback if localStorage is unavailable
- **Vote ID format** - Now allows dashes in addition to letters and numbers (e.g., `team-lunch`)
- **Voting UX** - Changed from opt-in to opt-out behavior
  - All options now start pre-ranked in random order
  - Voters remove unwanted options instead of adding desired ones
  - Reduces cognitive load and prevents ballot exhaustion
- **Generic branding** - Replaced "Friday Lunch" example text with "Team Lunch Decision" to emphasize app is not lunch-specific

### Fixed
- **Base path duplication** - Normalized `withBasePath()` to prevent `/rcv/rcv` links in client navigation and shared URLs
- **Cross-platform compatibility** - Fixed `package.json` scripts to use hardcoded port 3100 instead of bash variable expansion
- Archived `AI-SEED-PROMPT.md` to `docs/archive/` (original purpose fulfilled)

### Database Changes
- Added `auto_close_at TEXT` column to `votes` table
- Added `api_keys` table with columns: `id`, `key_hash`, `name`, `created_at`, `last_used_at`
- Added `voter_name TEXT NOT NULL` column to `ballots` table
- Added `voter_names_required INTEGER NOT NULL DEFAULT 1` column to `votes` table
- Added `setAutoCloseAt()` function for managing auto-close times
- Added API key management functions: `createApiKey()`, `getApiKeyByHash()`, `getAllApiKeys()`, `updateApiKeyLastUsed()`, `deleteApiKey()`
- Added `appendVoteOptions()` function for dynamic option addition
- Database migrations handle existing data gracefully
- Auto-close functionality integrated into `getVote()` - automatically closes votes when deadline passes

### CI/CD Pipeline Details
The GitHub Actions workflow (`.github/workflows/ci.yml`) includes:
- **lint job**: ESLint checks
- **typecheck job**: TypeScript type checking
- **test job**: Jest unit tests with coverage reporting
- **build job**: Next.js production build
- **deploy_production job**: SSH-based deployment (manual trigger)

GitLab CI/CD configuration remains available in `.gitlab-ci.yml` if needed.

Deployment is currently set to manual trigger with placeholders for:
- `DEPLOY_HOST` - Server hostname
- `DEPLOY_USER` - SSH username
- `DEPLOY_SSH_KEY` - SSH private key
- `DEPLOY_PATH` - Application directory on server
- `DEPLOY_PORT` - SSH port (optional, default: 22)
- `PM2_PROCESS_NAME` - pm2 process name (optional, default: rcv-lunch)

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




