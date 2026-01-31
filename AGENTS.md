# Codex Agents Guide

Use this file as the default operating checklist for Codex in this repo.

## Always Start Here
- Read `CLAUDE.md` before making changes.
- Follow additive changes only; avoid breaking existing behavior.

## Documentation Sync (Required Before Commit)
Update all relevant docs for any change:
- `docs/CHANGELOG.md` (Unreleased)
- `PLAN.md` (Change Log for behavior changes)
- `docs/decisions/` (Decision Records)
- `README.md` (user-facing updates)
- `CLAUDE.md` (architecture, conventions, or new files)
- `docs/` files that describe affected behavior (ex: `docs/API.md`)

### README Consistency Check (Proactive)
After making changes, **always verify README consistency** with CHANGELOG:
- Check that README reflects features mentioned in recent CHANGELOG versions
- Remove outdated references to deprecated tools/processes (e.g., old CI systems)
- Update terminology to match current implementation (e.g., secret naming)
- Ensure CI/CD, deployment, and feature descriptions match current state
- If you find inconsistencies, fix them proactively before committing your main changes

**This check should happen automatically as part of your workflow, not only when explicitly requested.**

## Quality Gates (Required Before Commit)
Run all checks:
```bash
npm run lint
npm test
npm run build
```

If any step fails, fix and re-run.

## Branching & Commits
- Create a new branch before committing.
- Use the exact commit message the user requests (verbatim).
- If the user does not specify a message, use Conventional Commits.

## Pull Requests
Always open a PR and include a detailed description with:
- Summary paragraph
- Key Changes section (grouped bullets)
- Files Changed section (grouped by area)
- Breaking Changes (explicit "None" if not applicable)
- Test Plan checklist
- "Generated with Codex" footer

Use `gh pr create` and follow the format requested by the user.

## Deployment Assumption
If the deployment is under `/rcv`, ensure:
- `basePath: '/rcv'` is set in `next.config.js`
- Internal links and API calls use `withBasePath()` from `src/lib/paths.ts`
