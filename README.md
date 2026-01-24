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

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd rcv-lunch

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run development server
npm run dev
```

The app will be available at http://localhost:3100

### Running Tests

```bash
npm test
```

---

## Usage

### Creating a Vote

1. Go to the home page
2. Enter a title (e.g., "Friday Lunch")
3. Enter options (one per line)
4. Optionally set a custom vote ID and write secret
5. Click "Create Vote"
6. **Save the write secret!** It's shown only once.

### Submitting a Ballot

1. Go to `/v/<vote-id>`
2. Rank options by clicking or dragging
3. Enter the write secret
4. Submit your ballot

Partial rankings are allowed - you don't have to rank every option.

### Viewing Results

1. Go to `/v/<vote-id>/results`
2. See the winner (or tie)
3. View round-by-round elimination details

---

## Production Deployment

See [deploy/README.md](deploy/README.md) for detailed deployment instructions.

### Quick Overview

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Create data directory**
   ```bash
   sudo mkdir -p /var/lib/rcv-lunch
   sudo chown $USER:$USER /var/lib/rcv-lunch
   ```

3. **Configure environment**
   ```bash
   # In .env
   PORT=3100
   DATABASE_PATH=/var/lib/rcv-lunch/rcv.sqlite
   ```

4. **Start with PM2**
   ```bash
   pm2 start deploy/pm2/ecosystem.config.cjs
   pm2 save
   ```

5. **Configure nginx**
   ```bash
   sudo cp deploy/nginx/rcv-lunch.conf /etc/nginx/sites-available/rcv-lunch
   # Edit server_name in the config
   sudo ln -s /etc/nginx/sites-available/rcv-lunch /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

6. **Enable HTTPS**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## Architecture

- **Framework:** Next.js 14 (App Router)
- **Database:** SQLite via better-sqlite3
- **Process manager:** pm2
- **Reverse proxy:** nginx
- **Port:** 3100 (configurable)

### Key Files

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home / Create vote
│   ├── v/[voteId]/        # Vote page
│   │   ├── page.tsx       # Ballot submission
│   │   └── results/       # Results page
│   └── api/               # API routes
│       └── votes/         # Vote/ballot endpoints
└── lib/
    ├── db.ts              # SQLite database layer
    ├── irv.ts             # IRV algorithm (pure function)
    ├── irv.test.ts        # IRV unit tests
    └── auth.ts            # Secret generation/hashing

deploy/
├── pm2/ecosystem.config.cjs  # PM2 configuration
├── nginx/rcv-lunch.conf      # nginx site template
└── README.md                 # Deployment instructions

docs/
└── refactor-opportunities.md # Future improvement ideas
```

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

If something isn't in `PLAN.md`, it should be questioned before implementation.

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

## Development Philosophy

- **Isolation first** — never break existing apps
- **Explainability over cleverness**
- **Deterministic behavior**
- **Human-readable decisions**
- **AI-assisted, not AI-dictated**

---

## Contributing & Decisions

- Non-trivial changes should be discussed and captured as **Decision Records** in `PLAN.md`
- Decision history is append-only
- If unsure, document instead of changing behavior
- See [docs/refactor-opportunities.md](docs/refactor-opportunities.md) for improvement ideas

---

## License

This project is intended for personal / small-group use.
License to be added if/when needed.
