# 🧹 Janitor — Workspace Cleanup Automation

## Overview

A system agent that scans your OpenClaw workspace for abandoned/stale files,
cross-references them with workboard item status, and enables safe deletion
via explicit commands with dry-run by default.

## Commands

### In OpenClaw (main agent)

When you type any `/janitor` command in your messages, the main agent parses
and delegates to the Janitor system:

| Command | Mode | What it does |
|---------|------|-------------|
| `/janitor sweep` | DRY RUN | Full workspace scan, report all stale items |
| `/janitor dump` | DRY RUN | Show all flagged items with details |
| `/janitor dump <name>` | DRY RUN | Show details of specific item |
| `/janitor sweep --live` | LIVE | Delete all GREEN items (requires confirmation) |
| `/janitor sweep --live --target <name>` | LIVE | Delete specific item only |
| `/janitor sweep --live --target <name> --keep` | LIVE | Delete all except <name> |

### Safety Levels

- **GREEN** ✅ — Safe to delete (old, no workboard item, orphaned)
- **YELLOW** ⚠️ — Review needed (has workboard item but blocked/done, or borderline age)
- **RED** 🛡️ — Do not touch (active workboard project, ready/running/todo)
- **PROTECTED** 🔒 — Never delete (core config, memory, skills, active projects)

### Standalone CLI

```bash
python3 janitor/janitor.py sweep       # Dry run report
python3 janitor/janitor.py sweep --live  # Execute (with interactive confirmation)
python3 janitor/janitor.py dump        # Show all flagged
python3 janitor/janitor.py dump <name> # Show specific item
```

### Cron Automation (Weekly Sweep)

A weekly cron job runs `janitor.py sweep` automatically every Sunday at 03:00 Eastern.

```bash
python3 janitor/cron_setup.py              # Install the cron job
python3 janitor/cron_setup.py --dry-run    # Preview without changes
python3 janitor/cron_setup.py --uninstall  # Remove the cron job
python3 janitor/cron_setup.py --status     # Show cron state
```

The cron output is logged to `janitor/sweep.log`.

After a weekly sweep, review the report and run `/janitor sweep --live` to approve deletions.

## Configuration

Edit `config.yaml`:

- `age_threshold_days` — Min age before items are flagged (default: 30)
- `excluded_patterns` — Directories to skip during scan
- `protected_paths` — Absolute paths that can never be deleted
- `protected_file_patterns` — Glob patterns for always-protected files

## How It Works

1. **Scan** — Walk workspace, collect all files/dirs with age and size
2. **Classify** — Check against protected list, workboard status, age threshold
3. **Report** — Show GREEN/YELLOW/RED categorization with reasons
4. **Execute** — Only on explicit `--live` with confirmation

## Files

```
janitor/
├── janitor.py       # Main Janitor class + CLI (scan, report, execute)
├── cron_setup.py    # Cron job management (install/enable/uninstall)
├── config.yaml      # Configuration (age thresholds, protected paths)
├── audit.log        # Audit trail of live deletions (auto-created)
├── sweep.log        # Cron job output log (auto-created)
├── DESIGN.md        # Architecture document
└── README.md        # This file
```

## Integration with OpenClaw

The main agent intercepts `/janitor` commands from message text,
delegates to the Janitor Python module, and formats the report for the user.

The main agent should also:
1. Fetch all workboard items before running a sweep
2. Pass them to `Janitor.populate_workboard_status()`
3. Format and return the report

## Cleanup Queue (Future)

For added safety, consider staging deletions:
1. Move items to `~/janitor-queue/` instead of deleting
2. Wait 7 days, then purge
3. Provides a recovery window before permanent deletion
