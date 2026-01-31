# Changelog

All notable changes to the Ranked Choice Voting App project.

This document tracks work history, including what was implemented by AI agents and humans.

---

## [Unreleased]

### Changed
- **Discord Notification Messages** - Discord notifications now include the voting secret in the voting link for easier access
  - Voting link includes `?secret=...` parameter so users can vote directly from Discord
  - Results link does not include the secret (public access)
  - Added `voting_secret_plaintext` column to votes table for recurring votes with integrations
  - Backward compatible: existing recurring votes continue working without secrets in links
- **Create Vote UI** - Improved discoverability of advanced options
  - Advanced options now always visible with clear visual separation
  - Removed toggle button - advanced section now has dedicated heading and border
  - Moved auto-close option from main form into Schedule tab
  - Auto-close and recurring schedule are mutually exclusive in Schedule tab

### Fixed
- **System Admin UI** - Moved system-level integration management to a dedicated `/system` page and linked to it from vote creation
- **Create Vote UI** - Moved Discord notification inputs into the advanced options tab (integration ID + admin API secret)
- **Decision Records** - Moved decision records out of `PLAN.md` into `docs/decisions/`

---

## [0.5.0] - 2026-01-31

### Added
- **MIT License** - Added LICENSE file with MIT license for open source distribution
- **Nginx Rate Limiting** - Updated nginx config with protection against disk space exhaustion attacks
  - Rate limiting zones: 1 vote creation/min, 10 API requests/sec per IP
  - Connection limits per IP to prevent resource exhaustion
  - Request body size limit (16KB) to prevent large payload attacks
  - HTTPS with HTTP→HTTPS redirect
  - HSTS header for security
  - Health check endpoint restricted to localhost
  - Updated paths to use `/rcv` basePath prefix
- **Skip CI Support** - CI workflow can be skipped by including `[skip ci]` or `[ci skip]` in commit message
  - Useful for documentation-only or trivial changes
  - Saves GitHub Actions minutes and avoids unnecessary builds
- **Create Vote UI Enhancements**
  - Added recurring schedule fields (period + duration) under advanced options
  - Added Discord integration selection with webhook setup links
  - Introduced Vote/Schedule/Integrations tabs to keep advanced options manageable
- **Recurring Schedule Start Time** - Specify a start day/time so recurring votes open at a defined moment and close after the configured duration
- **Periodic/Recurring Votes** - Create votes that automatically repeat on a schedule
  - Minimum period of 7 days (weekly)
  - Configurable vote duration (how long voting stays open)
  - When a recurring vote auto-closes, a new instance is automatically created
  - All votes in a recurrence group share the same settings and history
  - Background scheduler (node-cron) handles automatic vote creation
  - Protection limits to prevent server overload:
    - `MAX_RECURRING_VOTES_PER_TICK` (default: 10) - Max new votes created per scheduler tick
    - `MAX_ACTIVE_RECURRING_GROUPS` (default: 100) - Max active recurring vote groups system-wide
  - Admin functions for managing recurring votes:
    - `updateRecurringVoteTemplate()` - Update settings for future vote instances
    - `stopRecurringVoteGroup()` - Stop a recurring vote from creating new instances
    - `getVotesInRecurrenceGroup()` - View all historical vote instances
- **Discord Integration** - First-party messaging platform integration
  - Connect Discord webhooks to receive vote notifications
  - Notifications sent when votes are created and when voting closes
  - Notifications include vote title, voting link, results link, and winner
  - Designed for extensibility (Slack and generic webhooks also supported)
- **Integrations API** - Admin endpoints for managing messaging integrations
  - `POST /api/integrations` - Create a new integration
  - `GET /api/integrations` - List all integrations
  - `DELETE /api/integrations/:id` - Delete an integration
  - Requires ADMIN_SECRET authentication

### Changed
- **Build Stability** - Use an in-memory SQLite database during Next.js production build to avoid SQLITE_BUSY errors
- **Integrations API** - Renamed `adminSecret` field to `integrationAdminSecret` when attaching integrations during vote creation
- **System Options UI** - Added hideable system options and require admin-secret validation before showing integration controls
- **Integration Management** - Added UI controls to clear or delete a Discord integration
- **Discord Integration UI Copy** - Clarified that a webhook URL is used to create an integration, and the UI now links to the integrations API docs
- **Discord Integration UI** - Added an in-app panel to create Discord integrations using the admin API
- **Discord Integration UI Access** - Moved Discord integration controls into a System Options section gated by the admin API secret
- **Integration Attachments** - Creating a vote with an integration now requires the admin API secret
- **Env Documentation** - Added `ADMIN_SECRET` to `.env` and `.env.example`
- **CI Node Version** - CI now uses Node.js 20.9+ to satisfy Next.js 16 requirements
- **Lint Configuration**
  - Migrated to ESLint flat config (`eslint.config.js`)
  - Updated `npm run lint` to use ESLint directly with the flat config
- **Next.js Configuration**
  - Replaced deprecated `experimental.serverComponentsExternalPackages` with `serverExternalPackages`
  - Removed obsolete `experimental.instrumentationHook` flag
- **README Documentation** - Updated to reflect current project state
  - Removed outdated GitLab CI references (replaced with GitHub Actions in v0.2.0)
  - Updated CI/CD section to reflect auto-deployment on merge to main (v0.3.1)
  - Updated secret terminology to use "admin secret" and "voting secret" (v0.3.0)
  - Added documentation for separate admin/voting secrets feature
  - Added documentation for Share Message and URL secret support features
  - Improved deployment behavior documentation with health check details
- **AI Agent Guidelines** - Enhanced documentation sync requirements
  - Added "README Consistency Check" section to `AGENTS.md` with proactive verification steps
  - Added "Proactive README Consistency Check" section to `CLAUDE.md` Documentation Requirements
  - AI agents should now automatically check README consistency with CHANGELOG as part of every task
  - Includes specific checks for outdated references, terminology consistency, and feature documentation
- **Refactor Opportunities** - Marked health check endpoint (#23) as implemented

---

## [0.3.1] - 2026-01-26

### Changed
- **CI/CD Auto-Deploy** - Production deployment now triggers automatically on merge to main
  - No longer requires manual workflow dispatch
  - PR events only run CI checks (lint, typecheck, test, build) without deploying

### Fixed
- **Auto-Close Time Timezone Bug** - Fixed bug where setting auto-close time (e.g., 8:00 AM) would save as a different time (e.g., 12:00 AM)
  - Root cause: `datetime-local` input values were sent without timezone info and interpreted as UTC on the server
  - Fix: Client now converts local datetime to proper ISO string before sending to API

---

## [0.3.0] - 2026-01-26

### Added
- **Separate Admin and Voting Secrets** - Votes now have two distinct secrets for better access control
  - Admin secret: For managing the vote (admin panel, editing options, deleting ballots)
  - Voting secret: For submitting ballots (can be shared widely with voters)
  - Backwards compatible: Old votes without voting_secret_hash still work with original secret
- **URL Secret Parameter** - Voting secret can be passed via `?secret=` URL parameter
  - Vote links can include the secret for easy sharing
  - Secret field auto-fills when accessing vote page with parameter
- **Share Message** - New easy-to-copy formatted message after vote creation
  - Includes vote title, voting link with secret, and results link
  - One-click copy for sharing via Slack, email, etc.

### Changed
- **CI/CD Deployment** - Switched from manual SSH/rsync to `appleboy/ssh-action` for more reliable SSH key handling
  - Deployment now pulls from git on the server instead of pushing via rsync
  - Simpler configuration with better error handling
- **Secret Terminology** - Updated UI labels to distinguish admin vs voting secrets
  - "Write Secret" renamed to "Admin Secret" in admin panel
  - "Write Secret" renamed to "Voting Secret" on voting page

### Fixed
- **Production Build Memory Limit** - Added `NODE_OPTIONS="--max-old-space-size=256"` to production build command in CI/CD pipeline to address memory constraints on production host

---

## [0.2.0] - 2026-01-26

### Added
- **Health Check Endpoint** - Added `/api/health` endpoint for deployment verification
  - Returns simple `{"status": "ok"}` response
  - Used by CI/CD pipeline for post-deploy health checks
  - Intended to be restricted to localhost via nginx configuration

### Changed
- **CI/CD Pipeline** - Removed GitLab CI configuration in favor of GitHub Actions
  - Deleted `.gitlab-ci.yml` file (GitHub Actions is now the primary CI/CD system)
  - Enhanced GitHub Actions deploy job with post-deploy verification
  - Added health check polling after pm2 restart (15 attempts with 2s intervals)
  - Deploy job now fails fast if health check doesn't pass within 30 seconds
  - Dumps pm2 logs on health check failure for debugging

### Fixed
- **Duplicate Base Path in Client-Side Navigation** - Removed `withBasePath()` from `router.push()` and `router.replace()` calls to prevent double `/rcv/rcv` prefixing. Next.js automatically applies `basePath` from config to client-side navigation, so the helper is only needed for server-side API calls.

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




