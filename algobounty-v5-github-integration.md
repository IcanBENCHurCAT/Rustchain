# AlgoBounty v5: GitHub Integration Design Document

**Status:** Design Complete  
**Date:** 2026-06-30  
**Parent Card:** 4063bc1c (AlgoBounty Architecture)  
**Related Docs:** v1 (TEAL Escrow), v2 (Karma), v4 (Dashboard/API), v6 (HITM Mode)  
**Target Repository:** Any GitHub repository registered in AlgoBounty  

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [GitHub Actions Workflow](#2-github-actions-workflow)
3. [Webhook-Based Notifications](#3-webhook-based-notifications)
4. [Issue-to-Bounty Flow](#4-issue-to-bounty-flow)
5. [PR-Bounty Linking](#5-pr-bounty-linking)
6. [Label/Status Sync Flow](#6-labelstatus-sync-flow)
7. [Escrow Release Logic](#7-escrow-release-logic)
8. [Manual Dispatch Recovery](#8-manual-dispatch-recovery)
9. [Failure Recovery Patterns](#9-failure-recovery-patterns)
10. [Webhook Payload Examples](#10-webhook-payload-examples)
11. [Failure Case Matrix](#11-failure-case-matrix)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Overview & Architecture

### 1.1 Problem Statement

AlgoBounty is a bounty platform on Algorand where AI agents (and humans) can claim and complete tasks. The GitHub integration bridges GitHub's workflow — issues, PRs, commits, merges — with AlgoBounty's escrow system. The goal: make bounty lifecycle visible in GitHub while keeping the source-of-truth in AlgoBounty's on-chain state.

### 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GitHub Ecosystem                                 │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │  Issues  │  │  Pull    │  │  Commits │  │      GitHub          │   │
│  │          │  │  Requests│  │  &       │  │    Webhooks          │   │
│  │  Labels  │  │  (PRs)   │  │  Merges  │  │                      │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘   │
│       │              │              │                  │               │
│       │              │              │    POST /webhooks/github        │
│       │              │              │                  ▼               │
│       └──────────────┴──────────────┘        ┌──────────────────┐    │
│              Auto-detected                    │  AlgoBounty      │    │
│              references                       │  Gateway (FastAPI│    │
│         #ALGO-XXXX in PR                      │  /webhook-receiver)│   │
│              & labels                         └───────┬──────────┘    │
│                                                        │               │
└────────────────────────────────────────────────────────┼───────────────┘
                                                          │
                                    ┌─────────────────────┼──────────────┐
                                    │                     │              │
                                    ▼                     ▼              ▼
                           ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
                           │  AlgoBounty   │  │  Karma       │  │  Telegram    │
                           │  API / DB     │  │  Reputation  │  │  Bot         │
                           │               │  │  Engine      │  │              │
                           └───────┬───────┘  └──────────────┘  └──────────────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │  Algorand     │
                           │  Escrow       │
                           │  Contract     │
                           └───────────────┘
```

### 1.3 Core Principles

| Principle | Description |
|-----------|-------------|
| **Single source of truth** | AlgoBounty's database has authority; GitHub reflects state, doesn't drive it |
| **Idempotency** | Every webhook/event produces a unique operation key; re-delivery is harmless |
| **Observer-first** | GitHub side effects (labels, comments, statuses) are best-effort; gateway state is authoritative |
| **Trustless mode default** | High-karma agents get auto-release; HITM is opt-in per-bounty |
| **Graceful degradation** | If GitHub APIs fail, webhook processing continues silently and retries later |

### 1.4 Component Inventory

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `algobounty.yml` | `.github/workflows/` | GitHub Actions workflow |
| `bounty.yml` | `.github/ISSUE_TEMPLATE/` | Bounty issue template |
| `algobounty-bot` | GitHub Apps (new) | Bot user for comments/labels |
| Webhook receiver | AlgoBounty Gateway (`POST /webhooks/github`) | Receives GitHub events |
| Retry scheduler | AlgoBounty Gateway (background worker) | Failed delivery recovery |
| Sync worker | AlgoBounty Gateway (background worker) | Label/state reconciliation |
| `workflow_dispatch` | GitHub Actions (manual) | Operator recovery triggers |

---

## 2. GitHub Actions Workflow

### 2.1 Workflow File: `.github/workflows/algobounty.yml`

```yaml
# .github/workflows/algobounty.yml
# AlgoBounty — Automated bounty lifecycle bridge

name: AlgoBounty

on:
  pull_request:
    types: [opened, synchronize, reopened, closed, review_requested]
  pull_request_review:
    types: [submitted]
  issues:
    types: [opened, labeled, unlabeled]
  workflow_dispatch:
    inputs:
      action:
        description: "Manual action to trigger"
        required: true
        type: choice
        options:
          - sync-all-bounties
          - sync-bounty
          - reconcile
          - retry-failed-webhooks
      bounty_id:
        description: "Bounty ID (required when action=sync-bounty)"
        required: false
        type: string

concurrency:
  group: algobounty-${{ github.event.pull_request.number || github.event.issue.number || github.run_id }}
  cancel-in-progress: false

permissions:
  contents: read
  pull-requests: write
  issues: write
  statuses: write

jobs:
  # ─────────────────────────────────────────────────────────────────────
  # JOB 1: On PR open/update — notify gateway
  # ─────────────────────────────────────────────────────────────────────
  pr-event:
    runs-on: ubuntu-latest
    timeout-minutes: 3
    if: github.event_name == 'pull_request'
    steps:
      - name: Notify AlgoBounty Gateway
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ALGO_BOUNTY_WEBHOOK_SECRET: ${{ secrets.ALGO_BOUNTY_WEBHOOK_SECRET }}
          ALGO_BOUNTY_GATEWAY_URL: ${{ secrets.ALGO_BOUNTY_GATEWAY_URL }}
          REPOSITORY: ${{ github.repository }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          PR_ACTION: ${{ github.event.action }}
        run: |
          PAYLOAD=$(jq -n \
            --arg repo "$REPOSITORY" \
            --arg pr "$PR_NUMBER" \
            --arg action "$PR_ACTION" \
            --arg sha "${{ github.event.pull_request.head.sha }}" \
            --arg url "${{ github.event.pull_request.html_url }}" \
            --arg title "${{ github.event.pull_request.title }}" \
            '{
              event_type: "github.pull_request",
              action: $action,
              repository: $repo,
              pull_request: {
                number: ($pr | tonumber),
                sha: $sha,
                url: $url,
                title: $title,
                author: "${{ github.event.pull_request.user.login }}"
              },
              timestamp: (now | todateiso8601)
            }')

          SIGNATURE=$(echo -n "${PAYLOAD}" | openssl dgst -sha256 -hmac "${ALGO_BOUNTY_WEBHOOK_SECRET}" 2>/dev/null | awk '{print $NF}')

          curl -sf -X POST "${ALGO_BOUNTY_GATEWAY_URL}/webhooks/github" \
            -H "Content-Type: application/json" \
            -H "X-GitHub-Event: pull_request" \
            -H "X-GitHub-Delivery: algobounty-${{ github.run_id }}-${{ github.run_attempt }}" \
            -H "X-Signature-256: ${SIGNATURE}" \
            -d "$PAYLOAD" > /dev/null 2>&1 || \
            echo "::warning::AlgoBounty gateway notification failed for PR #${PR_NUMBER}"

  # ─────────────────────────────────────────────────────────────────────
  # JOB 2: On issue open — notify gateway
  # ─────────────────────────────────────────────────────────────────────
  issue-event:
    runs-on: ubuntu-latest
    timeout-minutes: 3
    if: github.event_name == 'issues'
    steps:
      - name: Notify AlgoBounty Gateway
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ALGO_BOUNTY_WEBHOOK_SECRET: ${{ secrets.ALGO_BOUNTY_WEBHOOK_SECRET }}
          ALGO_BOUNTY_GATEWAY_URL: ${{ secrets.ALGO_BOUNTY_GATEWAY_URL }}
          REPOSITORY: ${{ github.repository }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
          ISSUE_ACTION: ${{ github.event.action }}
        run: |
          PAYLOAD=$(jq -n \
            --arg event "${ISSUE_ACTION}" \
            --arg repo "$REPOSITORY" \
            --arg issue "${ISSUE_NUMBER}" \
            --arg url "${{ github.event.issue.html_url }}" \
            --arg title "${{ github.event.issue.title }}" \
            --arg labels "$(echo '${{ toJSON(github.event.issue.labels) }}' | jq -r '[.[]|.name] | join(",")')" \
            '{
              event_type: "github.issue",
              action: $event,
              repository: $repo,
              issue: {
                number: ($issue | tonumber),
                url: $url,
                title: $title,
                labels: (fromjson($labels))
              },
              timestamp: (now | todateiso8601)
            }')

          SIGNATURE=$(echo -n "${PAYLOAD}" | openssl dgst -sha256 -hmac "${ALGO_BOUNTY_WEBHOOK_SECRET}" 2>/dev/null | awk '{print $NF}')

          curl -sf -X POST "${ALGO_BOUNTY_GATEWAY_URL}/webhooks/github" \
            -H "Content-Type: application/json" \
            -H "X-GitHub-Event: issues" \
            -H "X-GitHub-Delivery: algobounty-${{ github.run_id }}" \
            -H "X-Signature-256: ${SIGNATURE}" \
            -d "$PAYLOAD" > /dev/null 2>&1 || \
            echo "::warning::Gateway notification for issue failed"

  # ─────────────────────────────────────────────────────────────────────
  # JOB 3: On PR merge — trigger escrow release
  # ─────────────────────────────────────────────────────────────────────
  on-pr-merge:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    if: >-
      github.event_name == 'pull_request' &&
      github.event.action == 'closed' &&
      github.event.pull_request.merged == true
    steps:
      - name: Resolve PR → Bounty ID
        id: resolve
        run: |
          BOUNTY_ID=$(echo "${{ github.event.pull_request.title }} ${{ github.event.pull_request.body }}" \
            | grep -oE '#?ALGO-[0-9]+' | tail -1 | sed 's/^#//')
          echo "bounty_id=${BOUNTY_ID}" >> "$GITHUB_OUTPUT"

      - name: Post bounty claim comment
        if: steps.resolve.outputs.bounty_id != ''
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          BOUNTY_ID: ${{ steps.resolve.outputs.bounty_id }}
          PR_NUM: ${{ github.event.pull_request.number }}
          REPO: ${{ github.repository }}
        run: |
          gh issue comment "$PR_NUM" --repo "$REPO" \
            --body "## AlgoBounty: Bounty #${BOUNTY_ID} Claim Detected

🎯 This PR references **bounty #${BOUNTY_ID}**.

- **Status:** Bounty claim detected, awaiting gateway processing
- **Escrow:** [View on Dashboard](https://app.algobounty.io/bounty/${BOUNTY_ID})
- **Karma:** Claimed on behalf of @${{ github.event.pull_request.user.login }}"

      - name: Notify gateway of merge
        if: steps.resolve.outputs.bounty_id != ''
        env:
          ALGO_BOUNTY_GATEWAY_URL: ${{ secrets.ALGO_BOUNTY_GATEWAY_URL }}
          BOUNTY_ID: ${{ steps.resolve.outputs.bounty_id }}
          PR_NUM: ${{ github.event.pull_request.number }}
        run: |
          curl -sf -X POST "${ALGO_BOUNTY_GATEWAY_URL}/webhooks/github" \
            -H "Content-Type: application/json" \
            -H "X-GitHub-Event: pull_request.merged" \
            -H "X-GitHub-Delivery: merge-${{ github.run_id }}" \
            -d "{\"event_type\": \"github.pr_merged\", \"bounty_id\": \"${BOUNTY_ID}\", \"pr_number\": ${PR_NUM}}" \
            > /dev/null 2>&1 || echo "::warning":"Merge notification failed"

  # ─────────────────────────────────────────────────────────────────────
  # JOB 4: Manual dispatch — sync / reconcile / retry
  # ─────────────────────────────────────────────────────────────────────
  manual-dispatch:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    if: github.event_name == 'workflow_dispatch'
    env:
      ALGO_BOUNTY_GATEWAY_URL: ${{ secrets.ALGO_BOUNTY_GATEWAY_URL }}
      REPOSITORY: ${{ github.repository }}
    steps:
      - name: Sync all bounties
        if: github.event.inputs.action == 'sync-all-bounties'
        run: |
          curl -sf -X POST "${ALGO_BOUNTY_GATEWAY_URL}/api/v1/repos/${REPOSITORY}/sync" \
            -H "Content-Type: application/json" > /dev/null 2>&1

      - name: Sync specific bounty
        if: github.event.inputs.action == 'sync-bounty' && github.event.inputs.bounty_id != ''
        run: |
          curl -sf -X POST "${ALGO_BOUNTY_GATEWAY_URL}/api/v1/bounties/${{ github.event.inputs.bounty_id }}/reconcile" \
            -H "Content-Type: application/json" > /dev/null 2>&1

      - name: Retry failed webhooks
        if: github.event.inputs.action == 'retry-failed-webhooks'
        run: |
          curl -sf -X POST "${ALGO_BOUNTY_GATEWAY_URL}/api/v1/webhooks/retry" \
            -H "Content-Type: application/json" -H "X-Reconcile-Source: github-actions" \
            > /dev/null 2>&1

      - name: Full reconciliation
        if: github.event.inputs.action == 'reconcile'
        run: |
          curl -sf -X POST "${ALGO_BOUNTY_GATEWAY_URL}/api/v1/reconcile/all" \
            -H "Content-Type: application/json" > /dev/null 2>&1
```

### 2.2 Workflow Trigger Matrix

| GitHub Event | Action Taken | Gateway Endpoint | Notes |
|-------------|-------------|------------------|-------|
| `pull_request.opened` | Post "bounty claimed" comment if `#ALGO-XXXX` found | `/webhooks/github` | Checks PR body + title |
| `pull_request.synchronize` | Update gateway with latest commit SHA | `/webhooks/github` | Idempotent — no new comment |
| `pull_request.merged` | Post merge comment, notify gateway for escrow release | `/webhooks/github` + `on-pr-merge` job | Trustless mode: auto-release |
| `pull_request.closed` (not merged) | If bounty claimed, notify gateway for potential refund | `/webhooks/github` | HITM mode: review window may still be open |
| `pull_request_review.submitted` | If review approved, update bounty `submitted` state | `/webhooks/github` | Only on first approval from repo owner |
| `issues.opened` | Auto-label with bug/enhancement if matching templates | `/webhooks/github` | Gateway may create bounty from issue |
| `issues.labeled` | If `bounty:claimed` added, update escrow state | `/webhooks/github` | Bidirectional sync |
| `workflow_dispatch` | Manual trigger for sync, reconcile, retry | N/A (direct API call) | Operator recovery |

### 2.3 Required GitHub Repository Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `ALGO_BOUNTY_GATEWAY_URL` | AlgoBounty Gateway base URL | `https://api.algobounty.io` |
| `ALGO_BOUNTY_WEBHOOK_SECRET` | HMAC signature key for webhook auth | Generated UUID |
| `GITHUB_TOKEN` | Auto-provided; grants repo permissions | — |

---

## 3. Webhook-Based Notifications

### 3.1 AlgoBounty Gateway Webhook Receiver

The AlgoBounty Gateway (FastAPI) exposes a webhook receiver endpoint. GitHub POSTs events here; the gateway processes them and updates the bounty lifecycle.

**Endpoint:** `POST /webhooks/github`

**Authentication:**
- `X-GitHub-Delivery` header: Unique delivery ID (GitHub provides)
- `X-GitHub-Event` header: Event type (`pull_request`, `issues`, `issue_comment`, etc.)
- `X-Signature-256` header: HMAC-SHA256 signature using webhook secret

```python
# /app/webhooks/github.py (FastAPI route — pseudocode)

from fastapi import APIRouter, Request, Header, HTTPException
from app.services.bounty import BountyService
from app.services.github import GitHubService

router = APIRouter()

@router.post("/webhooks/github")
async def github_webhook(
    request: Request,
    github_event: str = Header(..., alias="X-GitHub-Event"),
    github_delivery: str = Header(..., alias="X-GitHub-Delivery"),
    x_signature_256: str = Header(None, alias="X-Signature-256"),
):
    # 1. Verify signature
    body = await request.body()
    secret = settings.GITHUB_WEBHOOK_SECRET
    expected_sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(x_signature_256, f"sha256={expected_sig}"):
        raise HTTPException(401, "Invalid signature")

    # 2. Dedup: check if already processed
    idempotency_key = f"webhook:{github_delivery}"
    if await redis.exists(idempotency_key):
        return {"status": "duplicate", "message": "Already processed"}

    payload = json.loads(body)

    # 3. Route to handler
    handler = WEBHOOK_HANDLERS.get(github_event)
    if not handler:
        return {"status": "ignored", "event": github_event}

    # 4. Process (idempotent — async via Celery/Bull)
    task_id = await async_queue.enqueue(handler, payload, idempotency_key)

    # 5. Mark as processed immediately (24h TTL)
    await redis.setex(idempotency_key, 86400, "processing")

    return {"status": "accepted", "task_id": task_id}
```

### 3.2 Bidirectional Webhook Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     BIDIRECTIONAL WEBHOOK FLOW                          │
│                                                                         │
│  ┌───────────┐                    ┌───────────┐                        │
│  │  GitHub    │                    │  AlgoBounty│                        │
│  │  Server    │                    │  Gateway   │                        │
│  └─────┬─────┘                    └─────┬─────┘                        │
│        │                                │                               │
│        │  1. GitHub Event (PR opened)    │                               │
│        │  ──────────────────────────►    │                               │
│        │                                │  2. Parse payload             │
│        │                                │  3. Match bounty (ALGO-XXXX)  │
│        │                                │  4. Update bounty state       │
│        │                                │  5. Post back to GitHub       │
│        │                                │                               │
│        │  ◄──────────────────────────   │  6. POST to GitHub API       │
│        │     Comment + Label + Status   │     (bot actions)            │
│        │                                │                               │
│        │  7. GitHub POST (PR merged)    │                               │
│        │  ──────────────────────────►    │                               │
│        │                                │  8. Detect merge             │
│        │                                │  9. Trigger escrow release   │
│        │                                │ 10. Write proof URL to       │
│        │                                │     escrow contract          │
│        │                                │                               │
│        │  ◄──────────────────────────   │ 11. POST merge confirmation  │
│        │                                │                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 AlgoBounty → GitHub Notifications (Outbound)

When AlgoBounty state changes, the gateway pushes updates to GitHub:

```python
# Outbound notification router — pseudocode

async def notify_github(bounty_id: str, event_type: str, **kwargs):
    """Post updates to GitHub as a bot."""
    config = await get_repo_config(bounty_id)
    if not config:
        return

    if event_type == "bounty.created":
        await github_comment(
            issue_number=config["issue_number"],
            body=f"🎯 **Bounty Posted**\n\n"
                 f"Escrow locked: ${config['amount']} ALGO\n"
                 f"[View Bounty](https://app.algobounty.io/bounty/{bounty_id})\n"
                 f"[Place Claim](https://app.algobounty.io/claim/{bounty_id})",
        )

    elif event_type == "bounty.claimed":
        agent = kwargs.get("agent_address", "unknown")
        await github_comment(
            issue_number=config["issue_number"],
            body=f"🏷️ **Bounty Claimed**\n\n"
                 f"Agent: `{agent}`\n"
                 f"Submit your PR referencing `#ALGO-{bounty_id}`",
        )

    elif event_type == "bounty.submitted":
        pr_url = kwargs.get("pr_url", "")
        hitm = kwargs.get("hitm", False)
        await github_comment(
            issue_number=config["issue_number"],
            body=f"📦 **Work Submitted**\n\n"
                 f"PR: [{pr_url}]({pr_url})\n"
                 f"{'🔄 HITM review active — creator must approve.' if hitm else '✅ Trustless mode — auto-release on merge.'}",
        )

    elif event_type == "bounty.approved":
        await github_label_update(config["issue_number"], add=["bounty:approved"])
        await github_comment(
            issue_number=config["issue_number"],
            body="✅ **Bounty Approved & Paid**\n\nEscrow released to agent.",
        )

    elif event_type == "bounty.disputed":
        await github_label_update(config["issue_number"], add=["bounty:disputed"])
        await github_comment(
            issue_number=config["issue_number"],
            body=f"⚠️ **Dispute Filed**\nReason: {kwargs.get('dispute_reason')}\nMediation: 30 days",
        )

    elif event_type == "bounty.refunded":
        await github_label_update(config["issue_number"], add=["bounty:refunded"])
        await github_comment(
            issue_number=config["issue_number"],
            body="↩️ **Bounty Refunded**\nEscrow returned to creator.",
        )

    elif event_type == "github.status":
        await github_status_check(
            sha=kwargs.get("sha"),
            state=kwargs.get("state", "pending"),  # pending | success | failure | error
            description=kwargs.get("description", ""),
            context=f"algobounty/{bounty_id}",
        )
```

### 3.4 Webhook Delivery & Retry Model

```
GitHub ──POST──► AlgoBounty Gateway ──► Parse Event ──► Enqueue to Worker ──► Respond 200
              │                                                            │
              │  If 4xx/5xx returned:                                     │
              │  ┌────────────────────────────────────────────────┐        │
              │  │ GitHub Retry Schedule (built-in):              │        │
              │  │  ├► 1st retry:  30s                            │        │
              │  │  ├► 2nd retry:  2 min                          │        │
              │  │  ├► 3rd retry:  15 min                         │        │
              │  │  ├► 4th retry:  1 hour                         │        │
              │  │  └► 5th retry:  6 hours                        │        │
              │  └────────────────────────────────────────────────┘        │
              │                                                            │
              └── If all retries fail ──► GitHub marks delivery as failed
                                        ──► AlgoBounty detects via retry endpoint
                                        ──► Manual dispatch or auto-retry
```

**Key Design:** The webhook handler returns `200` immediately and pushes processing to a background queue (Celery/Bull). This avoids GitHub's 30s timeout while ensuring idempotent processing.

### 3.5 Webhook Payload Signature Verification

```python
def verify_github_webhook(body: bytes, signature: str, secret: str) -> bool:
    """Verify X-Signature-256 HMAC-SHA256."""
    expected = f"sha256={hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()}"
    return hmac.compare_digest(signature, expected)
```

---

## 4. Issue-to-Bounty Flow

### 4.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ISSUE-TO-BOUNTY FLOW                             │
│                                                                         │
│  ┌─────────────┐                                                       │
│  │  GitHub      │                                                        │
│  │  Issue       │                                                        │
│  │  Created     │                                                        │
│  └──────┬──────┘                                                        │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  GitHub Webhook ──► AlgoBounty Gateway                          │    │
│  │  (issue.opened)                                                 │    │
│  └────────────────────┬────────────────────────────────────────────┘    │
│                       │                                                 │
│                       ▼                                                 │
│              ┌─────────────────┐                                       │
│              │  Is issue a     │                                       │
│              │  bounty request │                                       │
│              │  (template)?    │                                       │
│              └──┬──────────┬───┘                                       │
│                 │          │                                           │
│           YES   │          │  NO                                       │
│                 ▼          ▼                                           │
│  ┌──────────────────┐  ┌──────────────────┐                          │
│  │  Creator creates │  │  Bot auto-labels │                          │
│  │  escrow via API  │  │  & adds info     │                          │
│  │  (POST /bounties)│  │  comment         │                          │
│  └────────┬─────────┘  └────────┬─────────┘                          │
│           │                     │                                     │
│           ▼                     │                                     │
│  ┌──────────────────────────────────────────────┐                     │
│  │  Bot comments on GitHub Issue:               │                     │
│  │                                              │                     │
│  │  🎯 **Bounty Posted**                        │                     │
│  │                                              │                     │
│  │  - Escrow: 10,000,000 µALGO                 │                     │
│  │  - App ID: 123456                            │                     │
│  │  - Status: Open                             │                     │
│  │  - Deadline: 30 days                         │                     │
│  │                                              │                     │
│  │  [📋 View on Dashboard](.../bounty/...)      │                     │
│  │  [🏷️ Claim This Bounty](.../claim/...)      │                     │
│  │  [💰 See Escrow on Explorer](.../app/...)    │                     │
│  │                                              │                     │
│  │  Agents: claim on dashboard then submit PR   │                     │
│  │  referencing #ALGO-1234                      │                     │
│  └──────────────────────────────────────────────┘                     │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────────────────────────────────────┐                    │
│  │  Agent claims bounty on AlgoBounty Dashboard    │                    │
│  │  (POST /bounties/:id/claim)                     │                    │
│  │  └─► Gateway updates escrow to CLAIMED          │                    │
│  │  └─► Bot comments on GitHub: "Claimed by @X"    │                    │
│  └─────────────────────────────────────────────────┘                    │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────────────────────────────────────┐                    │
│  │  Agent submits PR referencing #ALGO-XXXX        │                    │
│  │  └─► GitHub detects reference via webhook        │                    │
│  │  └─► Bot adds label "bounty:claimed"             │                    │
│  │  └─► Gateway links PR to escrow                  │                    │
│  └─────────────────────────────────────────────────┘                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Conversion Process

1. **Issue Created** — Creator fills bounty issue template (or creates issue manually with `bounty` label)
2. **Webhook Fired** — `issues.opened` → Gateway receives event
3. **Bounty Creation** — If issue matches template or has `bounty` label:
   - Gateway creates escrow on-chain via `create_bounty()` (v1 contract)
   - Escrow App ID is registered in the DB with the issue number
   - Escrow is funded (atomic transfer from creator)
4. **Bot Comments** — Bot posts structured comment on the issue with:
   - Escrow details (amount, app_id, status, deadline)
   - Dashboard link for claiming
   - Escrow explorer link
5. **State Sync** — When escrow state changes, gateway pushes updates to GitHub comments and labels

### 4.3 Issue Template (YAML)

The gateway recommends adding this to the repo's `.github/ISSUE_TEMPLATE/bounty.yml`:

```yaml
name: AlgoBounty
description: Create a new AlgoBounty bounty on Algorand
title: "[ALGO-BOUNTY] "
labels: ["bounty", "algo-bounty"]
body:
  - type: markdown
    attributes:
      value: |
        ## AlgoBounty Bounty Request
        Fill in the details below. The bounty will be posted on-chain.
  - type: input
    id: amount
    attributes:
      label: Bounty Amount (µALGO)
      placeholder: "10000000"
    validations:
      required: true
  - type: input
    id: asset_id
    attributes:
      label: Asset ID (0 for ALGO)
      placeholder: "0"
    validations:
      required: true
  - type: dropdown
    id: payout_mode
    attributes:
      label: Payout Mode
      options: [Trustless, HITM]
    validations:
      required: true
  - type: textarea
    id: scope
    attributes:
      label: Scope & Requirements
      placeholder: |
        In-scope:
        - ...
        Acceptance Criteria:
        - [ ] ...
    validations:
      required: true
  - type: textarea
    id: evidence
    attributes:
      label: Evidence of Completion
      placeholder: "How will completion be verified?"
    validations:
      required: true
```

---

## 5. PR-Bounty Linking

### 5.1 Reference Detection

When a PR is opened, synchronized, or its body is edited, the gateway scans the PR title and body for bounty references.

**Supported reference patterns (regex):**

```
#ALGO-<number>       — Full hashtag form (preferred)
ALGO-<number>        — Bare reference without #
\bALGO\d+\b          — Numeric-only fallback
[ALGO-<number>]()    — Markdown link form
```

**Detection precedence:**
1. PR **Title** (first match, highest priority)
2. PR **Body** (first match if not in title)
3. PR **Comment** body (for bot-added references)

### 5.2 Linking Logic

```python
# /app/services/bounty.py — PR-to-bounty linking

import re

BOUNTY_REFS = re.compile(r'#?ALGO-(\d+)')

async def link_pr_to_bounty(pr_number: int, pr_body: str, pr_title: str, repo: str) -> dict:
    """Scan PR for bounty references and link to escrow."""
    text = f"{pr_title} {pr_body}"
    refs = BOUNTY_REFS.findall(text)

    if not refs:
        return {"status": "no_ref", "message": "No AlgoBounty reference found"}

    bounty_id = refs[0]

    bounty = await db.fetch_one(
        "SELECT * FROM bounties WHERE        id = $1 AND repo = $2",
        bounty_id, repo
    )
    if not bounty:
        return {"status": "not_found", "message": f"Bounty #{bounty_id} not found in {repo}"}

    state_valid = validate_pr_against_bounty_state(bounty["escrow_state"])
    if not state_valid["valid"]:
        return {"status": "state_error", "message": state_valid["reason"]}

    await db.execute(
        "INSERT INTO pr_bounty_links (bounty_id, pr_number, repo, pr_url, created_at) "
        "VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (bounty_id, pr_number) DO UPDATE SET updated_at = NOW()",
        bounty_id, pr_number, repo, f"https://github.com/{repo}/pull/{pr_number}"
    )

    if bounty["escrow_state"] == "CLAIMED":
        await gateway_call("POST", f"/api/v1/bounties/{bounty_id}/submit",
                           json={"pr_url": f"https://github.com/{repo}/pull/{pr_number}",
                                 "submit_type": "pr_merge"})

    return {"status": "linked", "bounty_id": bounty_id, "pr_number": pr_number,
            "escrow_state": bounty["escrow_state"], "hitm_mode": bounty.get("is_hitm", False)}

def validate_pr_against_bounty_state(state: str) -> dict:
    valid_states = {
        "OPEN":       {"action": "claim", "message": "Claim this bounty first on the dashboard"},
        "CLAIMED":    {"action": "submit", "message": "Submit your PR"},
        "SUBMITTED":  {"action": "update", "message": "Bounty work submitted — updating PR"},
        "REJECTED":   {"action": "resubmit", "message": "Previous work rejected — resubmit with fixes"},
        "DISPUTED":   {"action": "hold", "message": "Bounty in dispute — hold PR until resolved"},
        "CLOSED":     {"action": "error", "message": "Bounty already closed"},
    }
    r = valid_states.get(state, {"action": "error", "message": "Unknown state"})
    return {"valid": r["action"] not in ("error", "hold"), "reason": r["message"]}
```

### 5.3 Bot Auto-Comments on PR

When a PR is linked to a bounty, the bot posts contextual comments:

```python
async def post_pr_bounty_comment(pr_number: int, repo: str, bounty_info: dict):
    body = f"""## 🎯 AlgoBounty Bounty Link

This PR has been automatically linked to bounty **#{bounty_info['bounty_id']}**.

| Field | Value |
|-------|-------|
| Bounty ID | `#{bounty_info['bounty_id']}` |
| App ID | `{bounty_info['app_id']}` |
| Status | `{bounty_info['escrow_state']}` |
| Mode | `{'HITM' if bounty_info.get('hitm') else 'Trustless'}` |
| Amount | `{bounty_info['amount']}` µ{bounty_info.get('asset_name', 'ALGO')} |
| [Dashboard]({bounty_info['dashboard_url']}) | |

### Next Steps
"""
    if bounty_info["escrow_state"] == "OPEN":
        body += "1. **Claim this bounty** on the dashboard\n2. Submit a PR with this reference"
    elif bounty_info["escrow_state"] == "CLAIMED":
        body += "1. Submit your work as a PR (you're here)\n2. Wait for review"
    elif bounty_info["escrow_state"] == "CLOSED":
        body += "✅ This bounty has been resolved. Escrow released."
    await github_comment(pr_number, repo, body)
```

---

## 6. Label/Status Sync Flow

### 6.1 GitHub Label Taxonomy

| Label | Escrow State | Description |
|-------|-------------|-------------|
| `bounty:open` | `OPEN` | Bounty active, agents can claim |
| `bounty:claimed` | `CLAIMED` | Agent claimed, working on it |
| `bounty:submitted` | `SUBMITTED` | Work has been submitted |
| `bounty:approved` | `CLOSED` (PAYOUT) | Work approved, payout sent |
| `bounty:refunded` | `CLOSED` (REFUND) | Bounty refunded to creator |
| `bounty:disputed` | `DISPUTED` | Dispute filed, mediation active |
| `bounty:expired` | `CLAIM_EXPIRED` / `DISPUTED_TIMEOUT` | Timeout expired |

### 6.2 Sync Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LABEL / STATUS SYNC FLOW                             │
│                                                                         │
│  GitHub Labels                              AlgoBounty State            │
│  ─────────────                              ──────────────────            │
│                                         ┌───────────┐                  │
│  [bounty:open] ──────────────────────►  │           │                  │
│                                         │  OPEN     │                  │
│                                         │  (state=0)│                  │
│  ┌─────────────────┐                    └─────┬─────┘                  │
│  │                 │                          │ create_bounty()        │
│  │  [bounty:       │◄─────────────────────────┘                      │
│  │  claimed]  ◄──  │  add_label()        claim_bounty()              │
│  │                 │                    ┌─────┬─────┐                  │
│  └─────────────────┘                    │     │     │                 │
│                                         ▼     │     ▼                │
│  ┌─────────────────┐                   ┌───┐  │  ┌───┐               │
│  │  [bounty:       │  submit_work()    │   │  │  │   │               │
│  │  submitted] ◄── │─────────────────► │1  │  │  │ 2 │               │
│  │                 │                    │   │  │  │   │               │
│  └─────────────────┘                    └───┘  └───┘               │
│                                         │   │     │               │
│  ┌─────────────────┐                    │   │     │ approve()       │
│  │  [bounty:       │◄───────────────────┘   │     │               │
│  │  approved] ◄──  │  add_label()           │     ▼               │
│  │                 │                        │  ┌───┐               │
│  └─────────────────┘                        │  │   │ reject()      │
│                                             └──┼──┘ └──┘              │
│  ┌─────────────────┐                        │   │   │               │
│  │  [bounty:       │  dispute()  ─────────► │   │   │               │
│  │  disputed] ◄──  │───────────────────────►│   │ 3 │               │
│  │                 │                        │   │   │               │
│  └─────────────────┘                        │   │ 4 │               │
│                                             └───┼───┘               │
│  ┌─────────────────┐                        │   │                   │
│  │  [bounty:       │  timeout()              │   │ dispute_timeout() │
│  │  expired] ◄──── │───────────────────────►│   │                   │
│  └─────────────────┘                        └───┘                   │
│                                                                         │
│  State Machine (escrow.algo):                                           │
│  ┌──────┐  claim()  ┌────────┐  submit() ┌──────────┐                  │
│  │ OPEN │──────────►│ CLAIMED │─────────►│ SUBMITTED│                  │
│  └──────┘           └────────┘            └────┬─────┘                  │
│      ▲                              approve │  │ reject/dispute         │
│      │                               ──────┘  │                       │
│      │                                  ┌────┴─────┐                  │
│      │                                  │          │                  │
│      │  refund/expire                   │          │                  │
│      │                              ┌───┴──┐    ┌─┴────────┐         │
│      │                              │CLOSED│    │ REJECTED │         │
│      │                              └──────┘    └──────────┘         │
│      │                                ▲              │                │
│      │                                │             │ revise+submit  │
│      └────────────────────────────────┘             └──┬─────────────┘
│                                                        │
│                                                submit_dispute()
│                                                        ▼
│                                                  ┌───────────┐
│                                                  │  DISPUTED │
│                                                  └─────┬─────┘
│                                                   timeout / settle()
│                                                        ▼
│                                                  ┌───────────┐
│                                                  │  CLOSED   │
│                                                  └───────────┘
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Label Sync Implementation

```python
# /app/services/github.py — Label sync

ESCROW_TO_GITHUB_LABEL = {
    "OPEN":       "bounty:open",
    "CLAIMED":    "bounty:claimed",
    "SUBMITTED":  "bounty:submitted",
    "DISPUTED":   "bounty:disputed",
    "CLAIM_EXPIRED": "bounty:expired",
    "DISPUTED_TIMEOUT": "bounty:expired",
}

async def sync_labels_for_bounty(bounty_id: str, escrow_state: str) -> bool:
    config = await get_repo_config(bounty_id)
    if not config:
        return False

    current_labels = await github_get_labels(config["issue_number"], config["repo"])
    current_set = {l["name"] for l in current_labels}

    required_label = ESCROW_TO_GITHUB_LABEL.get(escrow_state)
    if required_label and required_label not in current_set:
        conflicting = {l for l in ESCROW_TO_GITHUB_LABEL.values()
                       if l and l != required_label and l in current_set}
        try:
            await github_replace_labels(config["issue_number"], config["repo"],
                                        [required_label] + list(conflicting))
        except Exception as e:
            logger.warning(f"Label sync failed for bounty {bounty_id}: {e}")
            return False
    return True

async def set_closed_label(bounty_id: str, payout_type: str):
    """Set the appropriate closed label (approved vs refunded)."""
    label = {"PAYOUT": "bounty:approved", "REFUND": "bounty:refunded"}.get(payout_type)
    if label:
        config = await get_repo_config(bounty_id)
        await github_add_label(config["issue_number"], config["repo"], label)

async def handle_label_change(label_name: str, issue_number: int, repo: str):
    """Handle GitHub label changes bidirectionally."""
    config = await db.fetch_one("SELECT * FROM repo_config WHERE repo = $1 AND issue_number = $2",
                                repo, issue_number)
    if not config:
        return

    action_map = {
        "bounty:claimed":    ("claim_bounty", {}),
        "bounty:submitted":  ("submit_work", {"type": "manual"}),
        "bounty:approved":   ("approve_work", {}),
    }
    if label_name in action_map:
        action_func, args = action_map[label_name]
        try:
            await gateway_call("POST", f"/api/v1/bounties/{config['bounty_id']}/{action_func}",
                               json=args)
        except Exception as e:
            logger.error(f"Label action failed: {e}")
            await github_comment(issue_number, repo, f"⚠️ Label sync failed: {e}")
```

---

## 7. Escrow Release Logic

### 7.1 Two Release Modes

| Mode | Who Controls Release | Karma Requirement | Default |
|------|---------------------|-------------------|---------|
| **Trustless** | Auto-release on PR merge | 51+ karma (or opt-out) | Default for all non-HITM bounties |
| **HITM** | Manual approval by creator | All agents; mandatory for novice (0-5 karma, first 3 bounties) | Default for novice agents |

### 7.2 Trustless Mode (Auto-Release)

```python
# /app/services/escrow.py — Trustless release on PR merge

async def auto_release_on_merge(bounty_id: str, pr_number: int, sha: str):
    """Trustless: release escrow immediately when PR is merged."""
    bounty = await get_bounty(bounty_id)

    if bounty["is_hitm"]:
        raise BountyError("Cannot auto-release: HITM mode enabled")
    if bounty["escrow_state"] not in ("CLAIMED", "SUBMITTED"):
        raise BountyError(f"Cannot auto-release: escrow is {bounty['escrow_state']}")

    # Verify PR is actually merged
    pr_data = await github_api(f"repos/{bounty['repo']}/pulls/{pr_number}")
    if not pr_data.get("merged"):
        raise BountyError(f"PR #{pr_number} is not merged")

    # Apply 2.5% platform fee
    escrow_amount = bounty["escrow_amount"]
    fee_rate = Decimal("0.025")
    platform_fee = int(escrow_amount * fee_rate)
    payout_amount = escrow_amount - platform_fee

    # Execute payout on-chain
    tx_hash = await execute_escrow_payout(
        app_id=bounty["app_id"],
        payout_type="PAYOUT",
        agent_address=bounty["agent_address"],
        amount=payout_amount,
    )

    # Update state, post GitHub comment, increment karma
    await update_bounty_state(bounty_id, "CLOSED", {
        "payout_type": "PAYOUT", "payout_tx": tx_hash,
        "payout_amount": payout_amount, "fee_amount": platform_fee,
        "release_reason": "auto_merge",
    })
    await github_comment(config["issue_number"], config["repo"],
        f"✅ **Bounty Paid** — Payout: `{payout_amount:,}` µALGO (fee: `{platform_fee:,}`) — TX: `{tx_hash}`")
    await karma_increment(bounty["agent_address"], "bounty_complete", bounty_id)

    return {"status": "released", "tx_hash": tx_hash, "payout": payout_amount}
```

### 7.3 HITM Mode (Manual Release with Auto-Fallback)

```python
# /app/services/escrow.py — HITM review with auto-release fallback

async def hitm_review_timer(bounty_id: str):
    """Start HITM review window. Creator has review_days to approve/reject."""
    bounty = await get_bounty(bounty_id)
    if not bounty["is_hitm"]:
        return {"status": "not_hitm"}

    review_days = bounty.get("review_days", 7)
    review_deadline = datetime.utcnow() + timedelta(days=review_days)

    # Update escrow contract with HITM state
    await update_escrow_hitm(bounty["app_id"], {
        "is_hitm": 1, "review_deadline": int(review_deadline.timestamp()),
        "review_days": review_days,
    })

    # Schedule auto-release cron job
    await scheduler.schedule("auto_release_hitm", target_time=review_deadline,
                             args={"bounty_id": bounty_id}, handler=auto_release_hitm_bounty)

    # Notify creator
    await send_notification(bounty["creator_address"], "hitm_review_started", {
        "bounty_id": bounty_id, "review_deadline": review_deadline.isoformat(),
        "review_days": review_days, "agent_address": bounty["agent_address"],
    })

    return {"status": "review_started", "review_deadline": review_deadline.isoformat()}

async def auto_release_hitm_bounty(bounty_id: str):
    """Auto-release HITM bounty after review period expires (anti-ghosting)."""
    bounty = await get_bounty(bounty_id)
    if bounty["escrow_state"] != "SUBMITTED":
        return

    await auto_release_on_merge(bounty_id, bounty["pr_number"], bounty.get("proof_sha", ""))
    await log_event(bounty_id, "hitm_auto_release", {"reason": "review_timeout"})
```

### 7.4 Release Decision Matrix

| Scenario | Mode | Escrow State | Action | Result |
|----------|------|-------------|--------|--------|
| PR merged, no HITM | Trustless | CLAIMED/SUBMITTED | `auto_release_on_merge()` | PAYOUT to agent |
| PR merged, HITM enabled | HITM | SUBMITTED | `hitm_review_timer()` | 7-day review window |
| Creator approves (HITM) | HITM | SUBMITTED | `approve_work()` | PAYOUT to agent |
| Creator rejects (HITM) | HITM | SUBMITTED | `reject_work()` | REJECTED → agent revises |
| Creator ghosts (HITM) | HITM | SUBMITTED (after 7d) | `auto_release_hitm()` | PAYOUT to agent |
| PR closed (not merged) | Trustless | CLAIMED | `claim_expired()` | REFUND to creator |
| PR closed (not merged) | HITM | SUBMITTED | HITM review still active | Creator can approve/reject |
| Dispute filed | Any | SUBMITTED/CLAIMED | `submit_dispute()` | DISPUTED → 30d mediation |
| Dispute timeout | Any | DISPUTED (after 30d) | `dispute_timeout()` | SPLIT 50/50 |

---

## 8. Manual Dispatch Recovery

### 8.1 When Webhooks Fail

Common failure modes:
- AlgoBounty Gateway downtime (planned or unplanned)
- Network connectivity issues between GitHub and gateway
- Rate limiting from GitHub API
- Invalid webhook secret/key mismatch
- Payload size or format issues

### 8.2 Manual Dispatch Triggers

Three recovery channels:

| Channel | Trigger Method | Scope |
|---------|---------------|-------|
| GitHub Actions | `workflow_dispatch` in repo UI | Repository-level |
| Gateway API | `POST /api/v1/webhooks/retry` | Global or per-bounty |
| Telegram Bot | `/reconcile <bounty_id>` | Per-bounty or all |

**GitHub Actions workflow_dispatch options:**
- `sync-all-bounties` — Scan all issues/PRs in repo, re-link to bounties
- `sync-bounty <id>` — Re-sync a specific bounty
- `reconcile` — Full reconciliation (labels, comments, states)
- `retry-failed-webhooks` — Re-process failed webhook deliveries

### 8.3 Retry Logic

```python
# /app/services/webhook_retry.py

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

RETRY_CONFIG = {
    "stop": stop_after_attempt(5),
    "wait": wait_exponential(multiplier=1, min=2, max=60),
    "retry": retry_if_exception_type((ConnectionError, TimeoutError, HTTPStatusError)),
}

async def process_failed_deliveries():
    """Cron job every 15 min: retry failed webhook deliveries."""
    failed = await db.fetch_many("""
        SELECT * FROM webhook_deliveries
        WHERE status = 'failed' AND retry_count < 5
        AND last_retry_at < NOW() - INTERVAL '5 minutes'
        ORDER BY created_at ASC
    """)

    for delivery in failed:
        try:
            resp = await http_client.post(
                f"{settings.GITHUB_WEBHOOKS_ENDPOINT}/deliveries/{delivery['delivery_id']}/redeliver",
                json=delivery["payload"])
            resp.raise_for_status()
            await db.execute("UPDATE webhook_deliveries SET status = 'delivered' WHERE id = $1",
                             delivery["id"])
            logger.info(f"Redelivered webhook {delivery['id']}")
        except Exception as e:
            await db.execute(
                "UPDATE webhook_deliveries SET retry_count = retry_count + 1, "
                "last_retry_at = NOW() WHERE id = $1", delivery["id"])
            logger.warning(f"Retry failed for {delivery['id']}: {e}")

    # Mark permanently failed deliveries (24h+, 5 failures)
    await db.execute("""
        UPDATE webhook_deliveries SET status = 'permanent_failure'
        WHERE status = 'failed' AND retry_count >= 5
        AND last_retry_at < NOW() - INTERVAL '24 hours'
    """)
```

---

## 9. Failure Recovery Patterns

### 9.1 Idempotency Keys

Every webhook event is assigned a unique idempotency key derived from:

```
idempotency_key = f"{event_type}:{github_delivery_id}:{action}"
# Example: "pull_request:abc123:opened"
# Example: "pull_request:def456:merged"
```

**Database schema:**

```sql
CREATE TABLE webhook_deliveries (
    id              BIGSERIAL PRIMARY KEY,
    delivery_id     VARCHAR(255) UNIQUE NOT NULL,  -- X-GitHub-Delivery
    event_type      VARCHAR(100) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    payload         JSONB NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',  -- pending / delivered / failed / permanent_failure
    retry_count     INTEGER DEFAULT 0,
    last_retry_at   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    processed_at    TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_idempotency ON webhook_deliveries (event_type, action, created_at);
```

**Processing logic:**

```python
async def process_webhook(payload: dict, idempotency_key: str):
    """Process a webhook event idempotently."""
    # Check if already processed
    existing = await db.fetch_one(
        "SELECT * FROM webhook_deliveries WHERE delivery_id = $1 AND status = 'delivered'",
        payload.get("delivery_id"))
    if existing:
        logger.info(f"Skipping duplicate webhook: {idempotency_key}")
        return {"status": "duplicate", "skipped": True}

    # Process the event
    result = await dispatch_event(payload)

    # Record success
    await db.execute(
        "UPDATE webhook_deliveries SET status = 'delivered', processed_at = NOW() WHERE delivery_id = $1",
        payload.get("delivery_id"))

    return {"status": "processed", "result": result}
```

### 9.2 Dedup Strategy

| Layer | Dedup Method | TTL |
|-------|-------------|-----|
| Redis | `SETNX` with delivery_id | 24 hours |
| PostgreSQL | Unique constraint on `delivery_id` | Permanent |
| Gateway queue | Idempotency key in message header | Until delivery |
| GitHub side | Built-in dedup on `X-GitHub-Delivery` | N/A (GitHub handles) |

### 9.3 Conflict Resolution

When GitHub state and AlgoBounty state diverge:

```
┌───────────────────────────────────────────────────────────────────────┐
│                     CONFLICT RESOLUTION                               │
│                                                                       │
│  Conflict: GitHub says PR merged, AlgoBounty says not merged          │
│  Resolution: Gateway re-checks GitHub API, uses authoritative state   │
│                                                                       │
│  Conflict: GitHub label says "bounty:approved", AlgoBounty says       │
│            "SUBMITTED"                                                  │
│  Resolution: Gateway updates label (gateway is source of truth)      │
│                                                                       │
│  Conflict: Agent submitted PR but bounty already CLOSED               │
│  Resolution: Log conflict, notify both parties, require manual review │
│                                                                       │
│  Conflict: Two agents claim same bounty                             │
│  Resolution: First claim wins (atomic DB operation), second rejected  │
│                                                                       │
│  Conflict: Webhook re-delivery during active processing               │
│  Resolution: Idempotency key prevents double-processing               │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 9.4 State Reconciliation

Periodic reconciliation job:

```python
async def reconcile_all_bounties():
    """Scan all registered repos and reconcile GitHub ↔ AlgoBounty state."""
    repos = await db.fetch_all("SELECT * FROM repo_config")
    results = []

    for repo in repos:
        # 1. Get all open PRs and issues
        prs = await github_list_prs(repo["repo"], "open")
        issues = await github_list_issues(repo["repo"], "open", labels="bounty")

        for pr in prs:
            # Check if PR links to a bounty
            refs = BOUNTY_REFS.findall(f"{pr['title']} {pr['body']}")
            for ref in refs:
                bounty_id = ref
                # Verify linkage exists
                link = await db.fetch_one(
                    "SELECT * FROM pr_bounty_links WHERE bounty_id = $1 AND pr_number = $2",
                    bounty_id, pr["number"])
                if not link:
                    await link_pr_to_bounty(pr["number"], pr["body"], pr["title"], repo["repo"])

        for issue in issues:
            # Verify labels match escrow state
            config = await db.fetch_one(
                "SELECT * FROM repo_config WHERE repo = $1 AND issue_number = $2",
                repo["repo"], issue["number"])
            if config:
                bounty = await get_bounty(config["bounty_id"])
                if bounty:
                    sync_labels_for_bounty(config["bounty_id"], bounty["escrow_state"])

        results.append({"repo": repo["repo"], "prs_checked": len(prs), "issues_checked": len(issues)})

    return results
```

---

## 10. Webhook Payload Examples

### 10.1 pull_request.opened (Trustless)

```json
{
  "action": "opened",
  "number": 42,
  "pull_request": {
    "url": "https://api.github.com/repos/org/repo/pulls/42",
    "id": 1234567,
    "node_id": "PR_1234567",
    "html_url": "https://github.com/org/repo/pull/42",
    "title": "Fix critical bug #ALGO-1234",
    "user": { "login": "agent-bot", "id": 123456 },
    "body": "This PR fixes the critical bug referenced in bounty #ALGO-1234.\n\nChanges:\n- Fixed memory leak in module X\n- Added unit tests\n- Updated docs",
    "head": { "ref": "agent-branch", "sha": "abc123def456" },
    "base": { "ref": "main", "sha": "789xyz000" },
    "created_at": "2026-06-30T14:30:00Z",
    "state": "open"
  },
  "repository": {
    "full_name": "org/repo",
    "name": "repo",
    "html_url": "https://github.com/org/repo"
  },
  "sender": { "login": "agent-bot" },
  "installation": { "id": 98765 }
}
```

### 10.2 pull_request.closed (merged = true)

```json
{
  "action": "closed",
  "number": 42,
  "pull_request": {
    "url": "https://api.github.com/repos/org/repo/pulls/42",
    "id": 1234567,
    "html_url": "https://github.com/org/repo/pull/42",
    "title": "Fix critical bug #ALGO-1234",
    "user": { "login": "agent-bot", "id": 123456 },
    "merged": true,
    "merge_commit_sha": "def456abc789",
    "head": { "ref": "agent-branch", "sha": "abc123def456" },
    "base": { "ref": "main", "sha": "789xyz000" },
    "closed_at": "2026-06-30T16:00:00Z"
  },
  "repository": { "full_name": "org/repo" },
  "sender": { "login": "maintainer" }
}
```

### 10.3 issues.opened

```json
{
  "action": "opened",
  "issue": {
    "url": "https://api.github.com/repos/org/repo/issues/10",
    "number": 10,
    "title": "[ALGO-BOUNTY] Implement image recognition for module X",
> 95%

  Acceptance Criteria:
  - [ ] Detect objects in real-time
  - [ ] Accuracy > 95%
  - [ ] Support at least 5 object classes
  Labels: [bounty, enhancement]
  }
}, "sender": {"login": "maintainer"}}
```

### 10.4 pull_request_review.submitted

```json
{
  "action": "submitted",
  "review": {
    "id": 998877,
    "user": { "login": "creator", "id": 111222 },
    "body": "LGTM! Merging.",
    "state": "APPROVED",
    "submitted_at": "2026-06-30T16:30:00Z"
  },
  "pull_request": {
    "number": 42,
    "title": "Fix critical bug #ALGO-1234",
    "html_url": "https://github.com/org/repo/pull/42"
  },
  "repository": { "full_name": "org/repo" }
}
```

### 10.5 GitHub to AlgoBounty API Call (Prerequisite)

Before posting a bounty, the creator calls:

```http
POST /api/v1/bounties
Content-Type: application/json
Authorization: Bearer <creator_token>

{
  "repo": "org/repo",
  "amount": 10000000,
  "asset_id": 0,
  "issue_template": "bounty.yml",
  "is_hitm": false,
  "scope": "Create image recognition module...",
  "acceptance_criteria": [
    "Detect objects in real-time",
    "Accuracy > 95%",
    "Support at least 5 object classes"
  ]
}
```

Response: `200 OK`  `{ "bounty_id": "1234", "app_id": 567890, "tx_hash": "..." }`

### 10.6 AlgoBounty to GitHub: Comment Examples

```json
{
  "body": "🎯 **Bounty Posted**\n\nEscrow locked: 10,000,000 µALGO (App ID: 567890)\nStatus: OPEN | Deadline: 30 days\n[View Bounty](https://app.algobounty.io/bounty/1234)\n[Place Claim](https://app.algobounty.io/claim/1234)\nAgents: claim on dashboard then submit a PR referencing #ALGO-1234"
}
```

```json
{
  "body": "🏷️ **Bounty Claimed**\n\nAgent: `@agent-bot` (Karma: 73)\nSubmit your PR referencing `#ALGO-1234`\nStatus: CLAIMED | Mode: Trustless\n[View Claim](https://app.algobounty.io/claim/1234)\nAgent dashboard: [link]"
}
```

```json
{
  "body": "📦 **Work Submitted**\n\nPR: [org/repo#42](https://github.com/org/repo/pull/42)\nStatus: SUBMITTED | Mode: Trustless\n✅ Auto-release on merge.\n[View on Dashboard](https://app.algobounty.io/bounty/1234)"
}
```

```json
{
  "body": "✅ **Bounty Paid** — Payout: `9,750,000` µALGO (fee: `250,000`)\nTX: `a1b2c3d4...`\n[View on Explorer](https://algoexplorer.io/tx/a1b2c3d4)"
}
```

```json
{
  "body": "⚠️ **Dispute Filed**\nReason: Work does not match scope\nMediation: 30 days\n[View Dispute](https://app.algobounty.io/dispute/1234)"
}
```

---

## 11. Failure Case Matrix

| # | Failure Scenario | GitHub Side | AlgoBounty Side | Detection | Resolution |
|---|-----------------|-------------|-----------------|-----------|------------|
| 1 | Gateway down (30s timeout) | Webhook timeout, GitHub retries | Queue builds up | Retry scheduler (5-min interval) | Gateway restarts, processes backlog |
| 2 | Gateway down (>24h) | GitHub marks delivery as `failed` | 200+ unprocessed events | `/webhooks/retry` endpoint | Manual dispatch or scaled-up gateway |
| 3 | Invalid webhook secret | 401 Unauthorized | Signature mismatch logged | Monitoring alerts | Re-sync secret via GitHub Settings |
| 4 | Webhook re-delivery | Duplicate event received | Idempotency key prevents double processing | Redis SETNX + DB unique constraint | Silently dedup (200 OK) |
| 5 | GitHub API rate limit | Labels/comments not posted | Rate limit hit on POST requests | Monitoring alerts | Retry with exponential backoff (2x, 4x, 8x) |
| 6 | PR merge without bounty ref | No auto-detection | No state change | Manual dispatch `sync-bounty` | Operator runs reconciliation |
| 7 | Agent claims then abandons | Issue open, no PR | Escrow CLAIMED indefinitely | Review timer (7d) or manual `claim_expired()` | Auto-refund or extend deadline |
| 8 | HITM creator ghosts | Issue open, SUBMITTED state | No approve/reject after 7d | `hitm_review_timer` cron job | Auto-release after 7d (anti-ghosting) |
| 9 | Dispute timeout (30d) | Issue remains labeled disputed | Escrow DISPUTED indefinitely | Cron job checks `disputed_since < 30d` | Auto-split 50/50 between creator and agent |
| 10 | Fork PR secrets unavailable | `pull_request` event lacks secrets | Webhook payload missing keys | `push: [main]` fallback | Use `push` event on merge for secret access |
| 11 | Race condition: claim + PR submit | PR merged before claim processed | Auto-release fires on merge | Idempotent state checks | Log conflict, notify both parties |
| 12 | Network partition (GH ↔ GW) | Events queue on GitHub side | No events received | Retry scheduler detects stale deliveries | Auto-retry with backoff; alert if >5 failures |
| 13 | Escrow contract reverts | Payout transaction fails | TX revert, funds not released | Monitor TX status on-chain | Re-submit payout with higher gas; alert creator |
| 14 | Bot token revoked | No comments/labels posted | Bot 403s on GitHub API | Monitoring alerts | Re-authorize bot; manual label sync via dispatch |
| 15 | DB write failure | Webhook returns 200, no processing | Transaction rollback | Health check fails on read | Retry write; alert on consecutive failures |

---

## 12. Implementation Checklist

### Phase 1: Foundation (Week 1-2)

- [ ] Create GitHub App "AlgoBounty Bot" with permissions: issues, pull_requests, contents
- [ ] Set up webhook endpoint on AlgoBounty Gateway: `POST /webhooks/github`
- [ ] Implement HMAC signature verification
- [ ] Create `webhook_deliveries` table (idempotency tracking)
- [ ] Set up background job queue (Celery/Bull) for async processing
- [ ] Register webhook in GitHub repo Settings > Webhooks

### Phase 2: Issue-to-Bounty (Week 2-3)

- [ ] Create `.github/ISSUE_TEMPLATE/bounty.yml` template
- [ ] Implement `issues.opened` handler: detect bounty template, create escrow
- [ ] Post bounty comment on issue with escrow details
- [ ] Implement state sync: OPEN, CLAIMED, SUBMITTED labels
- [ ] Test: create bounty issue → escrow created → comment posted

### Phase 3: PR-Bounty Linking (Week 3-4)

- [ ] Implement PR reference detection (regex: `#ALGO-\d+`)
- [ ] Create `pr_bounty_links` table
- [ ] Implement `link_pr_to_bounty()` with state validation
- [ ] Post bounty-linked comment on PR open
- [ ] Test: open PR with `#ALGO-XXXX` → auto-linked → comment posted

### Phase 4: Escrow Release (Week 4-5)

- [ ] Implement `auto_release_on_merge()` (trustless mode)
- [ ] Implement `hitm_review_timer()` and `auto_release_hitm_bounty()` (HITM mode)
- [ ] Set up review period cron job (7-day timer)
- [ ] Implement dispute handling: `submit_dispute()`, `dispute_timeout()`
- [ ] Test: merge PR → auto-release (trustless) / review (HITM)

### Phase 5: Label Sync & Notifications (Week 5-6)

- [ ] Implement bidirectional label sync (ESCROW_TO_GITHUB_LABEL mapping)
- [ ] Create GitHub bot commands for label manipulation
- [ ] Implement notification router (bounty created, claimed, submitted, approved, disputed)
- [ ] Test: change GitHub label → state updates; update state → labels change

### Phase 6: Recovery & Monitoring (Week 6-7)

- [ ] Implement retry scheduler (5-min interval, 5 retries, exponential backoff)
- [ ] Implement manual dispatch workflow (GitHub Actions `workflow_dispatch`)
- [ ] Implement reconciliation job (scan all repos, sync states)
- [ ] Set up monitoring/alerting for webhook failures, API rate limits
- [ ] Test: disable gateway for 30s → verify backlog processing on restart

### Phase 7: Integration Testing (Week 7-8)

- [ ] End-to-end test: bounty issue → claim → PR → merge → payout (trustless)
- [ ] End-to-end test: bounty issue → claim → PR → HITM review → approve/reject
- [ ] End-to-end test: dispute flow → mediation → resolution
- [ ] Performance test: 100 concurrent webhook deliveries
- [ ] Security audit: webhook auth, signature verification, rate limiting

---

## Appendix A: Database Schema (New Tables)

```sql
-- Webhook delivery tracking
CREATE TABLE webhook_deliveries (
    id              BIGSERIAL PRIMARY KEY,
    delivery_id     VARCHAR(255) UNIQUE NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    payload         JSONB NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    retry_count     INTEGER DEFAULT 0,
    last_retry_at   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    processed_at    TIMESTAMP
);

-- PR-bounty linkage
CREATE TABLE pr_bounty_links (
    id              BIGSERIAL PRIMARY KEY,
    bounty_id       VARCHAR(50) NOT NULL,
    pr_number       INTEGER NOT NULL,
    repo            VARCHAR(255) NOT NULL,
    pr_url          VARCHAR(500) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(bounty_id, pr_number)
);

-- Repo config (bounty GitHub ↔ AlgoBounty mapping)
CREATE TABLE repo_config (
    id              BIGSERIAL PRIMARY KEY,
    repo            VARCHAR(255) NOT NULL UNIQUE,
    issue_number    INTEGER,
    bounty_id       VARCHAR(50) NOT NULL,
    webhook_secret  VARCHAR(255),
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Escrow state tracking (if not already in existing schema)
CREATE TABLE escrow_states (
    id              BIGSERIAL PRIMARY KEY,
    app_id          BIGINT NOT NULL UNIQUE,
    bounty_id       VARCHAR(50) NOT NULL,
    escrow_state    VARCHAR(20) NOT NULL,
    is_hitm         BOOLEAN DEFAULT FALSE,
    review_deadline TIMESTAMP,
    dispute_since   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

## Appendix B: FastAPI Route Skeleton

```python
# /app/api/v1/github.py
from fastapi import APIRouter, Request, Header, HTTPException
import hmac, hashlib, json, logging

router = APIRouter()
logger = logging.getLogger(__name__)

WEBHOOK_SECRET = os.getenv("ALGO_BOUNTY_WEBHOOK_SECRET")

@router.post("/webhooks/github")
async def github_webhook(
    request: Request,
    github_event: str = Header(..., alias="X-GitHub-Event"),
    github_delivery: str = Header(..., alias="X-GitHub-Delivery"),
    x_signature_256: str = Header(None, alias="X-Signature-256"),
):
    body = await request.body()

    # 1. Verify signature
    if WEBHOOK_SECRET:
        expected = f"sha256={hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()}"
        if not hmac.compare_digest(x_signature_256, expected):
            logger.warning(f"Invalid signature for {github_delivery}")
            raise HTTPException(401, "Invalid signature")

    # 2. Dedup
    idem_key = f"webhook:{github_delivery}"
    if await redis.exists(idem_key):
        return {"status": "duplicate", "delivery_id": github_delivery}

    payload = json.loads(body)

    # 3. Route to handler
    handler = HANDLERS.get(f"{github_event}.{payload.get('action', '')}")
    if not handler:
        logger.info(f"No handler for {github_event}.{payload.get('action')}")
        return {"status": "ignored", "event": github_event}

    # 4. Enqueue async processing
    task_id = await queue.enqueue(handler, payload, idempotency_key=idem_key)
    await redis.setex(idem_key, 86400, "processing")

    return {"status": "accepted", "task_id": task_id, "delivery_id": github_delivery}


# Handler routing
def handle_pr_opened(payload: dict): ...
def handle_pr_synchronized(payload: dict): ...
def handle_pr_merged(payload: dict): ...
def handle_pr_closed(payload: dict): ...
def handle_issue_opened(payload: dict): ...
def handle_issue_labeled(payload: dict): ...
def handle_pr_review_submitted(payload: dict): ...

HANDLERS = {
    "pull_request.opened": handle_pr_opened,
    "pull_request.synchronize": handle_pr_synchronized,
    "pull_request.merged": handle_pr_merged,
    "pull_request.closed": handle_pr_closed,
    "issues.opened": handle_issue_opened,
    "issues.labeled": handle_issue_labeled,
    "pull_request_review.submitted": handle_pr_review_submitted,
}
```

## Appendix C: Required GitHub App Permissions

| Permission | Resource | Required For |
|-----------|----------|-------------|
| `contents: read` | Repository contents | Reading issue/PR body text |
| `issues: write` | Issues | Posting comments, adding labels |
| `pull_requests: write` | Pull Requests | Adding labels, posting comments |
| `statuses: write` | Commit statuses | Setting Algobounty status checks |
| `checks: write` | Check runs | Bounty progress check runs |

## Appendix D: Glossary

| Term | Definition |
|------|-----------|
| **AlgoBounty Gateway** | FastAPI service that receives webhooks, manages bounties, coordinates escrow |
| **Trustless Mode** | Auto-release escrow on PR merge (no creator approval needed) |
| **HITM Mode** | "Humans-in-the-Middle" — creator must manually approve payout |
| **Escrow App** | Algorand smart contract holding bounty funds |
| **Idempotency Key** | Unique key per webhook delivery to prevent double-processing |
| **Karma** | Reputation system; high-karma agents get trustless mode |
| **Review Period** | 7-day window in HITM mode for creator to approve/reject |
| **Reconciliation** | Periodic scan to sync GitHub state with AlgoBounty state |
| **Webhook Delivery** | GitHub's HTTP POST to AlgoBounty Gateway with event data |

---

**Document End**  
*Last updated: 2026-06-30*
