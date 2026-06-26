# 🧹 Janitor System - Design Document

## Overview

A workspace cleanup automation system that identifies abandoned/stale files, cross-references them with workboard items, and enables safe deletion via explicit commands.

## Core Design Principles

1. **Safety First** — Dry-run by default, never auto-delete without explicit confirmation
2. **Workboard-First** — Never delete files that have active workboard items
3. **Transparent** — Everything is reported before execution; Garret sees what will be deleted
4. **Configurable** — Age thresholds, protected paths, and action modes are tunable

## Command Interface

| Command | Mode | Behavior |
|---------|------|----------|
| `/janitor sweep` | DRY RUN | Scan workspace, report all stale files, show eligibility |
| `/janitor dump` | DRY RUN | Show all flagged items with details |
| `/janitor dump <target>` | DRY RUN | Show details of specific target |
| `/janitor sweep --live` | LIVE | Execute all flagged deletions (with confirmation) |
| `/janitor sweep --live --target <name>` | LIVE | Execute deletion of specific target only |
| `/janitor sweep --live --target <name> --keep` | LIVE | Skip this target, delete rest |

### Safety Levels (auto-assigned during sweep)

- **GREEN** — Safe to delete (no workboard item, old, standalone file or dir)
- **YELLOW** — Workboard item exists but status is done/blocked — needs review
- **RED** — Workboard item is active (ready/running/todo) — DO NOT touch

## Eligibility Logic

### File/Directory Eligibility

```
1. Is file/dir under 30 days old? → NOT eligible (configurable)
2. Is it in a protected path (SOUL.md, USER.md, memory/, skills/, .git/)? → NOT eligible
3. Does a workboard item exist for it?
   - Yes, status is ready/running/todo → NOT eligible (active project)
   - Yes, status is blocked/done → YELLOW (review needed)
   - Yes, status is archived → GREEN (can delete)
   - No workboard item → check next
4. Is it a standalone file (not a project dir)?
   - Yes → GREEN (eligible)
   - No (project dir) → check if related project has active work → depends
```

### Protected Paths (NEVER delete)

- SOUL.md, USER.md, IDENTITY.md, MEMORY.md, AGENTS.md, TOOLS.md, HEARTBEAT.md
- memory/ directory
- skills/ directory
- .git/ directory
- mapsnap/ (active project)
- surveillance-rpg/ (active project)
- extraterrestrial-mythos/ (active project)

These are either core config or actively-worked projects.

### Workboard Integration

- Before flagging any file/dir for deletion, check if a workboard item exists
- Use `workboard_list` to check all boards for matching titles
- If workboard item found → check status
- If status is "ready", "running", "todo" → mark as RED, do NOT recommend deletion
- If status is "blocked" or "done" → mark as YELLOW, recommend review
- If status is "archived" → mark as GREEN, recommend deletion
- If no workboard item → mark based on age + file type (GREEN or YELLOW)

## Report Format

```
🧹 JANITOR SWEEP REPORT
Date: 2026-06-26
Workspace: ~/.openclaw/workspace/

=== ELIGIBLE FOR DELETION (GREEN) ===
[3 items]

1. [142 days] nasty-old-chicken-hands/
   - Type: directory
   - Workboard: none
   - Age: 142 days
   - Size: ~500 bytes

=== REQUIRES REVIEW (YELLOW) ===
[2 items]

1. [85 days] indentation-issue/
   - Type: directory
   - Workboard: NO ITEM FOUND — standalone orphan project
   - Age: 85 days

=== PROTECTED / ACTIVE (SKIP) ===
[8 items]

- SOUL.md, USER.md, IDENTITY.md — core config
- memory/, skills/ — agent infrastructure
- mapsnap/ — active project
- ...

=== SUMMARY ===
Total items scanned: 25
Eligible: 3
Review needed: 2
Skipped (protected/active): 20

Run `/janitor sweep --live` to delete eligible items
Run `/janitor sweep --live --target <name>` to delete specific item
```

## Implementation Phases

### Phase 1: Janitor Core (Persona + Scanner)
- JanitorPython class with scan, analyze, report methods
- File scanning with age tracking
- Protected paths configuration
- Basic eligibility logic

### Phase 2: Workboard Integration
- Cross-reference scanned items with workboard items
- Check workboard item status
- Auto-assign safety levels (GREEN/YELLOW/RED)

### Phase 3: Command Parser
- `/janitor sweep` — full sweep report
- `/janitor dump` — show all flagged items
- `/janitor dump <target>` — details of specific item
- Mode flags: --live, --target, --keep

### Phase 4: Safety Guards
- Double-confirm before live runs
- Never touch protected paths
- Dry-run shows EXACT commands that would run

### Phase 5: Automation (Cron)
- Weekly cron job: automatic sweep → send report to Garret
- Optional: auto-archive stale workboard items first
- Garret reviews report and confirms with `/janitor sweep --live`

## File Structure

```
janitor/
├── janitor.py          # Main Janitor class + CLI
├── config.yaml         # Protected paths, age thresholds
└── README.md           # Usage instructions
```

## Cron Configuration

```
Name: Janitor Weekly Sweep
Schedule: Every Monday 09:00 Eastern
Payload: systemEvent "🧹 Janitor sweep triggered. Report available."
Delivery: announce to Telegram
```

Then the agent (on next turn) runs `/janitor sweep` and posts the report.

## Future Enhancements

- Auto-verify with Garret that workboard items are truly stale before archiving
- Staged cleanup (move to `~/janitor-queue/` before delete, wait 7 days, then purge)
- Deletion logging (audit trail of what was deleted when)
- Configurable exclusion patterns via glob or regex
