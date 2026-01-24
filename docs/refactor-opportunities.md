# Refactor Opportunities

This document lists ideas and improvements that were intentionally **not** implemented in the initial MVP to avoid scope creep and keep the codebase simple. These are opportunities for future enhancement.

## Architecture

### 1. Server Actions Instead of API Routes
Next.js 14 supports Server Actions which could simplify the data flow:
- Replace `/api/votes` POST with a `createVote` server action
- Replace ballot submission with a server action
- Reduces boilerplate and improves type safety

**Why not now**: API routes are more explicit and easier to understand for contributors unfamiliar with Server Actions.

### 2. Prisma Instead of Raw SQL
Prisma would provide:
- Type-safe database queries
- Easier migrations
- Better query building

**Why not now**: better-sqlite3 with raw SQL is simpler, has no external dependencies for migrations, and is sufficient for this small schema.

### 3. React Query or SWR for Data Fetching
Would provide:
- Automatic caching
- Background refetching
- Loading/error states

**Why not now**: The current `useEffect` + `fetch` pattern is straightforward and this app has minimal data fetching needs.

## Features

### 4. Vote Closing/Locking
Allow vote creators to:
- Close voting to prevent new ballots
- Lock options after first ballot
- Set expiration time

**Why not now**: Adds complexity; friends can coordinate manually.

### 5. Voter Identity / Ballot Editing
Allow voters to:
- Identify themselves (name/nickname)
- Edit their previous ballot
- See their own ballot in results

**Why not now**: Requires tracking voter identity which adds complexity and privacy considerations.

### 6. Real-time Updates
Use WebSockets or Server-Sent Events to:
- Update results page live
- Show ballot count in real-time

**Why not now**: Manual refresh is sufficient for small groups.

### 7. Multiple Election Methods
Support voting methods beyond IRV:
- Schulze method
- Borda count
- Approval voting

**Why not now**: IRV is sufficient for the lunch-picking use case.

### 8. Export/Import Votes
Allow:
- Exporting vote data as JSON
- Importing votes from JSON
- Sharing vote configurations

**Why not now**: Not needed for MVP; would add complexity.

## UX

### 9. Touch-Optimized Drag and Drop
The current drag-and-drop works but could be improved:
- Use a library like `@dnd-kit/core`
- Better touch handling
- Smoother animations

**Why not now**: The up/down buttons work well on mobile; drag-and-drop is a nice-to-have.

### 10. Copy-to-Clipboard for Links/Secret
Add one-click copy buttons for:
- Vote URL
- Results URL
- Write secret

**Why not now**: Users can select and copy; not critical for MVP.

### 11. Dark Mode
Add a dark mode toggle or respect system preference.

**Why not now**: Light mode is fine for MVP.

### 12. Animations and Transitions
Add:
- Page transitions
- Ranking list animations
- Loading skeletons

**Why not now**: Adds complexity; basic UX is sufficient.

## Security

### 13. Rate Limiting
Add rate limiting to:
- Prevent ballot spam
- Prevent vote creation spam

**Why not now**: The write secret prevents unauthorized ballots; for friends-only use, this is sufficient.

### 14. CSRF Protection
Add CSRF tokens to forms.

**Why not now**: The write secret provides similar protection for ballot submission; could be added later.

## Testing

### 15. E2E Tests
Add end-to-end tests with Playwright or Cypress:
- Full vote creation flow
- Ballot submission
- Results viewing

**Why not now**: IRV unit tests cover the critical logic; E2E can be added later.

### 16. API Integration Tests
Add tests for API routes with a test database.

**Why not now**: The API routes are thin wrappers; unit tests for IRV are sufficient.

## DevOps

### 17. Docker Support
Add Dockerfile and docker-compose for:
- Easier development setup
- Containerized deployment

**Why not now**: The target is a simple droplet deployment; Docker adds complexity.

### 18. CI/CD Pipeline
Add GitHub Actions for:
- Running tests on PR
- Automated deployment
- Linting

**Why not now**: Manual deployment is fine for a small project.

### 19. Health Check Endpoint
Add `/api/health` that checks:
- Database connectivity
- App version

**Why not now**: nginx config includes a basic `/health` endpoint; app-level health check could be added.

---

## How to Use This Document

1. When considering a new feature, check if it's listed here
2. If implementing something from this list, remove it and document the change
3. Add new ideas here instead of implementing them immediately
4. Discuss with friends before expanding scope
