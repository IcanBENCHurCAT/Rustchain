---
author: AuthorClaw
description: Architect novel timelines, coordinate parent/sub-agents, preserve character visual DNA, and execute consecutive sequel transitions for publishing series
metadata:
    github-path: skills/author/chronicle-builder
    github-ref: refs/heads/main
    github-repo: https://github.com/Ckokoski/authorclaw
name: chronicle-builder
permissions:
    - file:read
    - file:write
    - image_generation
triggers:
    - /sequel
    - /series-continuation
    - /chronicle
    - series extension
    - novel pipeline
    - chronicle-builder
version: 1.0.0
---

# Chronicle Builder (`/sequel` / `/series-continuation`)

Execute the complete end-to-end publishing pipeline for a novel series or trigger a seamless transition to a sequel. This skill coordinates specialized sub-agents, locks in character visual DNA for illustration consistency, and packages final KDP-ready files.

---

## 🚀 How to Run the Pipeline

Simply invoke the slash command to run the engine:
*   Use `/series-continuation` or `/sequel` to transition a completed book into its sequel.
*   Use `/chronicle` to start a brand new series pipeline from scratch.

---

## 🏗️ The Multi-Agent Pipeline Architecture

```text
               +--------------------------------------+
               |     Phase 1: Market Ideation         |
               |  (Scans trends and drafts premise)   |
               +------------------+-------------------+
                                  |
                                  v
               +------------------+-------------------+
               |      Phase 2: Master Book Bible       |
               |  (Locks in Character & Magic DNA)    |
               +------------------+-------------------+
                                  |
                                  v
               +------------------+-------------------+
               |    Phase 3: Visual DNA Illustration  |
               |  (Image prompt locks, visual guides)  |
               +------------------+-------------------+
                                  |
                                  v
               +------------------+-------------------+
               |    Phase 4: Sandboxed Drafting Loop  |
               |  (Spawns chapter-drafting agents)    |
               +------------------+-------------------+
                                  |
                                  v
               +------------------+-------------------+
               |     Phase 5: Publishing Packaging    |
               |  (DOCX compile, alt-text, cover art) |
               +--------------------------------------+
```

---

## 🛠️ Step-by-Step Execution Protocols

### 1. Market Ideation (`premise.md`)
*   Deploy specialized **ideation** and **trend-analyst** sub-agents to scan current top-trending speculative genres (e.g., Cozy Fantasy, Gothic Academia Romantasy).
*   Synthesize a high-concept master prompt incorporating an atmospheric setting, unique magic mechanics, and a compelling character dynamic.

### 2. Master Book Bible Setup (`memory/book-bible/`)
*   Populate Character, Magic, Location, and Timeline parameters in `memory/book-bible/` (`characters.yaml`, `magic_system.yaml`, `locations.yaml`, `timeline.yaml`).
*   Draft the 3-Act structural beats in `outline/high_level_structure.md`.
*   Author the scene-by-scene beats in `outline/chapter_outline.md` defining goals, POVs, conflicts, and word targets for every chapter.

### 3. Visual DNA & Illustration (`chapters/images/`)
*   **Visual Style Lock:** Define a high-contrast style (e.g., *"Gothic black-and-white digital woodcut print, fine cross-hatching"*).
*   **Physical Continuity:** Every image generation prompt must strictly pull physical descriptors from `characters.yaml` to ensure zero character visual drift between chapters.
*   **Path Rules:** Save images as `chapters/images/chapter_XX.png` and reference them using relative paths (`./images/chapter_XX.png`) in draft files.

### 4. Sandboxed Drafting Loop (`chapters/`)
*   **Spawn Drafting Agents:** For each chapter, invoke a sandboxed drafting sub-agent:
    ```text
    Role: "Chapter XX Drafter"
    Prompt: "Draft Chapter XX based on outline/chapter_outline.md. Maintain the established character POVs, tone, and magical rules. Save directly to chapters/chapter_XX.md."
    ```
*   **Multi-Pass Edits:** Run developer/editor sub-agents to line-edit, ground sensory details, and verify continuity facts.

### 5. Publishing Packaging (`exports/`)
*   **Clean DOCX Compilation:** Stitch all chapter files together using a Python compiler script (incorporating proper Page Breaks and Heading 1 styles for all chapter headers so Kindle Create can auto-detect the Table of Contents).
*   **Accessibility:** Generate descriptive alternative text (alt-text) restricted to **140 characters or less** for all visual assets.
*   **Cover Brief:** Output four custom gold-foil book cover mockups and coordinate a brief file at `exports/cover_brief.md`.
*   **Walkthrough Protocols:** When creating or compiling a walkthrough.md, ensure all embedded local illustrations are referenced using absolute paths with the standard `file:///` protocol (or `file:////` for specific webview platforms) to prevent broken links in the reader's view.

---

## 🔄 Sequel Continuation Protocol (`/sequel`)

When `/sequel` is triggered on a completed book workspace, execute this exact series-extension sequence:

1.  **Synchronize the Universe:** Read the final chapters and update `memory/book-bible/` to record character growth, injuries, and magic changes.
2.  **Series Manifest Setup:** Create a `series.yaml` tracking file in the root workspace:
    ```yaml
    series_name: "[Series Title]"
    current_book: 2
    books:
      - book_number: 1
        title: "[Book 1 Title]"
        status: "published"
      - book_number: 2
        title: "[Book 2 Title]"
        status: "pre-production"
    ```
3.  **Visual DNA Lock:** Lock in the visual style guidelines and character descriptors from Book 1 to apply directly to Book 2 prompts.
4.  **Sequel Outlining:** Create the premise (`outline/premise_book_2.md`) and chapter outlines (`outline/chapter_outline_book_2.md`) built on the direct fallout of Book 1.
5.  **Workspace Transition:** Archive Book 1 chapters to `archive/book_01/` and clear the `chapters/` folder to accept the new draft files.
6.  **Launch Phase 4 Drafting Loop** using the new book parameters.
