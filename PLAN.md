# PLAN.md  
**Project:** Ranked Choice Voting App  
**Status:** 🟡 Planning  
**Owner:** David  
**Audience:** Friends & contributors  
**Execution model:** Codex-driven, additive changes only

---

## 1. Purpose & Intent

This project is a **small, self-hosted web app** to help a group of friends decide things like **where to eat for lunch** using **Ranked Choice Voting (RCV / IRV)**.

Primary goals:
- Fair, transparent decision-making
- Very low operational complexity
- Easy to deploy on a **small DigitalOcean droplet**
- Easy for non-technical friends to understand and trust

Non-goals:
- No public elections
- No large-scale auth system
- No analytics, ads, or growth features
- No cloud-managed database dependencies

---

## 2. Guiding Principles (Execution Rules)

These rules apply to *all* implementation decisions:

1. **Isolation first**
   - Must not interfere with other apps on the droplet
   - Separate port, separate nginx site, separate pm2 process, separate data directory

2. **Additive changes only**
   - Never overwrite existing repo behavior
   - If unsure, document instead of changing

3. **Simple > clever**
   - Prefer boring, understandable solutions
   - Friends should be able to reason about outcomes

4. **Deterministic behavior**
   - RCV outcomes must be reproducible
   - Tie-breaking rules must be explicit

5. **Explainability**
   - Results must show *how* the winner was chosen, not just *who* won

---

## 3. Functional Scope (MVP)

### Core User Flows

- **Create a vote**
  - User chooses a voteId (alphanumeric and dashes) or one is generated
  - User enters options (e.g., restaurants)
  - Optional write secret (passcode)
  - Toggle to require voter names (default: required, can disable for anonymous voting)
  - Optional auto-close date/time (deadline)
  - Receives admin URL for vote management

- **Vote**
  - Accessible at `/v/:voteId`
  - All options start ranked in random order (opt-out behavior)
  - Reorder by drag/drop or up/down buttons
  - Remove unwanted options
  - Add custom "Other" options (become available for other voters)
  - Enter voter name (required/optional based on vote settings, visible to all when provided)
  - Requires write secret to submit

- **View Results**
  - Accessible at `/v/:voteId/results`
  - Shows:
    - Winner (or tie)
    - Total ballots
    - Round-by-round tallies
    - Eliminated option per round
    - Active ballot count per round
    - All ballots with voter names (or "Anonymous") and rankings

- **Admin Panel**
  - Accessible at `/v/:voteId/admin`
  - Requires write secret authentication
  - View all ballots with voter details
  - Delete individual ballots or entire vote
  - Close/reopen voting
  - Set/change auto-close date/time
  - Edit vote options

---

## 4. Ranked Choice Voting Rules (Authoritative)

These rules are **locked unless explicitly changed**:

- Counting method: **Instant-Runoff Voting (IRV)**
- Majority threshold: **>50% of active (non-exhausted) ballots**
- Exhausted ballots:
  - If all ranked options are eliminated, ballot no longer counts
- Elimination:
  - Eliminate option with the fewest votes in the round
- Tie-breaking:
  - Deterministic (lowest weighted ranking support, then lowest first-round total, then lexicographic option ID)
  - If still tied, declare a tie and stop

Any change to these rules **must be recorded in `docs/decisions/`**.

---

## 5. Technical Architecture (Decided)

### Runtime
- Node.js
- Single process
- Port: **3100 (default)**

### App Framework
- Next.js (App Router) **OR**
- Express + minimal frontend  
(Exact choice to be confirmed early in Phase 1)

### Persistence
- SQLite
- File stored outside repo:
  - `/var/lib/rcv-lunch/rcv.sqlite`

### Process Management
- pm2
- Process name: `rcv-lunch`

### Reverse Proxy
- nginx
- Separate site config
- No edits to existing server blocks

---

## 6. Security & Abuse Prevention (MVP)

- No user accounts
- No OAuth
- Write protection via **per-vote write secret**
  - Creator sets passcode OR server generates one
  - Only a hash is stored
  - Secret shown once at creation
- Goal: prevent casual ballot stuffing, not malicious actors

---

## 7. Execution Phases

### Phase 0 — Planning (Current)

**Goal:** Align on behavior and constraints

Tasks:
- [x] Define RCV rules
- [x] Define deployment constraints
- [x] Define abuse prevention model
- [x] Write PLAN.md

Exit criteria:
- Friends agree on rules & scope
- Ready to execute with Codex

---

### Phase 1 — Core App Skeleton

**Goal:** App runs locally, no polish

Tasks:
- [ ] Project setup
- [ ] DB schema / initialization
- [ ] Vote creation flow
- [ ] Vote page (ranking UI)
- [ ] Ballot submission endpoint

Exit criteria:
- Can create a vote and submit ballots locally

---

### Phase 2 — RCV Engine & Results

**Goal:** Correct, explainable results

Tasks:
- [ ] Implement pure IRV function
- [ ] Unit tests for IRV logic
- [ ] Results API
- [ ] Results UI with round breakdown

Exit criteria:
- Results are correct and reproducible
- Tests cover edge cases

---

### Phase 3 — Deployment Assets

**Goal:** Safe deployment on a shared droplet

Tasks:
- [ ] pm2 ecosystem config
- [ ] nginx site template
- [ ] Data directory instructions
- [ ] `/deploy/README.md`

Exit criteria:
- App can be deployed without affecting existing apps

---

### Phase 4 — UX Polish & Guardrails

**Goal:** Pleasant and safe for friends

Tasks:
- [ ] Validation & error states
- [ ] Basic styling
- [ ] Empty / edge case handling
- [ ] Copy tweaks for clarity

Exit criteria:
- Friends can use it without explanation

---

## 8. Open Questions (For Friends)

These are **explicit decision points** to discuss before or during Phase 1:

1. Should vote IDs be:
   - User-chosen?
   - Auto-generated only?
   - Both?

2. Should votes be:
   - Editable after creation?
   - Lockable after first ballot?

3. Should results be:
   - Always visible?
   - Hidden until vote is closed?

4. Tie handling:
   - Declare tie?
   - Deterministic elimination?
   - Re-vote?

Decisions will be recorded below.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|-----|-----------|
| Friends dispute outcome | Show round-by-round results |
| Accidental overwrite of other app | Port + nginx + pm2 isolation |
| Lost data on redeploy | SQLite outside repo |
| Scope creep | PLAN.md is the contract |

---

## 10. Change Log

All meaningful behavior changes must be logged here.

- 2026-01-24 — Initial plan created
- 2026-01-25 — Added auto-close voting deadlines (create + admin control)
- 2026-01-25 — Added admin API key management (ADMIN_SECRET protected)
- 2026-01-25 — Added REST API documentation for programmatic access
- 2026-01-25 — Added logo branding and header image
- 2026-01-25 — Persisted last-used vote options in localStorage
- 2026-01-25 — Made voter names optional (creator decides) - Supersedes DR-2026-01-25-01, See DR-2026-01-25-05
- 2026-01-25 — Replaced "Friday Lunch" with generic examples (not lunch-specific)
- 2026-01-25 — Added voter names (non-anonymous ballots) - Superseded by DR-2026-01-25-05
- 2026-01-25 — Changed to opt-out voting behavior (all options pre-ranked) - See DR-2026-01-25-02
- 2026-01-25 — Added dynamic "Other" options - See DR-2026-01-25-03
- 2026-01-25 — Added admin panel with full vote management - See DR-2026-01-25-04
- 2026-01-25 — Allowed dashes in vote IDs (e.g., team-lunch)
- 2026-01-26 — Standardized base path handling for `/rcv` deployments (links, API calls, redirects)
- 2026-01-26 — Deduplicated base path prefixes in internal navigation links
- 2026-01-26 — Added GitHub Actions CI workflow mirroring lint, typecheck, test, build, and manual deploy
- 2026-01-31 — Added periodic/recurring votes feature (min weekly) - See DR-2026-01-31-01
- 2026-01-31 — Added Discord integration for messaging notifications - See DR-2026-01-31-02
- 2026-01-31 — Added create-vote UI for recurring schedule and Discord integration (tabbed advanced options)
- 2026-01-31 — Updated CI to Node 20.9+ to match Next.js requirements
- 2026-01-31 — Added recurring vote start date/time input to control when votes open
- 2026-01-31 — Clarified Discord integration UI copy and docs link for integration IDs
- 2026-01-31 — Added Discord integration creation panel in the Integrations tab
- 2026-01-31 — Moved Discord integration controls into a System Options section gated by admin secret
- 2026-01-31 — Require admin secret to attach an integration when creating a vote
- 2026-01-31 — Documented ADMIN_SECRET in .env and .env.example
- 2026-01-31 — Use in-memory SQLite during Next.js build to avoid locked DB errors
- 2026-01-31 — Renamed integration attach payload field to integrationAdminSecret
- 2026-01-31 — Hide system options until admin secret is validated
- 2026-01-31 — Added UI controls to clear or delete Discord integrations
- 2026-01-31 — Moved system integration management to a dedicated /system admin page
- 2026-01-31 — Moved Discord notification inputs into the advanced options tab on create vote
- 2026-02-01 — Added system admin live votes list with close/delete actions and re-create links
- 2026-01-31 — Styled system admin re-create vote action to match button UI
- 2026-02-05 — Send recurring vote notifications when voting opens (recurrence_start_at) and add Discord test messages
- 2026-02-05 — Fixed Discord notification URLs to avoid double `/rcv` when BASE_URL already includes the base path
- 2026-02-12 — Added weighted elimination tie-breaker for IRV and mobile drag handles with dedicated grip control
- 2026-02-12 — Added contest ID display on vote and results pages for easier identification
- 2026-02-12 — Fixed recurring notifications to avoid delayed close notices and late open alerts after auto-close
- 2026-02-12 — Added automatic second-round runoff vote creation + integration notification for pure IRV ties
- 2026-02-13 — Added manual tie-breaker runoff trigger in vote admin + system admin, plus system-level reopen controls that preserve prior-round ballots
- 2026-02-13 — Added recurring contest ID formatting tokens and admin contest ID rename support - See DR-2026-02-13-02
- 2026-02-13 — Updated tie-breaker runoffs to close-and-trigger when requested, use `-runoff-1` IDs, and expose copyable vote admin secrets in system admin - See DR-2026-02-13-01

---

## 11. Status Snapshot (Living Section)

- Current phase: **Phase 4+ — UX Enhancements & Features**
- Recent additions: Admin panel, voter names, custom options, opt-out UX
- Next step: Testing and refinement
- Known blockers: _None_

---

## 12. Decision Records

Decision records are now stored in `docs/decisions/`.
See `docs/decisions/README.md` for the template and index.
