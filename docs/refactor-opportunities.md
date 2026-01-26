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

### 4. Vote Closing/Locking (PARTIALLY IMPLEMENTED)
Allow vote creators to:
- ✅ Close voting to prevent new ballots (admin panel)
- ❌ Lock options after first ballot
- ✅ Set expiration time (auto-close feature)

**Status**: Auto-close and manual close/reopen implemented. Option locking after first ballot remains unimplemented.

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

### 9. QR Code Generation
Generate QR codes for:
- Vote page URL
- Results page URL
- Easy sharing in person

**Why not now**: Copy buttons are sufficient for digital sharing; QR adds a dependency.

### 10. Vote Templates
Save and reuse vote configurations:
- Weekly lunch polls with same options
- Recurring team decisions

**Why not now**: Creating a new vote is quick enough; templates add complexity.

## UX

### 11. Keyboard Shortcuts
Add keyboard shortcuts for power users:
- Number keys to rank options quickly
- Enter to submit ballot
- Tab navigation improvements

**Why not now**: Mouse/touch interface is sufficient for casual use.

### 12. Undo/Redo for Rankings
Allow users to undo/redo ranking changes:
- Track ranking history
- Revert accidental changes

**Why not now**: Users can manually fix mistakes; undo adds state complexity.

### 13. Drag Between Lists
Allow dragging options directly from Available Options to a specific position in Rankings:
- Currently must add then reorder
- Would improve workflow for many options

**Why not now**: Click-to-add + reorder works well enough.

### 14. Results Sharing Image
Generate a shareable image of results:
- Social media friendly
- Include winner and vote breakdown

**Why not now**: Direct link sharing is sufficient.

### 15. Accessibility Audit
Comprehensive accessibility improvements:
- ARIA live regions for dynamic content
- Better screen reader announcements
- High contrast mode

**Why not now**: Basic accessibility is in place; comprehensive audit deferred.

## Security

### 16. Rate Limiting
Add rate limiting to:
- Prevent ballot spam
- Prevent vote creation spam

**Why not now**: API keys now exist for tracking, but enforcement and limits are not implemented yet; for friends-only use, this is sufficient.

### 17. CSRF Protection
Add CSRF tokens to forms.

**Why not now**: The write secret provides similar protection for ballot submission; could be added later.

### 18. Content Security Policy
Add CSP headers to prevent:
- XSS attacks
- Injection vulnerabilities

**Why not now**: No user-generated content displayed unsanitized; low risk.

## Testing

### 19. E2E Tests
Add end-to-end tests with Playwright or Cypress:
- Full vote creation flow
- Ballot submission
- Results viewing

**Why not now**: IRV unit tests cover the critical logic; E2E can be added later.

### 20. API Integration Tests
Add tests for API routes with a test database.

**Why not now**: The API routes are thin wrappers; unit tests for IRV are sufficient.

### 21. Visual Regression Tests
Screenshot testing for:
- Dark/light mode consistency
- Responsive layouts
- Component appearance

**Why not now**: Manual testing is sufficient for small project.

## DevOps

### 22. Docker Support
Add Dockerfile and docker-compose for:
- Easier development setup
- Containerized deployment

**Why not now**: The target is a simple droplet deployment; Docker adds complexity.

### 23. Health Check Endpoint
Add `/api/health` that checks:
- Database connectivity
- App version

**Why not now**: nginx config includes a basic `/health` endpoint; app-level health check could be added.

### 24. Metrics and Monitoring
Add observability:
- Request latency metrics
- Error rate tracking
- Usage analytics

**Why not now**: Simple logs are sufficient for friends-only use.

### 25. Database Backup Automation
Automated SQLite backups:
- Scheduled backups
- Retention policy
- Restore testing

**Why not now**: Manual backups are sufficient for low-stakes data.

## Performance

### 26. Results Caching
Cache election results:
- Invalidate on new ballot
- Reduce computation for popular votes

**Why not now**: IRV calculation is fast; caching adds complexity.

### 27. Static Generation for Results
Use ISR (Incremental Static Regeneration) for results pages:
- Faster page loads
- Reduced server load

**Why not now**: Dynamic rendering is fast enough for small scale.

### 28. Bundle Size Optimization
Reduce JavaScript bundle size:
- Code splitting
- Tree shaking audit
- Lazy loading components

**Why not now**: Current bundle size (~100KB) is acceptable for the use case.

---

## Recently Implemented

The following items were previously in this list and have been implemented:

- **Vote Closing/Locking (partial)** (Features #4) - Auto-close scheduling and manual close/reopen in admin panel
- **API Documentation** - Comprehensive REST API docs for programmatic vote creation (`docs/API.md`)
- **API Key Management** - Admin endpoints for creating and managing API keys (infrastructure for future rate limiting)
- **Branding & Logo** - Added header logo and updated documentation branding
- **Persistent Vote Options** - Save last-used options in localStorage on the create vote page
- **Touch-Optimized Drag and Drop** (UX #9) - Implemented using `@dnd-kit/core` with proper touch/pointer sensors
- **Copy-to-Clipboard for Links/Secret** (UX #10) - Added copy buttons for secret and URLs on vote creation
- **Dark Mode** (UX #11) - Added theme toggle with system preference detection and persistence
- **Animations and Transitions** (UX #12) - Added fade-in animations, loading skeletons, and smooth transitions

---

## How to Use This Document

1. When considering a new feature, check if it's listed here
2. If implementing something from this list, move it to "Recently Implemented" and document the change
3. Add new ideas here instead of implementing them immediately
4. Discuss with friends before expanding scope
