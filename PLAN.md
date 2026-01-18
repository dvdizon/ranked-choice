# PLAN.md  
**Project:** RCV Lunch Picker  
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
  - User chooses a voteId (alphanumeric only) or one is generated
  - User enters options (e.g., restaurants)
  - Optional write secret (passcode)

- **Vote**
  - Accessible at `/v/:voteId`
  - Rank options (drag/drop or up/down)
  - Partial ranking allowed
  - Requires write secret to submit

- **View Results**
  - Accessible at `/v/:voteId/results`
  - Shows:
    - Winner (or tie)
    - Total ballots
    - Round-by-round tallies
    - Eliminated option per round
    - Active ballot count per round

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

- YYYY-MM-DD — Initial plan created

---

## 11. Status Snapshot (Living Section)

- Current phase: **Phase 0 — Planning**
- Next step: **Run Codex with execution prompt**
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

