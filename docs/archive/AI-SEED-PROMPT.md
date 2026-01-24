> **ARCHIVED**: This file was the original seed prompt used to bootstrap the MVP implementation (Phases 1-3).
> It has been moved to `docs/archive/` as it served its purpose and ongoing development practices
> are now documented in `CLAUDE.md` at the repository root.
>
> Archived: 2026-01-24

---

# Original AI Seed Prompt

Implement the "RCV Lunch Picker" app described in PLAN.md.

Hard rules (must follow)
- Make changes additive and isolated. Do NOT overwrite existing deployment paths, nginx sites, or scripts used by other apps in this repo.
- If you discover existing deployment conventions, do not replace them; align where safe and otherwise document the differences.
- Use DigitalOcean droplet assumptions: nginx + pm2 may already be serving other apps.
- Port isolation: default PORT=3100 (do not default to 3000).
- Site isolation: do NOT edit existing nginx configs in place; add a new template at /deploy/nginx/rcv-lunch.conf with symlink instructions.
- Process isolation: add /deploy/pm2/ecosystem.config.cjs with a unique pm2 process name: rcv-lunch.
- Data isolation: use SQLite stored outside repo; default DATABASE_PATH=/var/lib/rcv-lunch/rcv.sqlite; document directory creation and permissions in /deploy/README.md.

What to build (MVP)
- Pages:
  - Create vote page: /create (or /)
  - Vote page: /v/:voteId
  - Results page: /v/:voteId/results
- voteId must be alphanumeric only, canonicalized to lowercase, and mixed-case requests should redirect to lowercase.
- Ballot submission:
  - Ranking UI (drag/drop or up/down; must work on mobile)
  - Partial ranking allowed
  - Requires per-vote write secret to submit ballots
- IRV algorithm:
  - Count first-choice among active ballots
  - Majority is >50% of active ballots
  - Eliminate lowest and redistribute
  - Exhausted ballots drop out
  - Deterministic tie-breaking; if still tied, declare tie
- Results page must show: winner (or tie), participation count, and round-by-round tallies + eliminated option + active ballot count.

Security (MVP)
- Per-vote write secret:
  - Creator sets optional passcode OR server generates secret
  - Store only a hash (bcrypt/scrypt/argon2 OR HMAC using VOTE_WRITE_SECRET)
  - Show creator the secret once on creation; voters must provide secret to submit
- Keep it simple; no user accounts.

Tech choices
- Prefer Next.js App Router with API routes or server actions.
- Use SQLite via better-sqlite3 (preferred) OR Prisma+SQLite if that’s simpler in this repo.
- Implement IRV as a pure function with unit tests.

Deliverables
1) App implementation
  - DB schema/init
  - Create/vote/results pages
  - API endpoints for create, submit ballot, fetch results
  - IRV engine + unit tests
  - Minimal styling and validation/error states
2) Deployment assets (additive)
  - /deploy/nginx/rcv-lunch.conf
  - /deploy/pm2/ecosystem.config.cjs
  - /deploy/README.md with step-by-step droplet setup and commands
3) Docs
  - .env.example with PORT=3100, DATABASE_PATH, BASE_URL, optional VOTE_WRITE_SECRET
  - /docs/refactor-opportunities.md listing ideas you did NOT implement to avoid disrupting existing code paths
  - Update top-level README with local + production + DO deploy instructions

Workflow constraints
- Make a single PR with all changes.
- Keep commits logical.
- PR description must include:
  - What was added
  - How to run locally
  - How to deploy to DigitalOcean
  - Risks/assumptions
  - Refactor opportunities

Execution steps
- First, read PLAN.md and treat it as the source of truth.
- Then implement Phases 1–3 from PLAN.md (core skeleton, IRV/results, deploy assets). Light UX polish is fine but don’t expand scope.
- Do not ask questions unless you are truly blocked; make reasonable assumptions and document them.

Start now by:
- Inspecting the repo for existing tooling conventions (Node version, package manager, lint/test setup).
- Choosing Next.js vs Express based on repo fit.
- Creating an initial runnable skeleton on PORT=3100 with SQLite persistence outside repo.
