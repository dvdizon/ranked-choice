# RCV Lunch Picker

A small, self-hosted web app for helping a group of friends make fair decisions  
(like where to eat for lunch) using **Ranked Choice Voting (RCV / IRV)**.

This project is intentionally:
- Simple
- Transparent
- Easy to deploy on a small server
- Friendly to both humans and AI agents

---

## What This Is

RCV Lunch Picker lets a group:
1. Create a vote with a short, shareable ID
2. Rank options in order of preference
3. See *exactly* how a winner was chosen, round by round

It uses **Instant-Runoff Voting (IRV)**:
- Majority (>50%) wins
- Lowest option is eliminated each round
- Ballots are redistributed until a winner (or tie) is reached

---

## What This Is Not

- Not a public election system
- Not designed for large or adversarial audiences
- No user accounts, OAuth, or analytics
- No cloud-managed database dependencies

---

## Project Structure & Sources of Truth

This repo is designed to be worked on by both **people** and **AI coding agents**.
Two documents are especially important:

### 📌 `PLAN.md` — Project Plan & Decisions
**This is the primary source of truth for behavior and scope.**

It contains:
- Project intent and non-goals
- Ranked choice voting rules (authoritative)
- Deployment constraints (DigitalOcean, nginx, pm2, SQLite)
- Execution phases and current status
- Open questions for discussion
- Decision Records (append-only)

If something isn’t in `PLAN.md`, it should be questioned before implementation.

---

### 🤖 `AI-SEED-PROMPT.md` — AI / Codex Execution Instructions
**This document tells AI agents how to work in this repo safely.**

It includes:
- Hard constraints (additive changes only, no overwrites)
- Deployment isolation rules
- Technical assumptions
- What to build and what *not* to build
- PR expectations

If you are using Codex or another AI coding agent, start there.

---

## High-Level Architecture (MVP)

- **Runtime:** Node.js
- **Framework:** Next.js (App Router) *or* Express (final choice documented in PLAN.md)
- **Database:** SQLite (file-based, stored outside repo)
- **Process manager:** pm2
- **Reverse proxy:** nginx
- **Deployment target:** Small DigitalOcean droplet (shared with other apps)

All components are intentionally isolated:
- Dedicated port (default `3100`)
- Dedicated nginx site
- Dedicated pm2 process
- Dedicated data directory

---

## Development Philosophy

- **Isolation first** — never break existing apps
- **Explainability over cleverness**
- **Deterministic behavior**
- **Human-readable decisions**
- **AI-assisted, not AI-dictated**

---

## Getting Started

### For Humans
1. Read `PLAN.md` to understand scope and rules
2. Review open questions and decision records
3. Propose changes by adding new decision records

### For AI Agents (Codex)
1. Read `AI-SEED-PROMPT.md`
2. Treat `PLAN.md` as authoritative
3. Make additive, isolated changes only

---

## Contributing & Decisions

- Non-trivial changes should be discussed and captured as **Decision Records** in `PLAN.md`
- Decision history is append-only
- If unsure, document instead of changing behavior

---

## License

This project is intended for personal / small-group use.
License to be added if/when needed.
