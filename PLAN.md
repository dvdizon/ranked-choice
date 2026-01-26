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
  - Deterministic (e.g., lowest first-round total, then lexicographic option ID)
  - If still tied, declare a tie and stop

Any change to these rules **must be recorded in the Decision Records section**.

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
- 2026-01-24 — Initial plan created

---

## 11. Status Snapshot (Living Section)

- Current phase: **Phase 4+ — UX Enhancements & Features**
- Recent additions: Admin panel, voter names, custom options, opt-out UX
- Next step: Testing and refinement
- Known blockers: _None_

---

## 12. Decision Records

This section tracks **explicit decisions** about behavior, rules, and implementation choices.
Each record captures *what* was decided, *why*, and *what it affects*.

Decision records are:
- Human-readable (for friends)
- Machine-legible (for Codex and future agents)
- Append-only (do not rewrite history)

---

### Decision Record Template

**Decision ID:** DR-YYYY-MM-DD-##  
**Status:** Proposed | Accepted | Rejected | Superseded  
**Date:** YYYY-MM-DD  
**Deciders:** (names / group)

#### Context
What problem or uncertainty prompted this decision?

#### Options Considered
- **Option A:**  
  Short description
- **Option B:**  
  Short description
- _(Optional)_ Option C

#### Decision
What was chosen?

#### Rationale
Why this option was selected over the others.

#### Consequences
What does this decision affect?
- Behavior
- UX
- Technical constraints
- Future flexibility

#### Scope
- [ ] Voting rules
- [ ] UX / product behavior
- [ ] Security / abuse prevention
- [ ] Deployment / ops
- [ ] Data model
- [ ] Other: ________

#### Notes
Optional clarifications, edge cases, or follow-ups.

---

### DR-2026-01-25-01: Non-Anonymous Voting with Voter Names

**Decision ID:** DR-2026-01-25-01
**Status:** Superseded by DR-2026-01-25-05
**Date:** 2026-01-25
**Deciders:** User (David)

#### Context
The original design had anonymous ballots. For coordination purposes (meeting up after voting), users needed to know who voted and what their preferences were.

#### Options Considered
- **Option A: Keep ballots anonymous**
  - Maintains privacy but prevents coordination
- **Option B: Add required voter name field**
  - Enables coordination and accountability
  - Names visible to all voters and admin

#### Decision
Implement Option B - Add required voter name field to all ballots.

#### Rationale
- Primary use case is coordinating meetups among friends
- Transparency helps with trust and coordination
- Users are already sharing a write secret, so not truly anonymous
- Voter names enable post-vote discussion and planning

#### Consequences
- `ballots` table requires `voter_name` column
- Database migration needed for existing data
- Ballot submission UI requires name input
- Results page displays all voter names
- Admin panel shows voter names for each ballot

#### Scope
- [x] UX / product behavior
- [x] Data model

---

### DR-2026-01-25-02: Opt-Out Voting Behavior

**Decision ID:** DR-2026-01-25-02
**Status:** Accepted
**Date:** 2026-01-25
**Deciders:** User (David)

#### Context
Original voting UX was opt-in: voters manually added options they wanted to rank. This created cognitive burden and could lead to ballot exhaustion if voters forgot to add preferred options.

#### Options Considered
- **Option A: Keep opt-in (add what you want)**
  - Voters click "+" to add options to rankings
  - Empty rankings by default
- **Option B: Opt-out (remove what you don't want)**
  - All options pre-ranked in random order
  - Voters remove unwanted options
  - Reduces cognitive load

#### Decision
Implement Option B - Start with all options ranked in randomized order.

#### Rationale
- Reduces voter effort and cognitive load
- Prevents accidental ballot exhaustion from forgetting to add options
- Random initial order prevents positional bias
- Aligns with "choose what NOT to do" mental model
- Better default for small groups deciding where to eat

#### Consequences
- Voting page loads with all options already ranked
- Fisher-Yates shuffle ensures randomization
- "Removed Options" section appears only after removal
- Help text updated to reflect opt-out behavior

#### Scope
- [x] UX / product behavior

---

### DR-2026-01-25-03: Dynamic "Other" Options

**Decision ID:** DR-2026-01-25-03
**Status:** Accepted
**Date:** 2026-01-25
**Deciders:** User (David)

#### Context
Voters sometimes think of options not included in the original list. Enabling dynamic option addition allows for more flexible decision-making.

#### Options Considered
- **Option A: Fixed options only**
  - Only vote creator can set options
  - No changes after vote creation
- **Option B: Allow voters to suggest "Other" options**
  - Voters can add custom options during ballot submission
  - Custom options become available for subsequent voters
  - Case-insensitive duplicate checking

#### Decision
Implement Option B - Allow voters to add custom options dynamically.

#### Rationale
- Enables discovery of options not initially considered
- Maintains flexibility for casual group decisions
- New options become part of the vote organically
- Supports use case: someone suggests a new restaurant

#### Consequences
- Voting UI includes "+ Add Custom Option" button
- Custom options sent with ballot submission
- `appendVoteOptions()` function adds options to vote
- Duplicate checking prevents redundant options
- Custom options appear for all subsequent voters
- Admin can still manage options via admin panel

#### Scope
- [x] UX / product behavior
- [x] Data model

---

### DR-2026-01-25-04: Admin Panel for Vote Management

**Decision ID:** DR-2026-01-25-04
**Status:** Accepted
**Date:** 2026-01-25
**Deciders:** User (David)

#### Context
Vote creators needed way to manage their votes: view ballots, handle mistakes, remove inappropriate submissions, and control voting state.

#### Options Considered
- **Option A: Read-only votes**
  - No admin capabilities
  - Votes immutable after creation
- **Option B: Admin panel with write secret authentication**
  - View all ballots
  - Delete ballots/votes
  - Close/reopen voting
  - Edit options

#### Decision
Implement Option B - Full-featured admin panel.

#### Rationale
- Vote creators need control over their votes
- Enables error correction (delete duplicate/test ballots)
- Allows closing vote when decision is made
- Write secret provides sufficient authentication for small groups
- Editing options enables adding forgotten choices

#### Consequences
- New route: `/v/:voteId/admin`
- Admin URL provided at vote creation
- Database functions: `deleteVote`, `deleteBallot`, `closeVote`, `reopenVote`, `updateVoteOptions`
- API routes: DELETE and PATCH on `/api/votes/:voteId`
- Closed votes prevent new ballot submissions
- Editing options cleans up existing ballots (removes deleted options)

#### Scope
- [x] UX / product behavior
- [x] Security / abuse prevention
- [x] Data model

---

### DR-2026-01-25-05: Optional Voter Names (Supersedes DR-2026-01-25-01)

**Decision ID:** DR-2026-01-25-05
**Status:** Accepted
**Date:** 2026-01-25
**Deciders:** User (David)

#### Context
Initially implemented required voter names for all votes (DR-2026-01-25-01). User realized this prevented anonymous voting use cases. The app should support both coordinated (named) and anonymous voting, with the vote creator deciding which to use.

#### Options Considered
- **Option A: Keep voter names always required**
  - Maintains coordination capability
  - Prevents anonymous voting use cases
- **Option B: Make voter names optional per vote**
  - Vote creator chooses requirement during vote creation
  - Checkbox on creation form (default: required)
  - Supports both anonymous and coordinated voting

#### Decision
Implement Option B - Vote creators decide whether names are required.

#### Rationale
- Flexibility for different use cases (some groups want anonymity, others want coordination)
- Vote creator knows their group's needs best
- Default to required (coordination use case) but allow anonymous option
- Maintains backward compatibility (defaults to required like before)
- Simple UI: single checkbox on creation form

#### Consequences
- Added `voter_names_required` column to `votes` table (INTEGER, default 1)
- Vote creation UI includes checkbox (default: checked)
- Ballot submission conditionally validates voter name
- Voting page shows name field as "optional" when not required
- Results and admin panels display "Anonymous" for empty voter names
- API responses include `voter_names_required` field

#### Scope
- [x] UX / product behavior
- [x] Data model

#### Notes
- Supersedes DR-2026-01-25-01 (voter names always required)
- Empty voter_name is stored as empty string in database
- Migration adds column with default value 1 (required) for existing votes

---


### DR-2026-01-25-06: Auto-Close Voting Deadlines

**Decision ID:** DR-2026-01-25-06
**Status:** Accepted
**Date:** 2026-01-25
**Deciders:** User (David)

#### Context
Vote creators wanted a way to set a deadline so voting ends automatically without requiring manual admin action.

#### Options Considered
- **Option A: Manual close only**
  - Admin must close votes when finished
  - Requires active management
- **Option B: Optional auto-close date/time**
  - Creator sets a deadline during creation or in admin panel
  - Vote closes automatically when deadline passes

#### Decision
Implement Option B - Optional auto-close date/time per vote.

#### Rationale
- Reduces ongoing admin burden
- Prevents votes from being left open accidentally
- Fits common use case of time-boxed decisions
- Keeps manual close available when needed

#### Consequences
- Added `auto_close_at` column to `votes`
- Vote creation supports an optional auto-close input
- Admin panel can set/change/remove auto-close time
- Vote auto-closes when deadline passes (checked on access)
- API supports `autoCloseAt` and `setAutoClose`

#### Scope
- [x] UX / product behavior
- [x] Data model

---

### DR-2026-01-25-07: Admin API Keys for Programmatic Access

**Decision ID:** DR-2026-01-25-07
**Status:** Accepted
**Date:** 2026-01-25
**Deciders:** User (David)

#### Context
There is a need for programmatic vote creation and future rate limiting, which requires a way to track API clients securely.

#### Options Considered
- **Option A: No API keys**
  - Keep endpoints open without tracking
  - Harder to rate-limit or audit usage
- **Option B: Admin-managed API keys**
  - Admin can create/list/delete keys
  - Keys stored hashed for security
  - Establishes infrastructure for future rate limiting

#### Decision
Implement Option B - Admin-managed API keys with secure storage.

#### Rationale
- Enables programmatic access without user accounts
- Prepares for rate limiting and auditing
- Keeps management simple via admin secret
- Avoids exposing raw keys in storage

#### Consequences
- Added `api_keys` table with hashed keys and usage timestamps
- New admin endpoint `/api/admin/api-keys` protected by `ADMIN_SECRET`
- API key generation with `rcv_` prefix and secure hashing
- REST API documentation added for programmatic access

#### Scope
- [x] Security / abuse prevention
- [x] Data model

#### Notes
- API keys are managed for now; enforcement may be added later

---

### DR-2026-01-26-01: Serve the App Under `/rcv` When Sharing a Domain

**Decision ID:** DR-2026-01-26-01
**Status:** Accepted
**Date:** 2026-01-26
**Deciders:** User (David)

#### Context
The app is hosted alongside other services on the same domain, so it needs a
stable subpath to avoid conflicts and broken assets.

#### Options Considered
- **Option A: Serve at the domain root**
  - Simplifies routing but conflicts with existing root redirects
- **Option B: Serve under `/rcv` with a base path**
  - Keeps other root behavior intact
  - Requires basePath-aware links and API calls

#### Decision
Implement Option B - serve the app under `/rcv` and normalize internal paths.

#### Rationale
- Preserves existing root redirect behavior
- Keeps nginx isolation consistent with other apps
- Makes asset and API URLs predictable under a shared domain

#### Consequences
- `next.config.js` sets `basePath: '/rcv'`
- Internal navigation uses `withBasePath()` helper
- API docs and deployment instructions note the `/rcv` prefix

#### Scope
- [x] Deployment / ops
- [x] UX / product behavior

#### Notes
- If deployment changes to root hosting, remove the basePath and helper usage.

---
