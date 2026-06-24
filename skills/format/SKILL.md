---
author: AuthorClaw
description: Export manuscripts to DOCX, EPUB, PDF, KDP-ready formatting
metadata:
    github-path: skills/author/format
    github-ref: refs/heads/main
    github-repo: https://github.com/Ckokoski/authorclaw
    github-tree-sha: 57c148ba9cb274f83c27adedb568443da6ebb299
name: format
permissions:
    - file:read
    - file:write
triggers:
    - format
    - export
    - epub
    - kindle
    - KDP
    - pdf
    - docx
    - manuscript format
version: 1.0.0
---
# Formatting & Export Skill

Convert manuscripts into publication-ready formats.

## Supported Formats

### Standard Manuscript Format (for agents/editors)
- 12pt Times New Roman or Courier
- Double-spaced, 1-inch margins
- Header: Author Name / Title / Page #
- Scene breaks: centered # or ***
- Chapter breaks: new page, centered title

### EPUB (for ebook distribution)
- Proper HTML/CSS structure
- Table of contents generation
- Metadata (title, author, description, ISBN)
- Cover image embedding
- Chapter navigation

### KDP-Ready (Amazon Kindle Direct Publishing)
- Meets KDP formatting guidelines
- Front matter: title page, copyright, dedication
- Back matter: about author, also by, acknowledgments
- Proper trim size settings
- Bleed settings for print

### PDF (for print/review)
- Professional typesetting
- Proper widow/orphan control
- Running headers
- Page numbers

### DOCX (for editing/collaboration)
- Clean formatting with styles
- Track changes compatible
- Comment-ready

## Process
1. Gather all chapters from the project folder
2. Apply the requested format
3. Generate front matter and back matter
4. Export to `workspace/exports/`
5. Report any formatting issues found
