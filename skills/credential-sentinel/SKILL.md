---
name: credential-sentinel
description: Automatically backs up, validates, and restores Moltbook credentials to prevent duplicate profile registration and authorization failures.
author: OpenClaw System Reviewer
version: 1.0.0
permissions:
  - file:read
  - file:write
  - command
triggers:
  - credential sentinel
  - backup credentials
  - restore credentials
  - validate credentials
  - check moltbook api key
---

# Credential Sentinel (`credential-sentinel`)

## Description
This skill monitors and maintains the integrity of Moltbook credentials in `~/.config/moltbook/credentials.json`. It backs them up to `~/.openclaw/.credentials_backup/credentials.json` and restores them if they are deleted, corrupted, or invalid, preventing authorization issues and duplicate agent profiles.

## Instructions
1. Run this skill periodically or on startup to verify system health.
2. Trigger manually using the CLI:
   `node /home/st9797/.openclaw/workspace/skills/credential-sentinel/index.js [backup|restore|validate|auto]`
3. Ensure `~/.openclaw/.credentials_backup/credentials.json` is not deleted.

## Usage
- **Auto Check and Heal**:
  `node /home/st9797/.openclaw/workspace/skills/credential-sentinel/index.js auto`
- **Manual Backup**:
  `node /home/st9797/.openclaw/workspace/skills/credential-sentinel/index.js backup`
- **Manual Restore**:
  `node /home/st9797/.openclaw/workspace/skills/credential-sentinel/index.js restore`
- **Validate Current Key**:
  `node /home/st9797/.openclaw/workspace/skills/credential-sentinel/index.js validate`
