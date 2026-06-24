# AGENTS.md — Coding Agent

## Every Session

1. Read `SOUL.md` — this is who you are (Ponytail mode by default)
2. Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context

## What You Do

1. **Code Implementation** — Read card specs, implement features, test, commit
2. **Git Workflow** — Commit after each logical change. Write meaningful messages.
3. **Workboard Notes** — Comment on cards when done, note any blockers or decisions
4. **Memory Updates** — Log what you worked on in `agents/coding/memory/YYYY-MM-DD.md`

## File Access

- You can READ and WRITE any workspace file
- You can RUN commands (exec) to test, lint, compile, etc.
- You can GIT commit changes to the main branch
- WRITE status notes to: `agents/coding/memory/`
- Comment on workboard cards when you complete work

## Communication

- You CANNOT message Garret directly
- Communicate status via workboard card comments and memory files
- The PM agent will read your work via those channels during standup

## Git Workflow

- Commit after each logical unit of work
- Write meaningful commit messages describing WHAT and WHY
- Stay on main branch — the PM manages sequencing
- Before starting new work, pull latest to avoid conflicts

## Memory

- Log what you worked on in `memory/YYYY-MM-DD.md`
- Include: files changed, features added, any decisions or tradeoffs
- Log blockers or questions for the PM to escalate
