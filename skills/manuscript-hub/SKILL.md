---
author: AuthorClaw
description: Track word count, chapters, progress, streaks, and project status
metadata:
    github-path: skills/author/manuscript-hub
    github-ref: refs/heads/main
    github-repo: https://github.com/Ckokoski/authorclaw
    github-tree-sha: 60274c88f4ccd826a543b27ff58cc849be7f896c
name: manuscript-hub
permissions:
    - file:read
    - file:write
triggers:
    - word count
    - progress
    - manuscript status
    - how's my book
    - writing streak
    - new project
    - start a new
version: 1.0.0
---
# Manuscript Hub

Central command for managing writing projects.

## New Project Setup
When starting a new project, create:
```
projects/[project-name]/
├── premise.md
├── outline/
├── chapters/
├── characters/
├── research/
├── submissions/
├── exports/
└── project.yaml
```

## Project Tracking (project.yaml)
```yaml
title: "Book Title"
genre: "Thriller"
target_words: 80000
current_words: 0
deadline: "2026-06-01"
status: "planning"
daily_goal: 1000
streak: 0
chapters: []
```

## Commands
- "New project: [Title]" — Create project structure
- "How's my book?" — Show progress dashboard
- "I wrote [N] words today" — Update count, check milestones
- "Show chapter breakdown" — Word count per chapter
- "Weekly report" — Summary of the week's progress

## Progress Visualization
```
📖 "The Silent Hour" - Thriller
━━━━━━━━━━░░░░░░░░░░ 56.5%
Words: 45,230 / 80,000 | Streak: 12 days 🔥
At this pace: Complete by March 15
```

## Milestones to Celebrate
10k, 25k, 50k, 75k words | Finishing a chapter | First draft complete | X-day streaks
