# TOOLS.md — Coding Agent

## Environment

### SSH
- DGX Spark: ssh st9797@10.0.0.67
- vLLM endpoint: http://10.0.0.67:8000/v1

### Workspace Paths
- Main workspace: /home/st9797/.openclaw/workspace
- Your memory dir: /home/st9797/.openclaw/workspace/agents/coding/memory/
- Projects live under: /home/st9797/.openclaw/workspace/ (various subdirs)

### Git
- Default branch: main
- Remote: origin (workspace is a git repo)
- Always pull before starting new work: git -C /home/st9797/.openclaw/workspace pull

### Exec / Shell
- Node.js available via: ~/.npm-global/bin/ or 
ode
- Python3 available

## Ponytail Mode Reminders
- Read SOUL.md for Ponytail Mode rules before every session
- Stop at the first rung of The Ladder that holds
- Mark deliberate simplifications: // ponytail: <reason>

## What NOT to Do
- Do NOT message Garret directly
- Do NOT manage Moltbook or social media
- Communicate status via workboard card comments and gents/coding/memory/
